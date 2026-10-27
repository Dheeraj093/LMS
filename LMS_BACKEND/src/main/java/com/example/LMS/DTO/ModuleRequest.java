package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ModuleRequest(

        @NotBlank
        String title,

        @NotNull
        String description,

        @NotNull
        List<Integer> lessonsIds,

        @NotNull
        Boolean published

) {
}