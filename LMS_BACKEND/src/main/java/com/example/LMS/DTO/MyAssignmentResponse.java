package com.example.LMS.DTO;

import java.time.LocalDateTime;

// One row of the student's "My assignments" list.
// status: PENDING (not submitted, still time), MISSING (not submitted, due date passed),
//         SUBMITTED, LATE (submitted after due date), GRADED.
public record MyAssignmentResponse(
        Integer id,
        String title,
        String description,
        LocalDateTime dueDate,
        Integer totalMarks,
        Integer courseId,
        String courseTitle,
        String status,
        Integer submissionId,
        LocalDateTime submittedAt,
        Integer marks,
        String feedback
) {
}
