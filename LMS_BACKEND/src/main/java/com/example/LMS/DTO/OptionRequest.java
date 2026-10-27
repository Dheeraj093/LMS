package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;

// id is only sent back by the edit form; the server matches options by position, not by this id.
public record OptionRequest(

        Integer id,

        @NotBlank(message = "Every option needs text")
        String optionText,

        // null is treated as false
        Boolean correct
) {
}
