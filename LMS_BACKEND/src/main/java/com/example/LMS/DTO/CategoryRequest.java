package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(

        @NotBlank
        String name,
        String description

) {
}