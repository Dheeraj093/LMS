package com.example.LMS.DTO;

import com.example.LMS.model.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Integer id,
        NotificationType type,
        String message,
        String link,
        Boolean read,
        LocalDateTime createdAt
) {
}
