package com.example.LMS.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// Sent by the lesson player every minute or so while a lesson is open.
// Max 300 seconds per call, so a wrong or cheating client cannot add hours at once.
public record StudyTimeRequest(
        @NotNull(message = "Seconds are required")
        @Min(value = 1, message = "Seconds must be at least 1")
        @Max(value = 300, message = "Send at most 300 seconds at a time")
        Integer seconds
) {
}
