package com.example.LMS.DTO;

import java.time.LocalDateTime;
import java.util.List;

// Returned by POST /quiz/{id}/start. Questions come without the correct answers.
// The timer on the page should count down to "deadline" (server time), not to a time the browser picks.
public record QuizStartResponse(
        Integer attemptId,
        Integer quizId,
        String quizTitle,
        Integer timeLimitInMinutes,
        Integer totalMarks,
        LocalDateTime startedAt,
        LocalDateTime deadline,
        LocalDateTime serverTime,
        Integer attemptNumber,
        Integer maxAttempts,
        List<QuestionResponse> questions
) {
}
