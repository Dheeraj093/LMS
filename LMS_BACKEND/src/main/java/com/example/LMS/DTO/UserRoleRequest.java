package com.example.LMS.DTO;

// Send either role ("ADMIN", "TEACHER" or "STUDENT", preferred) or roleId.
public record UserRoleRequest(
        Integer roleId,
        String role
) {
}
