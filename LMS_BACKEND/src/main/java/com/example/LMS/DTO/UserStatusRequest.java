package com.example.LMS.DTO;

import com.example.LMS.model.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusRequest(
        @NotNull(message = "Status is required (ACTIVE, PENDING or BLOCKED)")
        UserStatus status
) {
}
