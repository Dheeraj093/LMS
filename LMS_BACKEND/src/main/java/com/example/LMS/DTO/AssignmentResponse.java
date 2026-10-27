package com.example.LMS.DTO;

import com.example.LMS.model.Audience;

import java.time.LocalDateTime;
import java.util.List;

public record AssignmentResponse(
        Integer id,
        String title,
        String description,
        LocalDateTime dueDate,
        Integer totalMarks,
        Integer courseId,
        Audience audience,
        List<Integer> groupIds
) {
}
