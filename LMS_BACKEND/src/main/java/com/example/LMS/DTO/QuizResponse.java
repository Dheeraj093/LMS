package com.example.LMS.DTO;

import com.example.LMS.model.Audience;

import java.time.LocalDateTime;
import java.util.List;

public record QuizResponse(

        Integer id,
        String title,
        String description,
        List<Integer> questionIds,
        Integer totalMarks,
        Integer passingMarks,
        Integer timeLimitInMinutes,
        Boolean published,
        Integer courseId,
        Integer maxAttempts,
        Audience audience,
        List<Integer> groupIds,
        // Only sent to the quiz teacher and admins.
        String joinCode,
        // Optional closing time; null = never closes.
        LocalDateTime dueDate
) {
}
