package com.example.LMS.service;

import com.example.LMS.DTO.QuestionResponse;
import com.example.LMS.DTO.QuizAnswerResponse;
import com.example.LMS.DTO.QuizAttemptRequest;
import com.example.LMS.DTO.QuizAttemptResponse;
import com.example.LMS.DTO.QuizStartResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.AttemptStatus;
import com.example.LMS.model.Option;
import com.example.LMS.model.Question;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.QuizAnswer;
import com.example.LMS.model.QuizAttempt;
import com.example.LMS.model.User;
import com.example.LMS.repository.OptionRepositry;
import com.example.LMS.repository.QuizAnswerRepository;
import com.example.LMS.repository.QuizAttemptRepositry;
import com.example.LMS.repository.QuizRepositry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class QuizAttemptService {

    @Autowired
    private QuizAttemptRepositry quizAttemptRepositry;

    @Autowired
    private QuizRepositry quizRepositry;

    @Autowired
    private QuizAnswerRepository quizAnswerRepository;

    @Autowired
    private OptionRepositry optionRepositry;

    @Autowired
    private QuestionService questionService;

    @Autowired
    private CurrentUserService currentUserService;

    // Extra seconds after the deadline, for slow networks and the auto-submit request.
    // For the "quiz closed" message, e.g. "12 Oct 2026, 05:00 PM".
    private static final DateTimeFormatter CLOSED_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy, hh:mm a", Locale.ENGLISH);

    @Value("${app.quiz.grace-seconds:60}")
    private long graceSeconds;

    // Step 1: the student presses "Start". The server writes the start time and the deadline,
    // so the timer cannot be cheated by changing the computer's clock.
    @Transactional
    public QuizStartResponse startQuiz(Integer quizId) {
        User student = currentUserService.getCurrentUser();
        Quiz quiz = findQuiz(quizId);
        questionService.checkStudentCanTakeQuiz(student, quiz);
        QuizAttempt attempt = openAttempt(student, quiz);

        List<QuestionResponse> questions = quiz.getQuestions().stream()
                .map(q -> questionService.makeResponse(q, false)) // no correct answers
                .toList();
        long attemptNumber = quizAttemptRepositry.countSubmitted(student, quiz) + 1;
        return new QuizStartResponse(attempt.getId(), quiz.getId(), quiz.getTitle(), quiz.getTimeLimitInMinutes(),
                quiz.getTotalMarks(), attempt.getStartedAt(), attempt.getDeadline(), LocalDateTime.now(),
                (int) attemptNumber, maxAttempts(quiz), questions);
    }

    // Step 2: the student submits. The server checks the time limit and scores the answers.
    @Transactional
    public QuizAttemptResponse submitAttempt(Integer attemptId, Map<Integer, Integer> answers) {
        User student = currentUserService.getCurrentUser();
        QuizAttempt attempt = quizAttemptRepositry.findById(attemptId)
                .orElseThrow(() -> new ResourseNotFoundException("attempt not found with id " + attemptId));
        if (!attempt.getStudent().getId().equals(student.getId())) {
            throw new UnauthorizedAccessException("This is not your attempt");
        }
        if (attempt.getStatus() == AttemptStatus.SUBMITTED) {
            throw new ResourceAlreadyExistException("This attempt was already submitted");
        }
        boolean expired = isExpired(attempt, LocalDateTime.now());
        // Answers sent after the deadline (plus grace time) are not counted.
        return score(attempt, expired ? Map.of() : answers, expired);
    }

    // Old one-step endpoint (POST /quiz-attempt) still used by the current frontend:
    // starts (or resumes) an attempt and submits it at once.
    @Transactional
    public QuizAttemptResponse createQuizAttempt(QuizAttemptRequest request) {
        User student = currentUserService.getCurrentUser();
        Quiz quiz = findQuiz(request.quizId());
        questionService.checkStudentCanTakeQuiz(student, quiz);
        QuizAttempt attempt = openAttempt(student, quiz);
        // The browser's own start time is kept only if it is earlier than now and inside the time limit.
        LocalDateTime now = LocalDateTime.now();
        if (request.startDateTime() != null && request.startDateTime().isBefore(attempt.getStartedAt())
                && (quiz.getTimeLimitInMinutes() == null
                || request.startDateTime().isAfter(now.minusMinutes(quiz.getTimeLimitInMinutes()).minusSeconds(graceSeconds)))) {
            attempt.setStartedAt(request.startDateTime());
        }
        return score(attempt, request.answers(), false);
    }

    // A student can read their own attempt; the quiz teacher and admins can read any attempt of their quiz.
    public QuizAttemptResponse getAttemptById(Integer id) {
        QuizAttempt attempt = quizAttemptRepositry.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("attempt not found with id " + id));
        User user = currentUserService.getCurrentUser();
        boolean own = attempt.getStudent().getId().equals(user.getId());
        if (!own && !currentUserService.isAdminOrOwner(user, attempt.getQuiz().getTeacher())) {
            throw new UnauthorizedAccessException("You are not authorized to see this attempt");
        }
        // Answers (with the correct option) only after submit.
        List<QuizAnswer> answers = attempt.getStatus() == AttemptStatus.SUBMITTED ? quizAnswerRepository.findByAttempt(attempt) : List.of();
        return toResponse(attempt, answers, false);
    }

    public List<QuizAttemptResponse> getMyAttempts() {
        User student = currentUserService.getCurrentUser();
        return quizAttemptRepositry.findSubmittedByStudent(student).stream()
                .map(a -> toResponse(a, List.of(), false))
                .toList();
    }

    // Used by the teacher "quiz monitor" page.
    public List<QuizAttemptResponse> getAttemptsByQuiz(Integer quizId) {
        Quiz quiz = findQuiz(quizId);
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, quiz.getTeacher())) {
            throw new UnauthorizedAccessException("Only the quiz teacher can see its attempts");
        }
        return quizAttemptRepositry.findSubmittedByQuiz(quiz).stream()
                .map(a -> toResponse(a, List.of(), false))
                .toList();
    }

    // Returns the running attempt, or creates a new one if the student still has attempts left.
    private QuizAttempt openAttempt(User student, Quiz quiz) {
        LocalDateTime now = LocalDateTime.now();
        QuizAttempt running = quizAttemptRepositry.findFirstByStudentAndQuizAndStatus(student, quiz, AttemptStatus.IN_PROGRESS);
        if (running != null) {
            if (!isExpired(running, now)) {
                return running; // page refresh: continue the same attempt and the same timer
            }
            score(running, Map.of(), true); // time ran out while the student was away
        }
        // A running attempt (above) may still be finished, but no new attempt after the due date.
        if (quiz.getDueDate() != null && now.isAfter(quiz.getDueDate())) {
            throw new ResourceAlreadyExistException("This quiz closed on " + CLOSED_FORMAT.format(quiz.getDueDate()));
        }
        if (quizAttemptRepositry.countSubmitted(student, quiz) >= maxAttempts(quiz)) {
            throw new ResourceAlreadyExistException("You have used all " + maxAttempts(quiz) + " attempt(s) for this quiz");
        }
        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setStudent(student);
        attempt.setStartedAt(now);
        attempt.setDeadline(quiz.getTimeLimitInMinutes() == null ? null : now.plusMinutes(quiz.getTimeLimitInMinutes()));
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt.setScore(0);
        attempt.setPassed(false);
        return quizAttemptRepositry.save(attempt);
    }

    private QuizAttemptResponse score(QuizAttempt attempt, Map<Integer, Integer> answers, boolean timeExpired) {
        Quiz quiz = attempt.getQuiz();
        int score = 0;
        List<QuizAnswer> savedAnswers = new ArrayList<>();

        // Loop over the quiz's own questions, so a student cannot send questions from another quiz.
        for (Question question : quiz.getQuestions()) {
            Integer optionId = answers.get(question.getId());
            if (optionId == null) {
                continue; // not answered = 0 marks
            }
            Option selected = optionRepositry.findById(optionId).orElse(null);
            // The chosen option must belong to this question.
            if (selected == null || !selected.getQuestion().getId().equals(question.getId())) {
                throw new BadRequestException("Option " + optionId + " is not an option of question " + question.getId());
            }
            boolean correct = Boolean.TRUE.equals(selected.getCorrect());
            if (correct) {
                score += question.getMarks() == null ? 0 : question.getMarks();
            }
            QuizAnswer answer = new QuizAnswer();
            answer.setAttempt(attempt);
            answer.setQuestion(question);
            answer.setSelectedOption(selected);
            answer.setCorrect(correct);
            savedAnswers.add(quizAnswerRepository.save(answer));
        }

        int total = quiz.getTotalMarks() == null ? 0 : quiz.getTotalMarks();
        attempt.setScore(score);
        attempt.setPercentage(total == 0 ? 0.0 : Math.round(score * 1000.0 / total) / 10.0);
        attempt.setPassed(quiz.getPassingMarks() != null && score >= quiz.getPassingMarks());
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setStatus(AttemptStatus.SUBMITTED);
        return toResponse(quizAttemptRepositry.save(attempt), savedAnswers, timeExpired);
    }

    private boolean isExpired(QuizAttempt attempt, LocalDateTime now) {
        return attempt.getDeadline() != null && now.isAfter(attempt.getDeadline().plusSeconds(graceSeconds));
    }

    private int maxAttempts(Quiz quiz) {
        return quiz.getMaxAttempts() == null || quiz.getMaxAttempts() < 1 ? 1 : quiz.getMaxAttempts();
    }

    private Quiz findQuiz(Integer quizId) {
        return quizRepositry.findById(quizId)
                .orElseThrow(() -> new ResourseNotFoundException("quiz not found with id " + quizId));
    }

    private QuizAttemptResponse toResponse(QuizAttempt attempt, List<QuizAnswer> answers, boolean timeExpired) {
        List<QuizAnswerResponse> answerResponses = new ArrayList<>();
        for (QuizAnswer answer : answers) {
            Question question = answer.getQuestion();
            Option correctOption = optionRepositry.findByQuestionAndCorrect(question, true);
            boolean correct = Boolean.TRUE.equals(answer.getSelectedOption().getCorrect());
            answerResponses.add(new QuizAnswerResponse(
                    question.getId(),
                    answer.getSelectedOption().getId(),
                    correctOption != null ? correctOption.getId() : null,
                    correct,
                    correct && question.getMarks() != null ? question.getMarks() : 0));
        }
        Quiz quiz = attempt.getQuiz();
        User student = attempt.getStudent();
        return new QuizAttemptResponse(attempt.getId(), quiz.getId(), quiz.getTitle(),
                student.getId(), student.getName(), attempt.getScore(), quiz.getTotalMarks(),
                attempt.getStartedAt(), attempt.getSubmittedAt(), attempt.getPassed(), answerResponses,
                attempt.getPercentage(), attempt.getStatus(), timeExpired);
    }
}
