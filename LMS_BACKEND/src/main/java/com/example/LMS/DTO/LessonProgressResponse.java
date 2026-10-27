package com.example.LMS.DTO;

import java.util.List;

// completionPercentage is a fraction from 0.0 to 1.0 (the frontend multiplies by 100).
// completedLessonIds lets the course player tick the lessons that are already done.
public record LessonProgressResponse(
        Integer totalLessons,
        Integer completedLessons,
        Double completionPercentage,
        List<Integer> completedLessonIds
) {
}
