package com.example.LMS.controller;

import com.example.LMS.DTO.AssignmentRequest;
import com.example.LMS.DTO.AssignmentResponse;
import com.example.LMS.DTO.AssignmentSubmissionResponse;
import com.example.LMS.DTO.MyAssignmentResponse;
import com.example.LMS.service.AssignmentService;
import com.example.LMS.service.AssignmentSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.example.LMS.service.ReportService;
import com.example.LMS.DTO.StudentSummary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Assignment APIs")
@RestController
@RequestMapping("/assignment")
public class AssignmentController {

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private AssignmentSubmissionService assignmentSubmissionService;

    @Autowired
    private ReportService reportService;

    @Operation(summary = "Students who have not submitted this assignment yet (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}/missing")
    public ResponseEntity<List<StudentSummary>> getMissing(@PathVariable Integer id) {
        return ResponseEntity.ok(assignmentSubmissionService.getMissingStudents(id));
    }

    @Operation(summary = "Download the grades of an assignment as Excel (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}/submissions/export")
    public ResponseEntity<byte[]> exportGrades(@PathVariable Integer id) {
        return reportService.assignmentGrades(id).toResponse();
    }

    @Operation(summary = "Create Assignment")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<AssignmentResponse> createAssignment(@Valid @RequestBody AssignmentRequest assignment) {
        return new ResponseEntity<>(assignmentService.createAssignment(assignment), HttpStatus.CREATED);
    }

    @Operation(summary = "Get assignments (teacher: own courses, student: joined courses, admin: all)")
    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> getAllAssignments() {
        return ResponseEntity.ok(assignmentService.getAllAssignment());
    }

    @Operation(summary = "My assignments with my status: PENDING, MISSING, SUBMITTED, LATE, GRADED")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/my")
    public ResponseEntity<List<MyAssignmentResponse>> getMyAssignments() {
        return ResponseEntity.ok(assignmentService.getMyAssignments());
    }

    @Operation(summary = "All submissions of an assignment (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}/submissions")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getSubmissions(@PathVariable Integer id) {
        return ResponseEntity.ok(assignmentSubmissionService.getSubmissionsByAssignment(id));
    }

    @Operation(summary = "Get Assignment By Id")
    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> getAssignment(@PathVariable Integer id) {
        return ResponseEntity.ok(assignmentService.getAssignmentById(id));
    }

    @Operation(summary = "Get Assignments By CourseId")
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<AssignmentResponse>> getAssignmentsByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsByCourse(courseId));
    }

    @Operation(summary = "Update Assignment By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<AssignmentResponse> updateAssignment(@PathVariable Integer id, @Valid @RequestBody AssignmentRequest assignmentRequest) {
        return ResponseEntity.ok(assignmentService.updateAssignment(id, assignmentRequest));
    }

    // Errors (not found / not allowed / has submissions) come back as JSON from GlobalExceptionHandler.
    @Operation(summary = "Delete Assignment By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAssignment(@PathVariable Integer id) {
        assignmentService.deleteAssignment(id);
        return ResponseEntity.ok(Map.of("message", "Assignment has been deleted"));
    }
}
