package com.example.LMS.DTO;

import java.util.List;

public record QuestionResponse(
        Integer id,
        String questionText,
        Integer marks,
        Boolean published,
        String topic,
        List<OptionResponse> options
) {
}
