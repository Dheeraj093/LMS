package com.example.LMS.DTO;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// Response shapes for the three dashboards. Field names match the charts in the new design.
public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record DateCount(LocalDate date, long count) { }

    public record DateMinutes(LocalDate date, long minutes) { }

    public record QuizScore(Integer quizId, String quizTitle, LocalDate date, double percent) { }

    public record CourseProgress(Integer courseId, String title, int percent) { }

    public record AssignmentCounts(long onTime, long late, long pending) { }

    public record StudentDashboard(
            long coursesEnrolled, long coursesCompleted, long lessonsCompleted, long totalLessons,
            double avgQuizScore, long learningMinutes, long certificates,
            List<QuizScore> quizScores, List<CourseProgress> courseProgress,
            List<DateMinutes> minutesPerDay, AssignmentCounts assignments) { }

    public record WeekCount(LocalDate weekStart, long count) { }

    public record ScoreBucket(String range, long count) { }

    public record SubmissionCounts(Integer assignmentId, String title, long onTime, long late, long missing) { }

    public record HardQuestion(Integer questionId, String text, long answers, int percentCorrect) { }

    public record TeacherDashboard(
            long totalCourses, long totalStudents, int avgCompletion, double avgQuizScore,
            Double avgRating, long reviewCount,
            List<WeekCount> enrollmentsPerWeek, List<CourseProgress> completionByCourse,
            List<ScoreBucket> scoreBuckets, List<SubmissionCounts> submissions,
            List<HardQuestion> hardestQuestions) { }

    public record MonthCount(String month, long count) { }

    public record CategoryCount(String category, long count) { }

    public record TopCourse(Integer courseId, String title, String teacher, long enrollments, int completion, Double rating) { }

    public record AdminDashboard(
            long totalUsers, long activeToday, long publishedCourses, long certificatesIssued, long pendingTeachers,
            List<DateCount> dailyActiveUsers, Map<String, Long> usersByRole,
            List<MonthCount> enrollmentsPerMonth, List<CategoryCount> coursesByCategory,
            List<TopCourse> topCourses) { }
}
