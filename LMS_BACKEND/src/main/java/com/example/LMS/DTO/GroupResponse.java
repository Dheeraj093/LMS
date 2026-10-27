package com.example.LMS.DTO;

import java.time.LocalDateTime;
import java.util.List;

// members (with names and emails) is only sent to the group teacher and admins.
// A student in the group gets memberIds and memberCount, not other students' details.
public record GroupResponse(
        Integer id,
        String name,
        String description,
        Integer teacherId,
        String teacherName,
        Integer memberCount,
        List<Integer> memberIds,
        List<StudentSummary> members,
        LocalDateTime createdAt
) {
}
