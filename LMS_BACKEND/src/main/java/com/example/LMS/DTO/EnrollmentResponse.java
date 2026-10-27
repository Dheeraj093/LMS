package com.example.LMS.DTO;

import java.time.LocalDate;

public record EnrollmentResponse(

        Integer enrollmentId,
        Integer courseId,
        Integer studentId,
        String courseTitle,
        LocalDate enrolledDate

) {
}