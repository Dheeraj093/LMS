package com.example.LMS.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be 1 to 5")
        @Max(value = 5, message = "Rating must be 1 to 5")
        Integer rating,

        @Size(max = 2000, message = "Comment can be at most 2000 characters")
        String comment
) {
}
