package com.example.LMS.controller;

import com.example.LMS.DTO.QuizAttemptRequest;
import com.example.LMS.DTO.QuizAttemptResponse;
import com.example.LMS.DTO.QuizSubmitRequest;
import com.example.LMS.service.QuizAttemptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.example.LMS.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Quiz Attempt APIs")
@RestController
@RequestMapping("/quiz-attempt")
public class QuizAttemptController {

    @Autowired
    private QuizAttemptService quizAttemptService;

    @Autowired
    private ReportService reportService;

    @Operation(summary = "Download one submitted attempt as a PDF (the student's own, or any attempt of the teacher's quiz)")
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportAttempt(@PathVariable Integer id) {
        return reportService.attemptResult(id).toResponse();
    }

    @Operation(summary = "Old one-step submit (start + submit at once). New pages should use /quiz/{id}/start and /{attemptId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping
    public ResponseEntity<QuizAttemptResponse> createQuizAttempt(@Valid @RequestBody QuizAttemptRequest quizAttemptRequest) {
        return new ResponseEntity<>(quizAttemptService.createQuizAttempt(quizAttemptRequest), HttpStatus.CREATED);
    }

    @Operation(summary = "Submit a started attempt (the server checks the time limit)")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/{attemptId}/submit")
    public ResponseEntity<QuizAttemptResponse> submitAttempt(@PathVariable Integer attemptId, @Valid @RequestBody QuizSubmitRequest request) {
        return ResponseEntity.ok(quizAttemptService.submitAttempt(attemptId, request.answers()));
    }

    @Operation(summary = "My quiz attempts")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/my")
    public ResponseEntity<List<QuizAttemptResponse>> getMyAttempts() {
        return ResponseEntity.ok(quizAttemptService.getMyAttempts());
    }

    @Operation(summary = "All attempts of a quiz (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/quiz/{quizId}")
    public ResponseEntity<List<QuizAttemptResponse>> getAttemptsByQuiz(@PathVariable Integer quizId) {
        return ResponseEntity.ok(quizAttemptService.getAttemptsByQuiz(quizId));
    }

    @Operation(summary = "One attempt with its answers")
    @GetMapping("/{id}")
    public ResponseEntity<QuizAttemptResponse> getAttemptById(@PathVariable Integer id) {
        return ResponseEntity.ok(quizAttemptService.getAttemptById(id));
    }
}
