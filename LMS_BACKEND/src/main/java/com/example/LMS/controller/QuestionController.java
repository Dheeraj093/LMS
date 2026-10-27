package com.example.LMS.controller;

import com.example.LMS.DTO.QuestionRequest;
import com.example.LMS.DTO.QuestionResponse;
import com.example.LMS.service.QuestionService;
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

@Tag(name = "Question APIs")
@RestController
@RequestMapping("/question")
public class QuestionController {

    @Autowired
    private QuestionService questionService;

    @Operation(summary = "Create Question with its 4 options")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<QuestionResponse> addQuestion(@Valid @RequestBody QuestionRequest questionRequest) {
        return new ResponseEntity<>(questionService.addQuestion(questionRequest), HttpStatus.CREATED);
    }

    @Operation(summary = "Get questions (teacher: own, admin: all)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<QuestionResponse>> getAllQuestions() {
        return ResponseEntity.ok(questionService.getAllQuestions());
    }

    @Operation(summary = "Get Question By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<QuestionResponse> getQuestionById(@PathVariable Integer id) {
        return ResponseEntity.ok(questionService.getQuestionById(id));
    }

    @Operation(summary = "Update Question By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<QuestionResponse> updateQuestion(@PathVariable Integer id, @Valid @RequestBody QuestionRequest questionRequest) {
        return ResponseEntity.ok(questionService.updateQuestion(id, questionRequest));
    }

    // Before: returned 204 No Content with a body on error, which browsers drop.
    @Operation(summary = "Delete Question By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteQuestion(@PathVariable Integer id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.ok(Map.of("message", "Question Deleted Successfully"));
    }

    @Operation(summary = "Get questions of a quiz (students do not get the correct answers)")
    @GetMapping("/quiz/{quizId}")
    public ResponseEntity<List<QuestionResponse>> getAllQuestionsByQuiz(@PathVariable Integer quizId) {
        return ResponseEntity.ok(questionService.getAllQuestionsByQuiz(quizId));
    }
}
