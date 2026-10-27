package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

// answers = { questionId : selectedOptionId }. Unanswered questions can be left out.
public record QuizSubmitRequest(
        @NotNull(message = "Answers are required")
        Map<Integer, Integer> answers
) {
}
