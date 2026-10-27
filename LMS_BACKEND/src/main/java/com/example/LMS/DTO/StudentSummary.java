package com.example.LMS.DTO;

// A student as shown in pickers and member lists.
public record StudentSummary(
        Integer id,
        String name,
        String email,
        String avatarUrl
) {
}
