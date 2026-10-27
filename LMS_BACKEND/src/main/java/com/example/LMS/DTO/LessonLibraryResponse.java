package com.example.LMS.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;
import java.util.List;

// A lesson in the teacher's lesson library, with every place it is used.
public record LessonLibraryResponse(
        Integer id,
        String title,
        String contentType,
        Integer duration,
        Boolean published,
        Integer teacherId,
        String teacherName,
        @JsonFormat(pattern = "dd MMM yyyy")
        LocalDateTime updatedAt,
        // Number of different courses that show this lesson. More than 1 means editing it changes all of them.
        Integer courseCount,
        List<LessonUsage> usedIn
) {
}
