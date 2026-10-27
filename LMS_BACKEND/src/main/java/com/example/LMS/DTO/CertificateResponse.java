package com.example.LMS.DTO;

import java.time.LocalDateTime;

public record CertificateResponse(
        Integer id,
        String code,
        String studentName,
        Integer courseId,
        String courseTitle,
        String teacherName,
        LocalDateTime issuedAt
) {
}
