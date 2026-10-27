package com.example.LMS.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank(message = "Name is required")
        String name,

        @Email(message = "Enter a valid email")
        @NotBlank(message = "Email is required")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        // Optional. Only TEACHER (2) or STUDENT (3) are accepted; empty means STUDENT.
        // Admin accounts can never be created from the register page.
        Integer roleId,

        // Optional, and preferred over roleId: "STUDENT" or "TEACHER".
        // Role ids differ between databases (they depend on the order the roles were first saved), names do not.
        String role

) {
}
