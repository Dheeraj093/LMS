package com.example.LMS.DTO;

import com.example.LMS.model.Audience;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;
import java.util.List;

public record AssignmentRequest(

        @NotBlank(message = "Title is required")
        String title,

        String description,

        @NotNull(message = "Due date is required")
        LocalDateTime dueDate,

        @NotNull(message = "Total marks are required")
        @Positive(message = "Total marks must be more than 0")
        Integer totalMarks,

        @NotNull(message = "Course is required")
        Integer courseId,

        // ALL (default) or GROUPS.
        Audience audience,

        // Needed when audience = GROUPS.
        List<Integer> groupIds
) {
}
