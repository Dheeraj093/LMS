package com.example.LMS.controller;

import com.example.LMS.DTO.AssignmentSubmissionRequest;
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

// The URL "/assignment-controller" is kept because the frontend already uses it.
@Tag(name = "AssignmentSubmission APIs")
@RestController
@RequestMapping("/assignment-controller")
public class AssignmentSubmissionController {

    @Autowired
    private AssignmentSubmissionService assignmentSubmissionService;

    @Operation(summary = "Submit (or re-submit) an assignment")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping
    public ResponseEntity<AssignmentSubmissionResponse> createAssignmentSubmission(@Valid @RequestBody AssignmentSubmissionRequest request) {
        return new ResponseEntity<>(assignmentSubmissionService.createAssignmentSubmission(request), HttpStatus.CREATED);
    }

    @Operation(summary = "Get Submission By Id")
    @GetMapping("/{id}")
    public ResponseEntity<AssignmentSubmissionResponse> getAssignmentSubmissionById(@PathVariable Integer id) {
        return ResponseEntity.ok(assignmentSubmissionService.getAssignmentSubmissionById(id));
    }

    @Operation(summary = "Get a student's submission for an assignment (id = assignment id)")
    @GetMapping("/{id}/student/{studentId}")
    public ResponseEntity<AssignmentSubmissionResponse> getAssignmentSubmissionByStudentId(@PathVariable Integer id, @PathVariable Integer studentId) {
        return ResponseEntity.ok(assignmentSubmissionService.getAssignmentSubmissionByStudentId(id, studentId));
    }

    @Operation(summary = "Get my submission for an assignment")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/assignment/{assignmentId}/my")
    public ResponseEntity<AssignmentSubmissionResponse> getMySubmission(@PathVariable Integer assignmentId) {
        return ResponseEntity.ok(assignmentSubmissionService.getMySubmission(assignmentId));
    }

    @Operation(summary = "Get all submissions of an assignment (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getSubmissionsByAssignment(@PathVariable Integer assignmentId) {
        return ResponseEntity.ok(assignmentSubmissionService.getSubmissionsByAssignment(assignmentId));
    }

    @Operation(summary = "Grade a submission (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}/grade")
    public ResponseEntity<AssignmentSubmissionResponse> gradeSubmission(@PathVariable Integer id, @Valid @RequestBody GradeRequest request) {
        return ResponseEntity.ok(assignmentSubmissionService.gradeSubmission(id, request));
    }
}
