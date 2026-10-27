package com.example.LMS.service;

import com.example.LMS.DTO.LessonProgressResponse;
import com.example.LMS.DTO.StudentSummary;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.*;
import com.example.LMS.report.ExcelWriter;
import com.example.LMS.report.PdfWriter;
import com.example.LMS.report.ReportFile;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.QuizAnswerRepository;
import com.example.LMS.repository.QuizAttemptRepositry;
import com.example.LMS.repository.QuizRepositry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

// Downloadable reports: quiz results (Excel/PDF), one attempt (PDF), assignment grades (Excel), users (Excel).
@Service
@Transactional(readOnly = true)
public class ReportService {

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    @Autowired
    private QuizRepositry quizRepositry;

    @Autowired
    private QuizAttemptRepositry quizAttemptRepositry;

    @Autowired
    private QuizAnswerRepository quizAnswerRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AssignmentSubmissionService assignmentSubmissionService;

    @Autowired
    private AccessService accessService;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private LessonProgressService lessonProgressService;

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private CurrentUserService currentUserService;

    // ---------- Quiz results: every submitted attempt of one quiz ----------

    public ReportFile quizResults(Integer quizId, String format) {
        Quiz quiz = quizRepositry.findById(quizId)
                .orElseThrow(() -> new ResourseNotFoundException("quiz not found with id " + quizId));
        if (!currentUserService.isAdminOrOwner(currentUserService.getCurrentUser(), quiz.getTeacher())) {
            throw new UnauthorizedAccessException("Only the quiz teacher can download its results");
        }

        // Oldest first, so "attempt 1, 2, ..." counts up for each student.
        List<QuizAttempt> attempts = new ArrayList<>(quizAttemptRepositry.findSubmittedByQuiz(quiz));
        attempts.sort(Comparator.comparing(QuizAttempt::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        Map<Integer, Integer> attemptNo = new HashMap<>();
        List<List<Object>> rows = new ArrayList<>();
        int i = 0;
        for (QuizAttempt a : attempts) {
            int n = attemptNo.merge(a.getStudent().getId(), 1, Integer::sum);
            rows.add(List.of(++i, a.getStudent().getName(), a.getStudent().getEmail(), n,
                    nz(a.getScore()), nz(quiz.getTotalMarks()), round(a.getPercentage()),
                    Boolean.TRUE.equals(a.getPassed()) ? "Passed" : "Failed",
                    minutes(a.getStartedAt(), a.getSubmittedAt()), when(a.getSubmittedAt())));
        }

        long students = attempts.stream().map(a -> a.getStudent().getId()).distinct().count();
        long passed = attempts.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();
        double avg = attempts.stream().mapToDouble(a -> a.getPercentage() == null ? 0 : a.getPercentage()).average().orElse(0);
        String course = quiz.getCourse() != null ? quiz.getCourse().getTitle() : "-";
        List<String> headers = List.of("#", "Student", "Email", "Attempt", "Score", "Out of", "Percent", "Result", "Time (min)", "Submitted");
        String name = ReportFile.slug(quiz.getTitle()) + "-results-" + LocalDate.now();

        if (isPdf(format)) {
            byte[] pdf = new PdfWriter(true)
                    .title(quiz.getTitle() + ": results")
                    .info("Course", course)
                    .info("Attempts", attempts.size() + " by " + students + " students")
                    .info("Average score", round(avg) + "%")
                    .info("Passed", passed + " of " + attempts.size() + " (pass mark " + nz(quiz.getPassingMarks()) + " of " + nz(quiz.getTotalMarks()) + ")")
                    .table(headers, new float[]{3, 14, 18, 6, 6, 6, 7, 7, 7, 14}, rows)
                    .note("Downloaded on " + when(LocalDateTime.now()))
                    .toBytes();
            return new ReportFile(pdf, name + ".pdf", MediaType.APPLICATION_PDF);
        }
        byte[] xlsx = new ExcelWriter("Results")
                .title(quiz.getTitle() + ": results")
                .info("Course", course)
                .info("Attempts", attempts.size())
                .info("Students", students)
                .info("Average score (%)", round(avg))
                .info("Passed", passed)
                .info("Pass mark", nz(quiz.getPassingMarks()) + " of " + nz(quiz.getTotalMarks()))
                .info("Downloaded", when(LocalDateTime.now()))
                .blank()
                .table(headers, rows)
                .toBytes();
        return new ReportFile(xlsx, name + ".xlsx", ReportFile.XLSX);
    }

    // ---------- One attempt: the student's own result sheet (PDF) ----------

    public ReportFile attemptResult(Integer attemptId) {
        QuizAttempt attempt = quizAttemptRepositry.findById(attemptId)
                .orElseThrow(() -> new ResourseNotFoundException("attempt not found with id " + attemptId));
        User user = currentUserService.getCurrentUser();
        boolean own = attempt.getStudent().getId().equals(user.getId());
        if (!own && !currentUserService.isAdminOrOwner(user, attempt.getQuiz().getTeacher())) {
            throw new UnauthorizedAccessException("You are not allowed to download this result");
        }
        if (attempt.getStatus() != null && attempt.getStatus() != AttemptStatus.SUBMITTED) {
            throw new BadRequestException("This attempt is not submitted yet");
        }
        Quiz quiz = attempt.getQuiz();

        List<List<Object>> rows = new ArrayList<>();
        int i = 0;
        for (QuizAnswer ans : quizAnswerRepository.findByAttempt(attempt)) {
            Question q = ans.getQuestion();
            String correct = q.getOptions() == null ? "-" : q.getOptions().stream()
                    .filter(o -> Boolean.TRUE.equals(o.getCorrect())).map(Option::getOptionText).findFirst().orElse("-");
            String chosen = ans.getSelectedOption() != null ? ans.getSelectedOption().getOptionText() : "Not answered";
            boolean right = Boolean.TRUE.equals(ans.getCorrect());
            rows.add(List.of(++i, q.getQuestionText(), chosen, correct, right ? "Correct" : "Wrong",
                    (right ? nz(q.getMarks()) : 0) + " / " + nz(q.getMarks())));
        }

        byte[] pdf = new PdfWriter(false)
                .title(quiz.getTitle() + ": my result")
                .info("Student", attempt.getStudent().getName() + " (" + attempt.getStudent().getEmail() + ")")
                .info("Course", quiz.getCourse() != null ? quiz.getCourse().getTitle() : "-")
                .info("Score", nz(attempt.getScore()) + " of " + nz(quiz.getTotalMarks()) + " (" + round(attempt.getPercentage()) + "%)")
                .info("Result", Boolean.TRUE.equals(attempt.getPassed()) ? "Passed" : "Failed")
                .info("Time taken", minutes(attempt.getStartedAt(), attempt.getSubmittedAt()) + " min")
                .info("Submitted", when(attempt.getSubmittedAt()))
                .table(List.of("#", "Question", "Your answer", "Correct answer", "Result", "Marks"),
                        new float[]{3, 26, 20, 20, 8, 6}, rows)
                .note("Downloaded on " + when(LocalDateTime.now()))
                .toBytes();
        return new ReportFile(pdf, ReportFile.slug(quiz.getTitle()) + "-my-result.pdf", MediaType.APPLICATION_PDF);
    }

    // ---------- Assignment grades (Excel) ----------

    public ReportFile assignmentGrades(Integer assignmentId) {
        Assignment assignment = assignmentService.findAssignment(assignmentId);
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), assignment.getCourse());

        List<List<Object>> rows = new ArrayList<>();
        int i = 0;
        for (AssignmentSubmission s : assignmentSubmissionRepository.findByAssignment(assignment)) {
            rows.add(Arrays.asList(++i, s.getStudent().getName(), s.getStudent().getEmail(), when(s.getSubmittedAt()),
                    Boolean.TRUE.equals(s.getLate()) ? "Late" : "On time",
                    s.getStatus() == SubmissionStatus.GRADED ? "Graded" : "Waiting",
                    s.getMarks(), assignment.getTotalMarks(), s.getFeedback()));
        }
        int submittedCount = rows.size();
        for (StudentSummary m : assignmentSubmissionService.getMissingStudents(assignmentId)) {
            rows.add(Arrays.asList(++i, m.name(), m.email(), "-", "-", "Not submitted", null, assignment.getTotalMarks(), null));
        }
        byte[] xlsx = new ExcelWriter("Grades")
                .title(assignment.getTitle() + ": grades")
                .info("Course", assignment.getCourse() != null ? assignment.getCourse().getTitle() : "-")
                .info("Due", when(assignment.getDueDate()))
                .info("Submitted", submittedCount)
                .info("Not submitted", rows.size() - submittedCount)
                .info("Downloaded", when(LocalDateTime.now()))
                .blank()
                .table(List.of("#", "Student", "Email", "Submitted", "On time", "Status", "Marks", "Out of", "Feedback"), rows)
                .toBytes();
        return new ReportFile(xlsx, ReportFile.slug(assignment.getTitle()) + "-grades-" + LocalDate.now() + ".xlsx", ReportFile.XLSX);
    }

    // ---------- Course students and their progress (Excel) ----------

    public ReportFile courseStudents(Integer courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course Not Found with Id: " + courseId));
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), course);

        List<List<Object>> rows = new ArrayList<>();
        int i = 0;
        for (Enrollment e : enrollmentRepository.findByCourse(course)) {
            User s = e.getStudent();
            LessonProgressResponse p = lessonProgressService.progressOf(s, course);
            double pct = p.completionPercentage() == null ? 0 : Math.round(p.completionPercentage() * 1000) / 10.0;
            rows.add(Arrays.asList(++i, s.getName(), s.getEmail(), e.getEnrolledDate() != null ? e.getEnrolledDate().toString() : "-",
                    p.completedLessons() + " / " + p.totalLessons(), pct,
                    e.getCompletedAt() != null ? when(e.getCompletedAt()) : "Not yet", when(s.getLastActiveAt())));
        }
        byte[] xlsx = new ExcelWriter("Students")
                .title(course.getTitle() + ": students")
                .info("Students", rows.size())
                .info("Downloaded", when(LocalDateTime.now()))
                .blank()
                .table(List.of("#", "Student", "Email", "Enrolled", "Lessons done", "Progress (%)", "Completed", "Last active"), rows)
                .toBytes();
        return new ReportFile(xlsx, ReportFile.slug(course.getTitle()) + "-students-" + LocalDate.now() + ".xlsx", ReportFile.XLSX);
    }

    // ---------- Users (Excel, admin) ----------

    public ReportFile users(String role, UserStatus status, String search) {
        List<List<Object>> rows = new ArrayList<>();
        int i = 0;
        for (User u : adminUserService.allUsers(role, status, search)) {
            rows.add(Arrays.asList(++i, u.getName(), u.getEmail(),
                    u.getRole() != null ? CurrentUserService.normalize(u.getRole().getName()) : "-",
                    u.getStatus() != null ? u.getStatus().name() : "-",
                    when(u.getCreatedAt()), when(u.getLastActiveAt())));
        }
        byte[] xlsx = new ExcelWriter("Users")
                .title("Users")
                .info("Total", rows.size())
                .info("Downloaded", when(LocalDateTime.now()))
                .blank()
                .table(List.of("#", "Name", "Email", "Role", "Status", "Joined", "Last active"), rows)
                .toBytes();
        return new ReportFile(xlsx, "users-" + LocalDate.now() + ".xlsx", ReportFile.XLSX);
    }

    // ---------- helpers ----------

    private boolean isPdf(String format) {
        if (format == null || format.isBlank() || format.equalsIgnoreCase("xlsx") || format.equalsIgnoreCase("excel")) {
            return false;
        }
        if (format.equalsIgnoreCase("pdf")) {
            return true;
        }
        throw new BadRequestException("format must be xlsx or pdf");
    }

    private static int nz(Integer n) {
        return n == null ? 0 : n;
    }

    private static double round(Double d) {
        return d == null ? 0 : Math.round(d * 10) / 10.0;
    }

    private static String when(LocalDateTime t) {
        return t == null ? "-" : t.format(WHEN);
    }

    private static long minutes(LocalDateTime start, LocalDateTime end) {
        return start == null || end == null ? 0 : Math.max(0, Duration.between(start, end).toMinutes());
    }
}
