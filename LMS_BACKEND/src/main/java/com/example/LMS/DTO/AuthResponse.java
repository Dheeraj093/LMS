package com.example.LMS.DTO;

import com.example.LMS.model.UserStatus;

// Sent after register, login and refresh.
// "role" stays the role id so older frontends keep working; "roleName" is the readable name.
// token (short-lived access token) and refreshToken are null when the user cannot log in yet:
// a teacher waiting for admin approval (status PENDING) or an email that is not verified (emailVerified false).
// "message" explains that case in words.
public record AuthResponse(
        String token,
        Integer id,
        String email,
        Integer role,
        String roleName,
        String name,
        UserStatus status,
        String avatarUrl,
        String refreshToken,
        Boolean emailVerified,
        String message
) {
}
