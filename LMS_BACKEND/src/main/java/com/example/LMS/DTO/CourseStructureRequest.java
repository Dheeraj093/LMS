package com.example.LMS.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// Sent by the drag-and-drop course builder: modules in order, each with its lessons in order.
public record CourseStructureRequest(
        @NotNull(message = "Modules are required")
        @Valid
        List<ModuleOrder> modules
) {
    public record ModuleOrder(
            @NotNull(message = "Module id is required")
            Integer moduleId,
            @NotNull(message = "Lesson ids are required")
            List<Integer> lessonIds
    ) {
    }
}
