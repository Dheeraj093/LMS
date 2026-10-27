package com.example.LMS.service;

import com.example.LMS.DTO.CalendarEventResponse;
import com.example.LMS.DTO.MyAssignmentResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.Audience;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.QuizAttempt;
import com.example.LMS.model.QuizJoin;
import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import com.example.LMS.repository.AssignmentRepositry;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.QuizAttemptRepositry;
import com.example.LMS.repository.QuizJoinRepository;
import com.example.LMS.repository.QuizRepositry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Deadlines (assignment due dates and quiz closing times) for the calendar page.
// Student: what they can see, with their own status. Teacher: their own items with submission counts. Admin: everything.
@Service
public class CalendarService {

    // Keeps one request small; the page asks for one month (plus a few days around it) at a time.
    private static final long MAX_DAYS = 100;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private AccessService accessService;

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AssignmentRepositry assignmentRepositry;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private QuizRepositry quizRepositry;

    @Autowired
    private QuizAttemptRepositry quizAttemptRepositry;

    @Autowired
    private QuizJoinRepository quizJoinRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    public List<CalendarEventResponse> getEvents(LocalDate from, LocalDate to) {
        // Default: this month with a week before and after, so the first and last grid rows are filled.
        LocalDate today = LocalDate.now();
        if (from == null) {
            from = today.withDayOfMonth(1).minusDays(7);
        }
        if (to == null) {
            to = today.withDayOfMonth(today.lengthOfMonth()).plusDays(7);
        }
        if (to.isBefore(from)) {
            throw new BadRequestException("'to' must be on or after 'from'");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_DAYS) {
            throw new BadRequestException("Pick a range of at most " + MAX_DAYS + " days");
        }
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay(); // the whole 'to' day is included

        User user = currentUserService.getCurrentUser();
        List<CalendarEventResponse> events = currentUserService.isStudent(user)
                ? studentEvents(user, start, end)
                : teacherEvents(user, start, end);
        return events.stream()
                .sorted(Comparator.comparing(CalendarEventResponse::date).thenComparing(CalendarEventResponse::title))
                .toList();
    }

    private static boolean inRange(LocalDateTime date, LocalDateTime start, LocalDateTime end) {
        return date != null && !date.isBefore(start) && date.isBefore(end);
    }

    private List<CalendarEventResponse> studentEvents(User student, LocalDateTime start, LocalDateTime end) {
        List<CalendarEventResponse> events = new ArrayList<>();

        // Same list and status as the "My assignments" page.
        for (MyAssignmentResponse a : assignmentService.getMyAssignments()) {
            if (inRange(a.dueDate(), start, end)) {
                events.add(new CalendarEventResponse("ASSIGNMENT_DUE", a.id(), a.title(), a.courseId(), a.courseTitle(),
                        a.dueDate(), "/student/assignments/" + a.id(), a.status(), null, null, null));
            }
        }

        // Quizzes the student can take: joined courses, own groups and join codes used.
        Map<Integer, Quiz> quizzes = new LinkedHashMap<>();
        List<Course> joined = enrollmentRepository.findByStudent(student).stream().map(Enrollment::getCourse).toList();
        if (!joined.isEmpty()) {
            quizRepositry.findByCourseIn(joined).forEach(q -> quizzes.put(q.getId(), q));
        }
        for (QuizJoin join : quizJoinRepository.findByStudent(student)) {
            quizzes.putIfAbsent(join.getQuiz().getId(), join.getQuiz());
        }
        LocalDateTime now = LocalDateTime.now();
        for (Quiz quiz : quizzes.values()) {
            if (!inRange(quiz.getDueDate(), start, end) || !accessService.canTakeQuiz(student, quiz)) {
                continue;
            }
            String status;
            if (quizAttemptRepositry.countSubmitted(student, quiz) > 0) {
                status = "DONE";
            } else {
                status = now.isAfter(quiz.getDueDate()) ? "CLOSED" : "OPEN";
            }
            events.add(quizEvent(quiz, "/student/quizzes", status, null, null));
        }
        return events;
    }

    private List<CalendarEventResponse> teacherEvents(User user, LocalDateTime start, LocalDateTime end) {
        boolean admin = currentUserService.isAdmin(user);
        List<CalendarEventResponse> events = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        List<Assignment> assignments = admin
                ? assignmentRepositry.findAll()
                : assignmentRepositry.findByCourseIn(courseRepository.findByTeacher(user));
        for (Assignment a : assignments) {
            if (!inRange(a.getDueDate(), start, end)) {
                continue;
            }
            int submitted = assignmentSubmissionRepository.findByAssignment(a).size();
            int students = studentsOf(a).size();
            events.add(new CalendarEventResponse("ASSIGNMENT_DUE", a.getId(), a.getTitle(), a.getCourse().getId(),
                    a.getCourse().getTitle(), a.getDueDate(), "/teacher/assignments/" + a.getId(),
                    now.isAfter(a.getDueDate()) ? "CLOSED" : "OPEN", submitted, students,
                    submitted + " / " + students + " submitted"));
        }

        List<Quiz> quizzes = admin ? quizRepositry.findAll() : quizRepositry.findByTeacher(user);
        for (Quiz quiz : quizzes) {
            if (!inRange(quiz.getDueDate(), start, end)) {
                continue;
            }
            // Count students, not attempts (a quiz may allow several attempts).
            Set<Integer> done = new LinkedHashSet<>();
            for (QuizAttempt attempt : quizAttemptRepositry.findSubmittedByQuiz(quiz)) {
                done.add(attempt.getStudent().getId());
            }
            int students = studentsOf(quiz).size();
            String status = !Boolean.TRUE.equals(quiz.getPublished()) ? "DRAFT"
                    : now.isAfter(quiz.getDueDate()) ? "CLOSED" : "OPEN";
            events.add(quizEvent(quiz, "/teacher/quizzes/" + quiz.getId() + "/results", status, done.size(), students));
        }
        return events;
    }

    private CalendarEventResponse quizEvent(Quiz quiz, String link, String status, Integer submitted, Integer students) {
        Course course = quiz.getCourse();
        return new CalendarEventResponse("QUIZ_DUE", quiz.getId(), quiz.getTitle(),
                course != null ? course.getId() : null, course != null ? course.getTitle() : null,
                quiz.getDueDate(), link, status, submitted, students,
                submitted == null ? null : submitted + " / " + students + " submitted");
    }

    // Students who are meant to do this assignment: enrolled, and in one of its groups when it is for groups only.
    private List<User> studentsOf(Assignment a) {
        return enrollmentRepository.findByCourse(a.getCourse()).stream()
                .map(Enrollment::getStudent)
                .filter(s -> AccessService.audienceOf(a.getAudience()) != Audience.GROUPS || accessService.inAnyGroup(s, a.getGroups()))
                .toList();
    }

    // Students who may take this quiz (the same rules as AccessService.canTakeQuiz, without the "published" check).
    private Set<Integer> studentsOf(Quiz quiz) {
        Set<Integer> ids = new LinkedHashSet<>();
        switch (AccessService.audienceOf(quiz.getAudience())) {
            case ALL -> {
                if (quiz.getCourse() != null) {
                    enrollmentRepository.findByCourse(quiz.getCourse()).forEach(e -> ids.add(e.getStudent().getId()));
                }
            }
            case GROUPS -> {
                Set<Integer> enrolled = new LinkedHashSet<>();
                if (quiz.getCourse() != null) {
                    enrollmentRepository.findByCourse(quiz.getCourse()).forEach(e -> enrolled.add(e.getStudent().getId()));
                }
                for (StudentGroup group : quiz.getGroups()) {
                    for (User member : group.getMembers()) {
                        if (quiz.getCourse() == null || enrolled.contains(member.getId())) {
                            ids.add(member.getId());
                        }
                    }
                }
            }
            case LINK -> quizJoinRepository.findByQuiz(quiz).forEach(j -> ids.add(j.getStudent().getId()));
        }
        return ids;
    }
}
