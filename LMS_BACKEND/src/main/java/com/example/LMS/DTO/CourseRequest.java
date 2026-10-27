package com.example.LMS.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CourseRequest(

        @NotBlank(message = "Title is required")
        String title,

        String description,

        // Any image link. Ignored when thumbnailFileId is sent.
        String thumbnail,

        // Id from POST /files with purpose COURSE_THUMBNAIL.
        Integer thumbnailFileId,

        @NotNull(message = "Category is required")
        Integer categoryId,

        // Module ids in the order they should appear.
        List<Integer> modules,

        boolean published

) {
}
