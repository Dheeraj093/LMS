package com.example.LMS.controller;

import com.example.LMS.DTO.DashboardDtos;
import com.example.LMS.service.DashboardService;
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

// One call per dashboard. range: 30d, 12w, 6m, 1y.
@Tag(name = "Dashboard APIs")
@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Operation(summary = "Student dashboard stats")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/student")
    public ResponseEntity<DashboardDtos.StudentDashboard> student(@RequestParam(defaultValue = "30d") String range) {
        return ResponseEntity.ok(dashboardService.student(range));
    }

    @Operation(summary = "Teacher dashboard stats")
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/teacher")
    public ResponseEntity<DashboardDtos.TeacherDashboard> teacher(@RequestParam(defaultValue = "12w") String range) {
        return ResponseEntity.ok(dashboardService.teacher(range));
    }

    @Operation(summary = "Admin dashboard stats")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<DashboardDtos.AdminDashboard> admin(@RequestParam(defaultValue = "30d") String range) {
        return ResponseEntity.ok(dashboardService.admin(range));
    }
}
