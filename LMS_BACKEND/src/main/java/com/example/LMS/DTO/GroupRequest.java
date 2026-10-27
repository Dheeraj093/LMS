package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GroupRequest(
        @NotBlank(message = "Group name is required")
        @Size(max = 100, message = "Group name can have at most 100 characters")
        String name,

        String description,

        // Student ids. Empty = a group with no members yet.
        List<Integer> memberIds
) {
}
