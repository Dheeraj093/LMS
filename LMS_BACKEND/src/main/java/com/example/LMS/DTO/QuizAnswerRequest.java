package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;

public record QuizAnswerRequest(

        @NotNull
        Integer attemptId,
        @NotNull
        Integer questionId,
        @NotNull
        Integer optionId
) {
}
