package com.example.LMS.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Admin "Add user" form.
public record AdminCreateUserRequest(

        @NotBlank(message = "Name is required")
        String name,

        @Email(message = "Enter a valid email")
        @NotBlank(message = "Email is required")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        // "STUDENT", "TEACHER" or "ADMIN". Empty means STUDENT.
        String role

) {
}
