package com.example.LMS.DTO;

import com.example.LMS.model.Audience;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDateTime;
import java.util.List;

public record QuizRequest(
        @NotBlank(message = "Title is required")
        String title,

        String description,

        // Ignored: total marks are calculated from the selected questions.
        Integer totalMarks,

        @NotNull(message = "Passing marks are required")
        @PositiveOrZero
        Integer passingMarks,

        @NotNull
        Boolean published,

        @NotNull(message = "Time limit is required")
        @Positive(message = "Time limit must be at least 1 minute")
        Integer timeLimitInMinutes,

        @NotEmpty(message = "Select at least one question")
        List<Integer> questionsIdList,

        // The course this quiz belongs to. Students only see quizzes of courses they joined.
        Integer courseId,

        // How many times a student may take the quiz. Empty = 1.
        @Positive(message = "Max attempts must be at least 1")
        Integer maxAttempts,

        // ALL (default), GROUPS or LINK.
        Audience audience,

        // Needed when audience = GROUPS. Groups must belong to the quiz teacher.
        List<Integer> groupIds,

        // 4 to 12 letters or digits. Empty = no code, except LINK where the server makes one.
        String joinCode,

        // Optional closing time. Empty = the quiz never closes.
        LocalDateTime dueDate
) {
}
