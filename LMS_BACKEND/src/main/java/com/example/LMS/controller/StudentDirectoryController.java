package com.example.LMS.controller;

import com.example.LMS.DTO.StudentSummary;
import com.example.LMS.service.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// The group pages call GET /users/students to fill the member picker.
@Tag(name = "User directory APIs")
@RestController
@RequestMapping("/users")
public class StudentDirectoryController {

    @Autowired
    private GroupService groupService;

    @Operation(summary = "Active students (id, name, email) for pickers. Optional search on name or email")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/students")
    public ResponseEntity<List<StudentSummary>> getStudents(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(groupService.getStudents(search));
    }
}
