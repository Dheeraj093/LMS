package com.example.LMS.service;

import com.example.LMS.DTO.QuizRequest;
import com.example.LMS.DTO.QuizResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Audience;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.Question;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.QuizJoin;
import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.QuestionRepositry;
import com.example.LMS.repository.QuizAttemptRepositry;
import com.example.LMS.repository.QuizJoinRepository;
import com.example.LMS.repository.QuizRepositry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class QuizService {

    @Autowired
    private QuizRepositry quizRepositry;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private QuestionRepositry questionRepositry;

    @Autowired
    private QuizAttemptRepositry quizAttemptRepositry;

    @Autowired
    private QuestionService questionService;

    @Autowired
    private AccessService accessService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private GroupService groupService;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private QuizJoinRepository quizJoinRepository;

    // No 0/O or 1/I, so a code read aloud or from a screen is not mistaken.
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    // Full view for the quiz teacher and admins.
    public QuizResponse makeQuizResponse(Quiz quiz) {
        return makeQuizResponse(quiz, true);
    }

    // showJoinCode = false for students: they do not need the code of a quiz they can already open.
    public QuizResponse makeQuizResponse(Quiz quiz, boolean showJoinCode) {
        List<Integer> questionIds = new ArrayList<>();
        if (quiz.getQuestions() != null) {
            for (Question question : quiz.getQuestions()) {
                questionIds.add(question.getId());
            }
        }
        return new QuizResponse(quiz.getId(), quiz.getTitle(), quiz.getDescription(), questionIds,
                quiz.getTotalMarks(), quiz.getPassingMarks(), quiz.getTimeLimitInMinutes(), quiz.getPublished(),
                quiz.getCourse() != null ? quiz.getCourse().getId() : null,
                quiz.getMaxAttempts() == null ? 1 : quiz.getMaxAttempts(),
                AccessService.audienceOf(quiz.getAudience()),
                quiz.getGroups() == null ? List.of() : quiz.getGroups().stream().map(StudentGroup::getId).toList(),
                showJoinCode ? quiz.getJoinCode() : null, quiz.getDueDate());
    }

    public QuizResponse addQuiz(QuizRequest quizRequest) {
        User teacher = currentUserService.getCurrentUser();

        // Title must be unique for this teacher only (before, two teachers could not both have "Java Basics").
        if (quizRepositry.findByTitleIgnoreCaseAndTeacher(quizRequest.title().trim(), teacher) != null) {
            throw new ResourceAlreadyExistException("You already have a quiz with title: " + quizRequest.title());
        }

        Quiz quiz = new Quiz();
        quiz.setTeacher(teacher);
        applyRequest(quiz, quizRequest, teacher);
        return makeQuizResponse(quizRepositry.save(quiz));
    }

    // Teacher: own quizzes. Admin: every quiz.
    public List<QuizResponse> getAllQuiz() {
        User user = currentUserService.getCurrentUser();
        List<Quiz> quizList = currentUserService.isAdmin(user)
                ? quizRepositry.findAll()
                : quizRepositry.findByTeacher(user);
        return quizList.stream().map(this::makeQuizResponse).toList();
    }

    public QuizResponse getQuizById(Integer id) {
        return makeQuizResponse(findOwnedQuiz(id));
    }

    // Used by the student "take quiz" page. Same data, but only if the student may take the quiz
    // (published, and enrolled / in a chosen group / joined with the code, depending on the audience).
    public QuizResponse getQuizForStudent(Integer id) {
        Quiz quiz = quizRepositry.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Quiz not found with id " + id));
        User user = currentUserService.getCurrentUser();
        boolean owner = currentUserService.isAdminOrOwner(user, quiz.getTeacher());
        if (!owner) {
            questionService.checkStudentCanTakeQuiz(user, quiz);
        }
        return makeQuizResponse(quiz, owner);
    }

    // Student: every quiz I can take right now, from joined courses, my groups and join codes I used.
    public List<QuizResponse> getMyQuizzes() {
        User student = currentUserService.getCurrentUser();
        Map<Integer, Quiz> quizzes = new LinkedHashMap<>();
        List<Course> joined = enrollmentRepository.findByStudent(student).stream().map(Enrollment::getCourse).toList();
        if (!joined.isEmpty()) {
            quizRepositry.findByCourseIn(joined).forEach(q -> quizzes.put(q.getId(), q));
        }
        for (QuizJoin join : quizJoinRepository.findByStudent(student)) {
            quizzes.putIfAbsent(join.getQuiz().getId(), join.getQuiz());
        }
        return quizzes.values().stream()
                .filter(q -> accessService.canTakeQuiz(student, q))
                .map(q -> makeQuizResponse(q, false))
                .toList();
    }

    // The /join page. Finds the quiz by its code and remembers that this student used it.
    // For a LINK quiz that is what gives access. For ALL/GROUPS quizzes the code only finds the quiz;
    // the normal rules (enrolled, in a group) still apply.
    public QuizResponse joinByCode(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
        Quiz quiz = normalized.isEmpty() ? null : quizRepositry.findByJoinCode(normalized);
        if (quiz == null || !Boolean.TRUE.equals(quiz.getPublished())) {
            throw new ResourseNotFoundException("No quiz matches this code");
        }
        User user = currentUserService.getCurrentUser();
        if (currentUserService.isAdminOrOwner(user, quiz.getTeacher())) {
            return makeQuizResponse(quiz, true);
        }
        if (!currentUserService.isStudent(user)) {
            throw new UnauthorizedAccessException("Only students can join a quiz with a code");
        }
        if (!quizJoinRepository.existsByQuizAndStudent(quiz, user)) {
            QuizJoin join = new QuizJoin();
            join.setQuiz(quiz);
            join.setStudent(user);
            quizJoinRepository.save(join);
        }
        if (!accessService.canTakeQuiz(user, quiz)) {
            throw new UnauthorizedAccessException(accessService.whyCannotTakeQuiz(quiz));
        }
        return makeQuizResponse(quiz, false);
    }

    public QuizResponse updateQuiz(Integer id, QuizRequest quizRequest) {
        Quiz quiz = findOwnedQuiz(id);
        User owner = quiz.getTeacher();

        Quiz sameTitle = quizRepositry.findByTitleIgnoreCaseAndTeacher(quizRequest.title().trim(), owner);
        if (sameTitle != null && !sameTitle.getId().equals(id)) {
            throw new ResourceAlreadyExistException("You already have a quiz with title: " + quizRequest.title());
        }
        // Changing questions after students attempted would make old scores wrong.
        if (quizAttemptRepositry.existsByQuiz(quiz) && !sameQuestions(quiz, quizRequest.questionsIdList())) {
            throw new BadRequestException("Students already attempted this quiz, so its questions cannot be changed");
        }
        applyRequest(quiz, quizRequest, owner);
        return makeQuizResponse(quizRepositry.save(quiz));
    }

    public Boolean deleteQuizById(Integer id) {
        Quiz quiz = findOwnedQuiz(id);
        if (quizAttemptRepositry.existsByQuiz(quiz)) {
            throw new ResourceAlreadyExistException("Students already attempted this quiz. Unpublish it instead of deleting");
        }
        quizRepositry.delete(quiz);
        return true;
    }

    // Course teacher/admin: every quiz of the course. Enrolled student: published quizzes meant for them.
    public List<QuizResponse> getAllQuizByCourse(Integer courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("course not found with id " + courseId));
        User user = currentUserService.getCurrentUser();

        boolean owner = currentUserService.isAdminOrOwner(user, course.getTeacher());
        if (!owner) {
            accessService.checkCanViewCourseContent(user, course);
        }
        return quizRepositry.findByCourse(course).stream()
                .filter(q -> owner || accessService.canTakeQuiz(user, q))
                .map(q -> makeQuizResponse(q, owner))
                .toList();
    }

    private Quiz findOwnedQuiz(Integer id) {
        Quiz quiz = quizRepositry.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("quiz not found with id " + id));
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, quiz.getTeacher())) {
            throw new UnauthorizedAccessException("You are not authorized to perform this operation");
        }
        return quiz;
    }

    private void applyRequest(Quiz quiz, QuizRequest request, User owner) {
        // Remove duplicate ids, keep the order the teacher picked.
        List<Integer> ids = new ArrayList<>(new LinkedHashSet<>(request.questionsIdList()));
        List<Question> questions = questionRepositry.findAllByIdInAndTeacher(ids, owner);
        if (questions.size() != ids.size()) {
            throw new BadRequestException("Some selected questions do not exist or are not yours");
        }

        // Total marks are now the sum of question marks, so the score can never be above the total.
        int totalMarks = questions.stream().mapToInt(q -> q.getMarks() == null ? 0 : q.getMarks()).sum();
        if (request.passingMarks() > totalMarks) {
            throw new BadRequestException("Passing marks (" + request.passingMarks() + ") cannot be more than total marks (" + totalMarks + ")");
        }

        Course course = null;
        if (request.courseId() != null) {
            course = courseRepository.findById(request.courseId())
                    .orElseThrow(() -> new ResourseNotFoundException("course not found with id " + request.courseId()));
            accessService.checkCourseOwner(currentUserService.getCurrentUser(), course);
        }

        quiz.setTitle(request.title().trim());
        quiz.setDescription(request.description());
        quiz.setPassingMarks(request.passingMarks());
        quiz.setPublished(request.published());
        quiz.setTimeLimitInMinutes(request.timeLimitInMinutes());
        quiz.setQuestions(new ArrayList<>(questions));
        quiz.setTotalMarks(totalMarks);
        quiz.setCourse(course);
        quiz.setMaxAttempts(request.maxAttempts() == null ? 1 : request.maxAttempts());
        quiz.setDueDate(request.dueDate());
        applyAudience(quiz, request, owner);
    }

    private void applyAudience(Quiz quiz, QuizRequest request, User owner) {
        Audience audience = AccessService.audienceOf(request.audience());
        List<StudentGroup> groups = audience == Audience.GROUPS
                ? groupService.resolveGroups(request.groupIds(), owner)
                : new ArrayList<>();
        if (audience == Audience.GROUPS && groups.isEmpty()) {
            throw new BadRequestException("Pick at least one group, or choose another audience");
        }

        String code = request.joinCode() == null ? "" : request.joinCode().trim().toUpperCase(Locale.ROOT);
        if (code.isEmpty()) {
            // A LINK quiz is useless without a code, so make one.
            code = audience == Audience.LINK ? newJoinCode() : null;
        } else if (!code.matches("[A-Z0-9]{4,12}")) {
            throw new BadRequestException("Join code must be 4 to 12 letters or digits");
        }
        if (code != null) {
            Quiz other = quizRepositry.findByJoinCode(code);
            if (other != null && !other.getId().equals(quiz.getId())) {
                throw new ResourceAlreadyExistException("This join code is already used by another quiz. Generate a new one");
            }
        }

        quiz.setAudience(audience);
        if (quiz.getGroups() == null) {
            quiz.setGroups(new ArrayList<>());
        }
        quiz.getGroups().clear();
        quiz.getGroups().addAll(groups);
        quiz.setJoinCode(code);
    }

    private String newJoinCode() {
        for (int tries = 0; tries < 20; tries++) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            if (quizRepositry.findByJoinCode(sb.toString()) == null) {
                return sb.toString();
            }
        }
        throw new IllegalStateException("Could not make a unique join code");
    }

    private boolean sameQuestions(Quiz quiz, List<Integer> newIds) {
        List<Integer> current = quiz.getQuestions().stream().map(Question::getId).sorted().toList();
        List<Integer> next = new LinkedHashSet<>(newIds).stream().sorted().toList();
        return current.equals(next);
    }
}
