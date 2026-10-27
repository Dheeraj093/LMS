package com.example.LMS.DTO;

import com.example.LMS.model.UserStatus;

import java.time.LocalDateTime;

// A user as shown in the profile page and the admin user table. Never contains the password.
public record UserResponse(
        Integer id,
        String name,
        String email,
        Integer roleId,
        String roleName,
        UserStatus status,
        String avatarUrl,
        LocalDateTime createdAt,
        LocalDateTime lastActiveAt
) {
}
