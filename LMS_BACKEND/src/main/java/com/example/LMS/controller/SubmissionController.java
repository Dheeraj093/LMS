package com.example.LMS.controller;

import com.example.LMS.DTO.AssignmentSubmissionResponse;
import com.example.LMS.DTO.GradeRequest;
import com.example.LMS.service.AssignmentSubmissionService;
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

// Short URLs for grading, same logic as /assignment-controller.
@Tag(name = "Submission APIs")
@RestController
@RequestMapping("/submissions")
public class SubmissionController {

    @Autowired
    private AssignmentSubmissionService assignmentSubmissionService;

    @Operation(summary = "One submission")
    @GetMapping("/{id}")
    public ResponseEntity<AssignmentSubmissionResponse> get(@PathVariable Integer id) {
        return ResponseEntity.ok(assignmentSubmissionService.getAssignmentSubmissionById(id));
    }

    @Operation(summary = "Grade a submission (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}/grade")
    public ResponseEntity<AssignmentSubmissionResponse> grade(@PathVariable Integer id, @Valid @RequestBody GradeRequest request) {
        return ResponseEntity.ok(assignmentSubmissionService.gradeSubmission(id, request));
    }
}
