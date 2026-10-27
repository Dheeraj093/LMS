package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;

// The student is taken from the login token.
public record LessonProgressRequest(

        @NotNull(message = "Lesson is required")
        Integer lessonId

) {
}
