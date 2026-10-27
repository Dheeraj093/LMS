package com.example.LMS.controller;

import com.example.LMS.DTO.GroupRequest;
import com.example.LMS.DTO.GroupResponse;
import com.example.LMS.service.GroupService;
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

@Tag(name = "Student Group APIs")
@RestController
@RequestMapping("/groups")
public class GroupController {

    @Autowired
    private GroupService groupService;

    @Operation(summary = "My groups (teacher: own, admin: all)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<GroupResponse>> getGroups() {
        return ResponseEntity.ok(groupService.getGroups());
    }

    @Operation(summary = "Create a group: { name, description, memberIds }")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody GroupRequest request) {
        return new ResponseEntity<>(groupService.createGroup(request), HttpStatus.CREATED);
    }

    @Operation(summary = "Groups I am in (student)")
    @GetMapping("/my")
    public ResponseEntity<List<GroupResponse>> getMyGroups() {
        return ResponseEntity.ok(groupService.getMyGroups());
    }

    @Operation(summary = "Groups of a student (the student themself, their teacher, or an admin)")
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<GroupResponse>> getGroupsOfStudent(@PathVariable Integer studentId) {
        return ResponseEntity.ok(groupService.getGroupsOfStudent(studentId));
    }

    @Operation(summary = "One group (teacher/admin: with members, member student: short view)")
    @GetMapping("/{id}")
    public ResponseEntity<GroupResponse> getGroup(@PathVariable Integer id) {
        return ResponseEntity.ok(groupService.getGroup(id));
    }

    @Operation(summary = "Update a group (memberIds replaces the whole member list)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<GroupResponse> updateGroup(@PathVariable Integer id, @Valid @RequestBody GroupRequest request) {
        return ResponseEntity.ok(groupService.updateGroup(id, request));
    }

    @Operation(summary = "Delete a group")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteGroup(@PathVariable Integer id) {
        groupService.deleteGroup(id);
        return ResponseEntity.ok(Map.of("message", "Group deleted"));
    }
}
