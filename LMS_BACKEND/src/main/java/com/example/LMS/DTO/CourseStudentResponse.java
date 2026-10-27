package com.example.LMS.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

// One enrolled student of a course, with their progress (teacher "Students" tab).
public record CourseStudentResponse(
        Integer studentId,
        String name,
        String email,
        String avatarUrl,
        LocalDate enrolledDate,
        Integer completedLessons,
        Integer totalLessons,
        // 0 to 100
        Double progress,
        LocalDateTime completedAt,
        LocalDateTime lastActiveAt
) {
}
