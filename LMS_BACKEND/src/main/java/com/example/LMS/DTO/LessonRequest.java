package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record LessonRequest(

        @NotBlank(message = "Title is required")
        String title,

        String videoUrl,

        String pdfUrl,

        // Ids from POST /files (purpose LESSON_VIDEO / LESSON_PDF). When sent, they replace videoUrl / pdfUrl.
        Integer videoFileId,

        Integer pdfFileId,

        String content,

        String contentType,

        @PositiveOrZero(message = "Duration cannot be negative")
        Integer duration,

        Boolean published

) {
}
