package com.example.LMS.DTO;

import java.util.List;

public record ModuleResponse(

        Integer id,
        String title,
        List<Integer> lessonIds,
        String description,
        Boolean published

) {
}