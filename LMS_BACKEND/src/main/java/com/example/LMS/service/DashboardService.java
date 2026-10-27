package com.example.LMS.service;

import com.example.LMS.DTO.DashboardDtos.*;
import com.example.LMS.DTO.LessonProgressResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.AssignmentSubmission;
import com.example.LMS.model.Audience;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.QuizAttempt;
import com.example.LMS.model.User;
import com.example.LMS.model.UserActivity;
import com.example.LMS.model.UserStatus;
import com.example.LMS.repository.AssignmentRepositry;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.CertificateRepository;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.LessonProgressRepository;
import com.example.LMS.repository.QuizAnswerRepository;
import com.example.LMS.repository.QuizAttemptRepositry;
import com.example.LMS.repository.ReviewRepository;
import com.example.LMS.repository.UserActivityRepository;
import com.example.LMS.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Builds the numbers and chart data for the three dashboards, one call per role.
// Counting by date is done in the database (GROUP BY); per-course progress is computed in Java,
// which is fine for a college-size LMS. Move it to SQL views if courses grow to thousands of students.
@Service
@Transactional(readOnly = true)
public class DashboardService {

    @Autowired private CurrentUserService currentUserService;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private LessonProgressRepository lessonProgressRepository;
    @Autowired private LessonProgressService lessonProgressService;
    @Autowired private QuizAttemptRepositry quizAttemptRepositry;
    @Autowired private AccessService accessService;
    @Autowired private QuizAnswerRepository quizAnswerRepository;
    @Autowired private AssignmentRepositry assignmentRepositry;
    @Autowired private AssignmentSubmissionRepository assignmentSubmissionRepository;
    @Autowired private UserActivityRepository userActivityRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private CertificateRepository certificateRepository;

    // ---------- Student ----------

    public StudentDashboard student(String range) {
        User student = currentUserService.getCurrentUser();
        LocalDate from = startOf(range, "30d");
        List<Enrollment> enrollments = enrollmentRepository.findByStudent(student);

        long totalLessons = 0;
        long completedInCourses = 0;
        List<CourseProgress> courseProgress = new ArrayList<>();
        for (Enrollment e : enrollments) {
            LessonProgressResponse p = lessonProgressService.progressOf(student, e.getCourse());
            totalLessons += p.totalLessons();
            completedInCourses += p.completedLessons();
            courseProgress.add(new CourseProgress(e.getCourse().getId(), e.getCourse().getTitle(),
                    (int) Math.round(p.completionPercentage() * 100)));
        }
        long coursesCompleted = enrollments.stream().filter(e -> e.getCompletedAt() != null).count();

        List<QuizAttempt> attempts = quizAttemptRepositry.findSubmittedByStudent(student);
        double avgQuiz = round1(attempts.stream().filter(a -> a.getPercentage() != null)
                .mapToDouble(QuizAttempt::getPercentage).average().orElse(0));
        List<QuizScore> quizScores = attempts.stream()
                .filter(a -> a.getSubmittedAt() != null && !a.getSubmittedAt().toLocalDate().isBefore(from))
                .sorted(Comparator.comparing(QuizAttempt::getSubmittedAt))
                .map(a -> new QuizScore(a.getQuiz().getId(), a.getQuiz().getTitle(), a.getSubmittedAt().toLocalDate(),
                        a.getPercentage() == null ? 0 : a.getPercentage()))
                .toList();

        Map<LocalDate, Long> minutes = new HashMap<>();
        for (UserActivity a : userActivityRepository.findByUserAndActivityDateGreaterThanEqual(student, from)) {
            minutes.put(a.getActivityDate(), (long) (a.getSecondsSpent() == null ? 0 : a.getSecondsSpent()) / 60);
        }
        List<DateMinutes> minutesPerDay = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(LocalDate.now()); d = d.plusDays(1)) {
            minutesPerDay.add(new DateMinutes(d, minutes.getOrDefault(d, 0L)));
        }

        // Assignments of joined courses: on time, late, or not submitted yet.
        long onTime = 0, late = 0, pending = 0;
        List<Course> courses = enrollments.stream().map(Enrollment::getCourse).toList();
        for (Assignment a : assignmentRepositry.findByCourseIn(courses)) {
            if (!accessService.canSeeAssignment(student, a)) {
                continue; // limited to groups this student is not in
            }
            AssignmentSubmission s = assignmentSubmissionRepository.findByAssignmentAndStudent(a, student);
            if (s == null) pending++;
            else if (Boolean.TRUE.equals(s.getLate())) late++;
            else onTime++;
        }

        return new StudentDashboard(enrollments.size(), coursesCompleted, completedInCourses, totalLessons, avgQuiz,
                userActivityRepository.totalSeconds(student) / 60, certificateRepository.findByStudentOrderByIssuedAtDesc(student).size(),
                quizScores, courseProgress, minutesPerDay, new AssignmentCounts(onTime, late, pending));
    }

    // ---------- Teacher ----------

    public TeacherDashboard teacher(String range) {
        User teacher = currentUserService.getCurrentUser();
        LocalDate from = startOf(range, "12w");
        List<Course> courses = courseRepository.findByTeacher(teacher);
        List<Enrollment> enrollments = courses.isEmpty() ? List.of() : enrollmentRepository.findByCourseIn(courses);

        Set<Integer> studentIds = new HashSet<>();
        enrollments.forEach(e -> studentIds.add(e.getStudent().getId()));

        // Completion per course = average completion of its students.
        List<CourseProgress> completionByCourse = new ArrayList<>();
        double completionSum = 0;
        for (Course course : courses) {
            List<Enrollment> ofCourse = enrollments.stream().filter(e -> e.getCourse().getId().equals(course.getId())).toList();
            double sum = 0;
            for (Enrollment e : ofCourse) {
                sum += lessonProgressService.progressOf(e.getStudent(), course).completionPercentage();
            }
            completionSum += sum;
            completionByCourse.add(new CourseProgress(course.getId(), course.getTitle(),
                    ofCourse.isEmpty() ? 0 : (int) Math.round(sum / ofCourse.size() * 100)));
        }
        int avgCompletion = enrollments.isEmpty() ? 0 : (int) Math.round(completionSum / enrollments.size() * 100);

        // Enrollments per week (weeks start on Monday), zero-filled so the line chart has no gaps.
        Map<LocalDate, Long> perWeek = new LinkedHashMap<>();
        LocalDate firstWeek = from.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        for (LocalDate w = firstWeek; !w.isAfter(LocalDate.now()); w = w.plusWeeks(1)) {
            perWeek.put(w, 0L);
        }
        for (Object[] row : enrollmentRepository.countPerDayForTeacher(teacher, firstWeek)) {
            LocalDate week = ((LocalDate) row[0]).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            perWeek.merge(week, (Long) row[1], Long::sum);
        }
        List<WeekCount> enrollmentsPerWeek = perWeek.entrySet().stream().map(e -> new WeekCount(e.getKey(), e.getValue())).toList();

        // Quiz scores in 5 buckets.
        List<QuizAttempt> attempts = quizAttemptRepositry.findSubmittedForTeacher(teacher);
        long[] buckets = new long[5];
        for (QuizAttempt a : attempts) {
            double p = a.getPercentage() == null ? 0 : a.getPercentage();
            buckets[p <= 20 ? 0 : p <= 40 ? 1 : p <= 60 ? 2 : p <= 80 ? 3 : 4]++;
        }
        String[] labels = {"0-20", "21-40", "41-60", "61-80", "81-100"};
        List<ScoreBucket> scoreBuckets = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            scoreBuckets.add(new ScoreBucket(labels[i], buckets[i]));
        }
        double avgQuiz = round1(attempts.stream().filter(a -> a.getPercentage() != null)
                .mapToDouble(QuizAttempt::getPercentage).average().orElse(0));

        // Submissions per assignment: on time, late, missing (= students it is meant for who did not submit).
        List<SubmissionCounts> submissions = new ArrayList<>();
        for (Assignment a : courses.isEmpty() ? List.<Assignment>of() : assignmentRepositry.findByCourseIn(courses)) {
            List<AssignmentSubmission> subs = assignmentSubmissionRepository.findByAssignment(a);
            long lateCount = subs.stream().filter(s -> Boolean.TRUE.equals(s.getLate())).count();
            long enrolled = AccessService.audienceOf(a.getAudience()) == Audience.GROUPS
                    ? enrollmentRepository.findByCourse(a.getCourse()).stream()
                        .filter(e -> accessService.inAnyGroup(e.getStudent(), a.getGroups())).count()
                    : enrollmentRepository.countByCourse(a.getCourse());
            submissions.add(new SubmissionCounts(a.getId(), a.getTitle(), subs.size() - lateCount, lateCount,
                    Math.max(0, enrolled - subs.size())));
        }

        // Hardest questions = lowest share of correct answers (top 5).
        List<HardQuestion> hardest = quizAnswerRepository.questionStatsForTeacher(teacher).stream()
                .map(r -> {
                    long total = (Long) r[2];
                    long correct = r[3] == null ? 0 : ((Number) r[3]).longValue();
                    return new HardQuestion((Integer) r[0], (String) r[1], total,
                            total == 0 ? 0 : (int) Math.round(correct * 100.0 / total));
                })
                .sorted(Comparator.comparingInt(HardQuestion::percentCorrect))
                .limit(5)
                .toList();

        Double rating = reviewRepository.averageRatingForTeacher(teacher);
        return new TeacherDashboard(courses.size(), studentIds.size(), avgCompletion, avgQuiz,
                rating == null ? null : round1(rating), reviewRepository.countForTeacher(teacher),
                enrollmentsPerWeek, completionByCourse, scoreBuckets, submissions, hardest);
    }

    // ---------- Admin ----------

    public AdminDashboard admin(String range) {
        LocalDate from = startOf(range, "30d");

        Map<LocalDate, Long> dau = new HashMap<>();
        for (Object[] row : userActivityRepository.countUsersPerDay(from)) {
            dau.put((LocalDate) row[0], (Long) row[1]);
        }
        List<DateCount> dailyActive = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(LocalDate.now()); d = d.plusDays(1)) {
            dailyActive.add(new DateCount(d, dau.getOrDefault(d, 0L)));
        }

        Map<String, Long> usersByRole = new LinkedHashMap<>();
        for (Object[] row : userRepository.countByRole()) {
            usersByRole.put(CurrentUserService.normalize(String.valueOf(row[0])), (Long) row[1]);
        }

        // Enrollments per month, for at least the last 12 months.
        LocalDate monthsFrom = from.isBefore(LocalDate.now().minusMonths(11)) ? from : LocalDate.now().minusMonths(11);
        Map<YearMonth, Long> perMonth = new LinkedHashMap<>();
        for (YearMonth m = YearMonth.from(monthsFrom); !m.isAfter(YearMonth.now()); m = m.plusMonths(1)) {
            perMonth.put(m, 0L);
        }
        for (Object[] row : enrollmentRepository.countPerDay(YearMonth.from(monthsFrom).atDay(1))) {
            perMonth.merge(YearMonth.from((LocalDate) row[0]), (Long) row[1], Long::sum);
        }
        List<MonthCount> enrollmentsPerMonth = perMonth.entrySet().stream()
                .map(e -> new MonthCount(e.getKey().toString(), e.getValue())).toList();

        List<CategoryCount> byCategory = courseRepository.countPublishedByCategory().stream()
                .map(r -> new CategoryCount(String.valueOf(r[0]), (Long) r[1])).toList();

        List<TopCourse> topCourses = new ArrayList<>();
        for (Object[] row : enrollmentRepository.countPerCourse(PageRequest.of(0, 5))) {
            Course course = courseRepository.findById((Integer) row[0]).orElse(null);
            if (course == null) continue;
            List<Enrollment> ofCourse = enrollmentRepository.findByCourse(course);
            double sum = 0;
            for (Enrollment e : ofCourse) {
                sum += lessonProgressService.progressOf(e.getStudent(), course).completionPercentage();
            }
            Double rating = reviewRepository.averageRating(course);
            topCourses.add(new TopCourse(course.getId(), course.getTitle(),
                    course.getTeacher() != null ? course.getTeacher().getName() : null, (Long) row[1],
                    ofCourse.isEmpty() ? 0 : (int) Math.round(sum / ofCourse.size() * 100),
                    rating == null ? null : round1(rating)));
        }

        long pendingTeachers = userRepository.search(null, UserStatus.PENDING, null, PageRequest.of(0, 1)).getTotalElements();
        return new AdminDashboard(userRepository.count(), userActivityRepository.countByActivityDate(LocalDate.now()),
                courseRepository.countByPublishedTrue(), certificateRepository.count(), pendingTeachers,
                dailyActive, usersByRole, enrollmentsPerMonth, byCategory, topCourses);
    }

    // "30d" = 30 days, "12w" = 12 weeks, "6m" = 6 months, "1y" = 1 year. Max 2 years.
    private LocalDate startOf(String range, String fallback) {
        String r = range == null || range.isBlank() ? fallback : range.trim().toLowerCase();
        try {
            int n = Integer.parseInt(r.substring(0, r.length() - 1));
            if (n < 1) throw new NumberFormatException();
            LocalDate today = LocalDate.now();
            LocalDate start = switch (r.charAt(r.length() - 1)) {
                case 'd' -> today.minusDays(n - 1L);
                case 'w' -> today.minusWeeks(n).plusDays(1);
                case 'm' -> today.minusMonths(n).plusDays(1);
                case 'y' -> today.minusYears(n).plusDays(1);
                default -> throw new NumberFormatException();
            };
            return start.isBefore(today.minusYears(2)) ? today.minusYears(2) : start;
        } catch (RuntimeException ex) {
            throw new BadRequestException("range must look like 30d, 12w, 6m or 1y");
        }
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

}
