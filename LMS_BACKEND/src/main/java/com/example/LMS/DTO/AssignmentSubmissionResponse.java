package com.example.LMS.DTO;

import com.example.LMS.model.SubmissionStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AssignmentSubmissionResponse(
        Integer id,
        Integer assignmentId,
        Integer studentId,
        String studentName,
        String filePath,
        LocalDateTime submittedAt,
        Boolean late,
        Integer marks,
        String feedback,
        SubmissionStatus status,
        LocalDateTime gradedAt,
        List<FileResponse> files
) {
}
