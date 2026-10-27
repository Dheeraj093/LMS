package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;

import java.util.List;

// The student comes from the login token.
// Send a link (filePath), uploaded files (fileIds from POST /files with purpose ASSIGNMENT_FILE), or both.
public record AssignmentSubmissionRequest(

        @NotNull(message = "Assignment is required")
        Integer assignmentId,

        String filePath,

        List<Integer> fileIds
) {
}
