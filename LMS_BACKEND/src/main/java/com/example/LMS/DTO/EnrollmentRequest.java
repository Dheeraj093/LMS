package com.example.LMS.DTO;

import jakarta.validation.constraints.NotNull;

// The student is taken from the login token, so only the course is needed.
// (An old "studentId" field sent by the frontend is simply ignored.)
public record EnrollmentRequest(

        @NotNull(message = "Course is required")
        Integer courseId

) {
}
