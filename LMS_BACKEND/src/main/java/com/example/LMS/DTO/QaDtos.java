package com.example.LMS.DTO;

import com.example.LMS.model.LessonQuestion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

// Request and response shapes for the lesson Q&A (questions under a lesson and their answers).
public final class QaDtos {

    private QaDtos() {
    }

    public record AskRequest(
            @NotNull(message = "Lesson is required")
            Integer lessonId,

            @NotBlank(message = "Write your question")
            @Size(max = LessonQuestion.MAX_BODY, message = "Question can be at most 4000 characters")
            String body
    ) { }

    public record AnswerRequest(
            @NotBlank(message = "Write your answer")
            @Size(max = LessonQuestion.MAX_BODY, message = "Answer can be at most 4000 characters")
            String body
    ) { }

    public record ResolveRequest(
            @NotNull(message = "Resolved is required")
            Boolean resolved
    ) { }

    // fromTeacher = written by the course teacher or an admin (highlighted in the UI).
    public record AnswerResponse(
            Integer id, Integer questionId,
            Integer authorId, String authorName, String authorAvatarUrl, String authorRole, boolean fromTeacher,
            String body, LocalDateTime createdAt, boolean canDelete) { }

    // teacherAnswered = at least one answer is fromTeacher. The can* flags are for the logged-in user.
    public record QuestionResponse(
            Integer id, Integer courseId, String courseTitle, Integer lessonId, String lessonTitle,
            Integer authorId, String authorName, String authorAvatarUrl, String authorRole,
            String body, LocalDateTime createdAt, boolean resolved,
            int answerCount, boolean teacherAnswered, boolean canDelete, boolean canResolve,
            List<AnswerResponse> answers) { }

    // open = not resolved and no teacher answer yet; answered = the rest.
    public record QaCounts(long open, long answered, long all) { }

    public record TeacherQuestions(QaCounts counts, List<QuestionResponse> questions) { }
}
