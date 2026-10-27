package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name can be at most 100 characters")
        String name,

        // Id from POST /files with purpose AVATAR. Leave empty to keep the current picture.
        Integer avatarFileId
) {
}
