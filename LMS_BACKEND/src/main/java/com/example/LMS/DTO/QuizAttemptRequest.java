package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.Map;

// answers = { questionId : selectedOptionId }. The student comes from the login token.
public record QuizAttemptRequest(
        @NotNull(message = "Quiz is required")
        Integer quizId,

        LocalDateTime startDateTime,

        @NotNull(message = "Answers are required")
        Map<Integer, Integer> answers
) {
}
