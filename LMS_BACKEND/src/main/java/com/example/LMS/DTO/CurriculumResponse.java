package com.example.LMS.DTO;

import java.time.LocalDateTime;
import java.util.List;

// Everything the course page and the course player need, in one call.
public record CurriculumResponse(
        CourseResponse course,
        Boolean enrolled,
        LocalDateTime completedAt,
        // null when the user is not an enrolled student
        LessonProgressResponse progress,
        List<ModuleItem> modules
) {
    public record ModuleItem(Integer id, String title, String description, Boolean published, List<LessonItem> lessons) {
    }

    // locked = true means the student must enroll first; the lesson's content is not sent.
    public record LessonItem(Integer id, String title, String contentType, Integer duration, Boolean published,
                             Boolean completed, Boolean locked) {
    }
}
