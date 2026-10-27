package com.example.LMS.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// @Valid on each option makes Spring also check the rules inside OptionRequest.
public record QuestionRequest(

        @NotBlank(message = "Question text is required")
        String questionText,

        @NotNull(message = "Marks are required")
        @Positive(message = "Marks must be more than 0")
        Integer marks,

        @Valid @NotNull(message = "Option 1 is required")
        OptionRequest option1,

        @Valid @NotNull(message = "Option 2 is required")
        OptionRequest option2,

        @Valid @NotNull(message = "Option 3 is required")
        OptionRequest option3,

        @Valid @NotNull(message = "Option 4 is required")
        OptionRequest option4,

        String topic,

        @NotNull
        Boolean published

) {
}
