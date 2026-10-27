package com.example.LMS.DTO;

public record OptionResponse(
        Integer id,
        String optionText,
        Integer questionId,
        Boolean correct
) {
}
