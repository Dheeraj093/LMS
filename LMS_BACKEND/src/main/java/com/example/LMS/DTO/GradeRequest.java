package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

// Sent by the teacher to grade one submission.
public record GradeRequest(
        @NotNull(message = "Marks are required")
        @PositiveOrZero(message = "Marks cannot be negative")
        Integer marks,

        String feedback
) {
}
