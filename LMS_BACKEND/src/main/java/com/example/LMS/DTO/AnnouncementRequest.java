package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnnouncementRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 150, message = "Title can be at most 150 characters")
        String title,

        @NotBlank(message = "Message is required")
        @Size(max = 5000, message = "Message can be at most 5000 characters")
        String body,

        // Empty = not pinned.
        Boolean pinned
) {
}
