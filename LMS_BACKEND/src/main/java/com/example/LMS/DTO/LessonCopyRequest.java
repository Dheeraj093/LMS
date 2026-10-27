package com.example.LMS.DTO;

// moduleId (optional): put the copy in place of the original inside this module,
// so only the course(s) using that module get the copy.
public record LessonCopyRequest(
        Integer moduleId
) {
}
