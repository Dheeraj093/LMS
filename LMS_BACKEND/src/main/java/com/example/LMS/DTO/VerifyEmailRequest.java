package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank(message = "Verification code is required")
        String token
) {
}
