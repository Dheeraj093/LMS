package com.example.LMS.controller;

import com.example.LMS.DTO.CourseResponse;
import com.example.LMS.DTO.PageResponse;
import com.example.LMS.DTO.UserResponse;
import com.example.LMS.DTO.UserRoleRequest;
import com.example.LMS.DTO.UserStatusRequest;
import com.example.LMS.model.UserStatus;
import com.example.LMS.service.AdminUserService;
import com.example.LMS.service.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.example.LMS.service.ReportService;
import com.example.LMS.DTO.AdminCreateUserRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Admin APIs")
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')") // every method in this class is admin only
public class AdminController {

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private ReportService reportService;

    @Operation(summary = "Add a user (any role). The account is active at once.")
    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return new ResponseEntity<>(adminUserService.createUser(request), HttpStatus.CREATED);
    }

    @Operation(summary = "Download users as Excel (same filters as the list)")
    @GetMapping("/users/export")
    public ResponseEntity<byte[]> exportUsers(@RequestParam(required = false) String role,
                                              @RequestParam(required = false) UserStatus status,
                                              @RequestParam(required = false) String search) {
        return reportService.users(role, status, search).toResponse();
    }

    @Operation(summary = "Users with optional filters: role (ADMIN/TEACHER/STUDENT), status, search; paged")
    @GetMapping("/users")
    public ResponseEntity<PageResponse<UserResponse>> listUsers(@RequestParam(required = false) String role,
                                                                @RequestParam(required = false) UserStatus status,
                                                                @RequestParam(required = false) String search,
                                                                @RequestParam(defaultValue = "0") int page,
                                                                @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminUserService.listUsers(role, status, search, page, size));
    }

    @Operation(summary = "One user")
    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.getUser(id));
    }

    @Operation(summary = "Approve a pending teacher")
    @PatchMapping("/users/{id}/approve")
    public ResponseEntity<UserResponse> approve(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.approve(id));
    }

    @Operation(summary = "Block / unblock a user")
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> setStatus(@PathVariable Integer id, @Valid @RequestBody UserStatusRequest request) {
        return ResponseEntity.ok(adminUserService.setStatus(id, request.status()));
    }

    @Operation(summary = "Change a user's role")
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserResponse> setRole(@PathVariable Integer id, @Valid @RequestBody UserRoleRequest request) {
        return ResponseEntity.ok(adminUserService.setRole(id, request.roleId(), request.role()));
    }

    @Operation(summary = "Every course from every teacher")
    @GetMapping("/courses")
    public ResponseEntity<List<CourseResponse>> allCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }
}
