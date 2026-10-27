package com.example.LMS.DTO;

import java.time.LocalDateTime;

public record ReviewResponse(
        Integer id,
        Integer courseId,
        Integer studentId,
        String studentName,
        Integer rating,
        String comment,
        LocalDateTime createdAt
) {
}
