package com.example.LMS.DTO;

import com.example.LMS.model.AttemptStatus;

import java.time.LocalDateTime;
import java.util.List;

public record QuizAttemptResponse(
        Integer id,
        Integer quizId,
        String quizTitle,
        Integer studentId,
        String studentName,
        Integer score,
        Integer totalMarks,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        Boolean passed,
        // Shown only after the quiz is submitted, so students can review their mistakes.
        List<QuizAnswerResponse> answers,
        Double percentage,
        AttemptStatus status,
        // true when answers arrived after the time limit; those answers were not counted.
        Boolean timeExpired
) {
}
