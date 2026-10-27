package com.example.LMS.DTO;

import java.time.LocalDateTime;

public record AnnouncementResponse(
        Integer id,
        Integer courseId,
        String courseTitle,
        Integer authorId,
        String authorName,
        String authorAvatarUrl,
        String title,
        String body,
        Boolean pinned,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        // True when the logged-in user may edit or delete it (course teacher or admin).
        Boolean canEdit
) {
}
