package com.example.LMS.service;

import com.example.LMS.DTO.QaDtos.AnswerRequest;
import com.example.LMS.DTO.QaDtos.AnswerResponse;
import com.example.LMS.DTO.QaDtos.AskRequest;
import com.example.LMS.DTO.QaDtos.QaCounts;
import com.example.LMS.DTO.QaDtos.QuestionResponse;
import com.example.LMS.DTO.QaDtos.TeacherQuestions;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Course;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.LessonAnswer;
import com.example.LMS.model.LessonQuestion;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.LessonAnswerRepository;
import com.example.LMS.repository.LessonQuestionRepository;
import com.example.LMS.repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

// Lesson Q&A: students ask questions under a lesson, the teacher and classmates answer.
// Who may do what:
// - see / ask / answer: anyone who can see the course content (enrolled student, course teacher, admin)
// - mark resolved: the question author, the course teacher, an admin
// - delete a question or answer: its author, the course teacher, an admin
@Service
@Transactional
public class LessonQaService {

    @Autowired
    private LessonQuestionRepository questionRepository;

    @Autowired
    private LessonAnswerRepository answerRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<QuestionResponse> getCourseQuestions(Integer courseId, Integer lessonId) {
        User user = currentUserService.getCurrentUser();
        Course course = findCourse(courseId);
        checkCanSee(user, course);
        List<LessonQuestion> questions = lessonId == null
                ? questionRepository.findByCourseOrderByCreatedAtDesc(course)
                : questionRepository.findByCourseAndLessonOrderByCreatedAtDesc(course, findLesson(lessonId));
        return toResponses(questions, user);
    }

    public QuestionResponse ask(Integer courseId, AskRequest request) {
        User user = currentUserService.getCurrentUser();
        Course course = findCourse(courseId);
        checkCanSee(user, course);
        Lesson lesson = findLesson(request.lessonId());
        boolean inCourse = accessService.lessonsOfCourse(course, false).stream()
                .anyMatch(l -> l.getId().equals(lesson.getId()));
        if (!inCourse) {
            throw new BadRequestException("This lesson is not part of the course");
        }
        LessonQuestion question = new LessonQuestion();
        question.setCourse(course);
        question.setLesson(lesson);
        question.setAuthor(user);
        question.setBody(cleanBody(request.body()));
        question.setResolved(false);
        LessonQuestion saved = questionRepository.save(question);
        if (!isSameUser(user, course.getTeacher())) {
            notificationService.notify(course.getTeacher(), NotificationType.QUESTION_ASKED,
                    user.getName() + " asked about " + lesson.getTitle() + ": " + preview(saved.getBody()),
                    "/teacher/qa?question=" + saved.getId());
        }
        return toResponses(List.of(saved), user).get(0);
    }

    public QuestionResponse answer(Integer questionId, AnswerRequest request) {
        User user = currentUserService.getCurrentUser();
        LessonQuestion question = findQuestion(questionId);
        checkCanSee(user, question.getCourse());
        LessonAnswer answer = new LessonAnswer();
        answer.setQuestion(question);
        answer.setAuthor(user);
        answer.setBody(cleanBody(request.body()));
        answerRepository.save(answer);
        // Only the person who asked is told; the teacher already sees everything on the Q&A page.
        if (!isSameUser(user, question.getAuthor())) {
            notificationService.notify(question.getAuthor(), NotificationType.QUESTION_ANSWERED,
                    user.getName() + " answered your question on " + question.getLesson().getTitle(),
                    "/learn/" + question.getCourse().getId() + "/" + question.getLesson().getId() + "?tab=qa");
        }
        return toResponses(List.of(question), user).get(0);
    }

    public QuestionResponse setResolved(Integer questionId, boolean resolved) {
        User user = currentUserService.getCurrentUser();
        LessonQuestion question = findQuestion(questionId);
        checkCanSee(user, question.getCourse());
        if (!isSameUser(user, question.getAuthor()) && !isCourseStaff(user, question.getCourse())) {
            throw new UnauthorizedAccessException("Only the person who asked or the course teacher can do this");
        }
        question.setResolved(resolved);
        return toResponses(List.of(questionRepository.save(question)), user).get(0);
    }

    public void deleteQuestion(Integer questionId) {
        User user = currentUserService.getCurrentUser();
        LessonQuestion question = findQuestion(questionId);
        if (!isSameUser(user, question.getAuthor()) && !isCourseStaff(user, question.getCourse())) {
            throw new UnauthorizedAccessException("You can only delete your own questions");
        }
        answerRepository.deleteAll(answerRepository.findByQuestionInOrderByCreatedAtAsc(List.of(question)));
        questionRepository.delete(question);
    }

    public void deleteAnswer(Integer answerId) {
        User user = currentUserService.getCurrentUser();
        LessonAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new ResourseNotFoundException("Answer not found with id " + answerId));
        if (!isSameUser(user, answer.getAuthor()) && !isCourseStaff(user, answer.getQuestion().getCourse())) {
            throw new UnauthorizedAccessException("You can only delete your own answers");
        }
        answerRepository.delete(answer);
    }

    // The teacher's Q&A page: questions in the teacher's courses (admin: every course).
    // status: open | answered | all. Counts are for the chosen course (or all courses) before the status filter.
    @Transactional(readOnly = true)
    public TeacherQuestions getTeacherQuestions(String status, Integer courseId) {
        User user = currentUserService.getCurrentUser();
        String filter = status == null || status.isBlank() ? "open" : status.trim().toLowerCase();
        if (!List.of("open", "answered", "all").contains(filter)) {
            throw new BadRequestException("Status must be open, answered or all");
        }
        List<LessonQuestion> questions;
        if (courseId != null) {
            Course course = findCourse(courseId);
            accessService.checkCourseOwner(user, course);
            questions = questionRepository.findByCourseOrderByCreatedAtDesc(course);
        } else if (currentUserService.isAdmin(user)) {
            questions = questionRepository.findAllByOrderByCreatedAtDesc();
        } else {
            questions = questionRepository.findByCourseTeacherOrderByCreatedAtDesc(user);
        }
        List<QuestionResponse> all = toResponses(questions, user);
        Predicate<QuestionResponse> isOpen = q -> !q.resolved() && !q.teacherAnswered();
        long open = all.stream().filter(isOpen).count();
        List<QuestionResponse> shown = switch (filter) {
            case "open" -> all.stream().filter(isOpen).toList();
            case "answered" -> all.stream().filter(isOpen.negate()).toList();
            default -> all;
        };
        return new TeacherQuestions(new QaCounts(open, all.size() - open, all.size()), shown);
    }

    // Builds the responses with every answer loaded in one query.
    private List<QuestionResponse> toResponses(List<LessonQuestion> questions, User viewer) {
        if (questions.isEmpty()) {
            return List.of();
        }
        Map<Integer, List<LessonAnswer>> answersByQuestion = new LinkedHashMap<>();
        for (LessonAnswer a : answerRepository.findByQuestionInOrderByCreatedAtAsc(questions)) {
            answersByQuestion.computeIfAbsent(a.getQuestion().getId(), k -> new ArrayList<>()).add(a);
        }
        List<QuestionResponse> responses = new ArrayList<>();
        for (LessonQuestion q : questions) {
            Course course = q.getCourse();
            boolean staff = isCourseStaff(viewer, course);
            boolean mine = isSameUser(viewer, q.getAuthor());
            List<AnswerResponse> answers = answersByQuestion.getOrDefault(q.getId(), List.of()).stream()
                    .map(a -> new AnswerResponse(a.getId(), q.getId(), a.getAuthor().getId(), a.getAuthor().getName(),
                            a.getAuthor().getAvatarUrl(), currentUserService.getRoleName(a.getAuthor()),
                            isCourseStaff(a.getAuthor(), course), a.getBody(), a.getCreatedAt(),
                            staff || isSameUser(viewer, a.getAuthor())))
                    .toList();
            boolean teacherAnswered = answers.stream().anyMatch(AnswerResponse::fromTeacher);
            responses.add(new QuestionResponse(q.getId(), course.getId(), course.getTitle(),
                    q.getLesson().getId(), q.getLesson().getTitle(),
                    q.getAuthor().getId(), q.getAuthor().getName(), q.getAuthor().getAvatarUrl(),
                    currentUserService.getRoleName(q.getAuthor()),
                    q.getBody(), q.getCreatedAt(), Boolean.TRUE.equals(q.getResolved()),
                    answers.size(), teacherAnswered, staff || mine, staff || mine, answers));
        }
        return responses;
    }

    private void checkCanSee(User user, Course course) {
        if (!accessService.canViewCourseContent(user, course)) {
            throw new UnauthorizedAccessException("Enroll in this course to see its questions");
        }
    }

    // The course teacher or an admin.
    private boolean isCourseStaff(User user, Course course) {
        return currentUserService.isAdminOrOwner(user, course.getTeacher());
    }

    private static boolean isSameUser(User a, User b) {
        return a != null && b != null && a.getId().equals(b.getId());
    }

    private static String cleanBody(String body) {
        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) {
            throw new BadRequestException("Text cannot be empty");
        }
        if (text.length() > LessonQuestion.MAX_BODY) {
            throw new BadRequestException("Text can be at most " + LessonQuestion.MAX_BODY + " characters");
        }
        return text;
    }

    // First line of the question, cut to fit in a notification.
    private static String preview(String body) {
        String line = body.lines().findFirst().orElse("").trim();
        return line.length() > 80 ? line.substring(0, 77) + "..." : line;
    }

    private Course findCourse(Integer courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course not found with id " + courseId));
    }

    private Lesson findLesson(Integer lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourseNotFoundException("Lesson not found with id " + lessonId));
    }

    private LessonQuestion findQuestion(Integer questionId) {
        return questionRepository.findById(questionId)
                .orElseThrow(() -> new ResourseNotFoundException("Question not found with id " + questionId));
    }
}
