package com.example.LMS.DTO;

// One answered question inside a quiz result.
public record QuizAnswerResponse(
        Integer questionId,
        Integer selectedOptionId,
        Integer correctOptionId,
        Boolean correct,
        Integer marks
) {
}
