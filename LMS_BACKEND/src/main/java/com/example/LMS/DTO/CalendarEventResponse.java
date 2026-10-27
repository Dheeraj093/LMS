package com.example.LMS.DTO;

import java.time.LocalDateTime;

// One deadline on the calendar page.
// type: ASSIGNMENT_DUE or QUIZ_DUE.
// status for students: assignments PENDING / SUBMITTED / LATE / GRADED / MISSING, quizzes OPEN / CLOSED / DONE.
// status for teachers and admins: OPEN (due date not passed yet), CLOSED, or DRAFT (unpublished quiz),
// and submittedCount / studentCount with a ready-made text in detail, e.g. "3 / 10 submitted".
public record CalendarEventResponse(
        String type,
        Integer id,
        String title,
        Integer courseId,
        String courseTitle,
        LocalDateTime date,
        String link,
        String status,
        Integer submittedCount,
        Integer studentCount,
        String detail
) {
}
