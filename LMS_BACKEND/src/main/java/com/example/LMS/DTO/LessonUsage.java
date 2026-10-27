package com.example.LMS.DTO;

// One place a lesson is used: a module, and the course that module belongs to (course fields are null when the module is in no course).
public record LessonUsage(
        Integer courseId,
        String courseTitle,
        Integer moduleId,
        String moduleTitle
) {
}
