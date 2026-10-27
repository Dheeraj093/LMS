package com.example.LMS.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record LessonResponse(
        Integer id,
        String title,
        String videoUrl,
        String pdfUrl,
        // Was missing: text lessons showed nothing to students.
        String content,
        Integer duration,
        String contentType,
        Boolean published,
        @JsonFormat(pattern = "dd MMM yyyy")
        LocalDateTime createdAt,
        @JsonFormat(pattern = "dd MMM yyyy")
        LocalDateTime updatedAt,
        // Send these back unchanged when editing, to keep the uploaded files.
        Integer videoFileId,
        Integer pdfFileId
) {
}
