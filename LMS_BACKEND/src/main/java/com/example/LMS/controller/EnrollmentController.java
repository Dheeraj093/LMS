package com.example.LMS.controller;

import com.example.LMS.DTO.EnrollmentRequest;
import com.example.LMS.DTO.EnrollmentResponse;
import com.example.LMS.service.EnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.example.LMS.service.ReportService;
import com.example.LMS.DTO.CourseStudentResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Enrollment APIs")
@RestController
@RequestMapping("/enrollments")
public class EnrollmentController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private EnrollmentService enrollmentService;

    @Operation(summary = "Enroll the logged-in student in a course")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping
    public ResponseEntity<EnrollmentResponse> addEnrollment(@Valid @RequestBody EnrollmentRequest enrollmentRequest) {
        return new ResponseEntity<>(enrollmentService.addEnrollment(enrollmentRequest), HttpStatus.CREATED);
    }

    @Operation(summary = "Get my enrollments")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/my")
    public ResponseEntity<List<EnrollmentResponse>> getMyEnrollments() {
        return ResponseEntity.ok(enrollmentService.getMyEnrollments());
    }

    @Operation(summary = "Get Enrollment By StudentId")
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<EnrollmentResponse>> getEnrollment(@PathVariable Integer studentId) {
        return ResponseEntity.ok(enrollmentService.getEnrollmentByStudentId(studentId));
    }

    @Operation(summary = "Download the students of a course with their progress (Excel)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/course/{courseId}/export")
    public ResponseEntity<byte[]> exportCourseStudents(@PathVariable Integer courseId) {
        return reportService.courseStudents(courseId).toResponse();
    }

    @Operation(summary = "Students of a course with name, email and progress (teacher)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/course/{courseId}/students")
    public ResponseEntity<List<CourseStudentResponse>> getCourseStudents(@PathVariable Integer courseId) {
        return ResponseEntity.ok(enrollmentService.getCourseStudents(courseId));
    }

    @Operation(summary = "Get Enrollment By CourseId")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<EnrollmentResponse>> getEnrollmentByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(enrollmentService.getEnrollmentByCourseId(courseId));
    }
}
