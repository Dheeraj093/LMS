package com.example.LMS.controller;

import com.example.LMS.DTO.QaDtos.AnswerRequest;
import com.example.LMS.DTO.QaDtos.AskRequest;
import com.example.LMS.DTO.QaDtos.QuestionResponse;
import com.example.LMS.DTO.QaDtos.ResolveRequest;
import com.example.LMS.DTO.QaDtos.TeacherQuestions;
import com.example.LMS.service.LessonQaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Lesson Q&A. Access rules are checked in LessonQaService.
@Tag(name = "Lesson Q&A APIs")
@RestController
public class LessonQaController {

    @Autowired
    private LessonQaService lessonQaService;

    @Operation(summary = "Questions of a course, newest first. Optional: lessonId")
    @GetMapping("/courses/{courseId}/questions")
    public ResponseEntity<List<QuestionResponse>> getQuestions(@PathVariable Integer courseId,
                                                               @RequestParam(required = false) Integer lessonId) {
        return ResponseEntity.ok(lessonQaService.getCourseQuestions(courseId, lessonId));
    }

    @Operation(summary = "Ask a question under a lesson of the course")
    @PostMapping("/courses/{courseId}/questions")
    public ResponseEntity<QuestionResponse> ask(@PathVariable Integer courseId, @Valid @RequestBody AskRequest request) {
        return new ResponseEntity<>(lessonQaService.ask(courseId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Questions in my courses (admin: all). status: open | answered | all. Optional: courseId")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/questions/teacher")
    public ResponseEntity<TeacherQuestions> getTeacherQuestions(@RequestParam(required = false) String status,
                                                                @RequestParam(required = false) Integer courseId) {
        return ResponseEntity.ok(lessonQaService.getTeacherQuestions(status, courseId));
    }

    @Operation(summary = "Answer a question. Returns the question with all its answers")
    @PostMapping("/questions/{id}/answers")
    public ResponseEntity<QuestionResponse> answer(@PathVariable Integer id, @Valid @RequestBody AnswerRequest request) {
        return new ResponseEntity<>(lessonQaService.answer(id, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mark a question resolved or open again (author, course teacher, admin)")
    @PatchMapping("/questions/{id}/resolve")
    public ResponseEntity<QuestionResponse> resolve(@PathVariable Integer id, @Valid @RequestBody ResolveRequest request) {
        return ResponseEntity.ok(lessonQaService.setResolved(id, request.resolved()));
    }

    @Operation(summary = "Delete a question and its answers (author, course teacher, admin)")
    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Map<String, String>> deleteQuestion(@PathVariable Integer id) {
        lessonQaService.deleteQuestion(id);
        return ResponseEntity.ok(Map.of("message", "Question deleted"));
    }

    @Operation(summary = "Delete an answer (author, course teacher, admin)")
    @DeleteMapping("/answers/{id}")
    public ResponseEntity<Map<String, String>> deleteAnswer(@PathVariable Integer id) {
        lessonQaService.deleteAnswer(id);
        return ResponseEntity.ok(Map.of("message", "Answer deleted"));
    }
}
