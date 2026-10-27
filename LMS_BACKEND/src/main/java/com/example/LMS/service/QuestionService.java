package com.example.LMS.service;

import com.example.LMS.DTO.OptionRequest;
import com.example.LMS.DTO.OptionResponse;
import com.example.LMS.DTO.QuestionRequest;
import com.example.LMS.DTO.QuestionResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Option;
import com.example.LMS.model.Question;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.User;
import com.example.LMS.repository.OptionRepositry;
import com.example.LMS.repository.QuestionRepositry;
import com.example.LMS.repository.QuizAnswerRepository;
import com.example.LMS.repository.QuizRepositry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class QuestionService {

    @Autowired
    QuestionRepositry questionRepositry;

    @Autowired
    QuizRepositry quizRepositry;

    @Autowired
    OptionRepositry optionRepositry;

    @Autowired
    QuizAnswerRepository quizAnswerRepository;

    @Autowired
    OptionService optionService;

    @Autowired
    AccessService accessService;

    @Autowired
    CurrentUserService currentUserService;

    // showCorrect = false is used for students, so the answer is not sent to the browser before they submit.
    public QuestionResponse makeResponse(Question question, boolean showCorrect) {
        List<OptionResponse> options = optionService.optionsOf(question).stream()
                .map(o -> optionService.makeResponse(o, showCorrect))
                .toList();
        return new QuestionResponse(question.getId(), question.getQuestionText(), question.getMarks(),
                question.getPublished(), question.getTopic(), options);
    }

    @Transactional // question and its 4 options are saved together, or not at all
    public QuestionResponse addQuestion(QuestionRequest questionRequest) {
        List<OptionRequest> options = optionsOf(questionRequest);
        checkOptions(options);

        Question question = new Question();
        applyRequest(question, questionRequest);
        question.setTeacher(currentUserService.getCurrentUser());
        Question savedQuestion = questionRepositry.save(question);

        for (OptionRequest option : options) {
            optionService.createOption(option, savedQuestion);
        }
        return makeResponse(savedQuestion, true);
    }

    // Teacher: own questions. Admin: every question.
    public List<QuestionResponse> getAllQuestions() {
        User user = currentUserService.getCurrentUser();
        List<Question> questionList = currentUserService.isAdmin(user)
                ? questionRepositry.findAll()
                : questionRepositry.findByTeacher(user);
        return questionList.stream().map(q -> makeResponse(q, true)).toList();
    }

    public QuestionResponse getQuestionById(Integer id) {
        return makeResponse(findOwnedQuestion(id), true);
    }

    @Transactional
    public QuestionResponse updateQuestion(Integer id, QuestionRequest questionRequest) {
        Question question = findOwnedQuestion(id);
        List<OptionRequest> newOptions = optionsOf(questionRequest);
        checkOptions(newOptions);

        applyRequest(question, questionRequest);
        Question savedQuestion = questionRepositry.save(question);

        // Before, each option was updated by the id inside the body, which is null for new forms
        // and could point to an option of a different question. Now option 1..4 are matched by position.
        List<Option> existing = optionService.optionsOf(savedQuestion);
        for (int i = 0; i < newOptions.size(); i++) {
            OptionRequest request = newOptions.get(i);
            if (i < existing.size()) {
                Option option = existing.get(i);
                option.setOptionText(request.optionText().trim());
                option.setCorrect(Boolean.TRUE.equals(request.correct()));
                optionRepositry.save(option);
            } else {
                optionService.createOption(request, savedQuestion);
            }
        }
        return makeResponse(savedQuestion, true);
    }

    @Transactional
    public Boolean deleteQuestion(Integer id) {
        Question question = findOwnedQuestion(id);
        if (quizAnswerRepository.existsByQuestion(question)) {
            throw new ResourceAlreadyExistException("Students already answered this question, so it cannot be deleted");
        }
        // The quiz table holds the link, so remove the question from every quiz first.
        for (Quiz quiz : quizRepositry.findByQuestionsContaining(question)) {
            quiz.getQuestions().remove(question);
            quiz.setTotalMarks(quiz.getQuestions().stream().mapToInt(q -> q.getMarks() == null ? 0 : q.getMarks()).sum());
            quizRepositry.save(quiz);
        }
        questionRepositry.delete(question); // options are removed too (cascade on Question.options)
        return true;
    }

    // Teacher/admin get the answers. A student gets the questions only if the quiz is published
    // and they joined its course, and never sees which option is correct.
    public List<QuestionResponse> getAllQuestionsByQuiz(Integer quizId) {
        Quiz quiz = quizRepositry.findById(quizId)
                .orElseThrow(() -> new ResourseNotFoundException("Quiz Not Found with id: " + quizId));
        User user = currentUserService.getCurrentUser();

        boolean owner = currentUserService.isAdminOrOwner(user, quiz.getTeacher());
        if (!owner) {
            checkStudentCanTakeQuiz(user, quiz);
        }
        return quiz.getQuestions().stream().map(q -> makeResponse(q, owner)).toList();
    }

    public void checkStudentCanTakeQuiz(User user, Quiz quiz) {
        if (!Boolean.TRUE.equals(quiz.getPublished())) {
            throw new ResourseNotFoundException("Quiz Not Found with id: " + quiz.getId());
        }
        if (!accessService.canTakeQuiz(user, quiz)) {
            throw new UnauthorizedAccessException(accessService.whyCannotTakeQuiz(quiz));
        }
    }

    private Question findOwnedQuestion(Integer id) {
        Question question = questionRepositry.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Question Not Found with id: " + id));
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, question.getTeacher())) {
            throw new UnauthorizedAccessException("You are not authorized to perform this operation");
        }
        return question;
    }

    private void applyRequest(Question question, QuestionRequest request) {
        question.setQuestionText(request.questionText().trim());
        question.setTopic(request.topic());
        question.setMarks(request.marks());
        question.setPublished(request.published());
    }

    private List<OptionRequest> optionsOf(QuestionRequest request) {
        return List.of(request.option1(), request.option2(), request.option3(), request.option4());
    }

    // Exactly one correct option and no two options with the same text.
    private void checkOptions(List<OptionRequest> options) {
        long correctCount = options.stream().filter(o -> Boolean.TRUE.equals(o.correct())).count();
        if (correctCount != 1) {
            throw new BadRequestException("Mark exactly one option as correct");
        }
        Set<String> texts = new HashSet<>();
        for (OptionRequest option : options) {
            if (!texts.add(option.optionText().trim().toLowerCase())) {
                throw new BadRequestException("Two options have the same text: " + option.optionText());
            }
        }
    }
}
