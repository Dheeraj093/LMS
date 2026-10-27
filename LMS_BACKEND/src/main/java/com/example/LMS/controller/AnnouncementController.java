package com.example.LMS.controller;

import com.example.LMS.DTO.AnnouncementRequest;
import com.example.LMS.DTO.AnnouncementResponse;
import com.example.LMS.service.AnnouncementService;
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

@Tag(name = "Announcement APIs")
@RestController
public class AnnouncementController {

    @Autowired
    private AnnouncementService announcementService;

    @Operation(summary = "Post an announcement to a course (course teacher or admin); enrolled students are notified")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping("/courses/{courseId}/announcements")
    public ResponseEntity<AnnouncementResponse> create(@PathVariable Integer courseId, @Valid @RequestBody AnnouncementRequest request) {
        return new ResponseEntity<>(announcementService.create(courseId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Announcements of a course, pinned first then newest (enrolled students, course teacher, admin)")
    @GetMapping("/courses/{courseId}/announcements")
    public ResponseEntity<List<AnnouncementResponse>> getByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(announcementService.getByCourse(courseId));
    }

    @Operation(summary = "My announcements (student: joined courses, teacher: own courses, admin: all)")
    @GetMapping("/announcements/my")
    public ResponseEntity<List<AnnouncementResponse>> getMine() {
        return ResponseEntity.ok(announcementService.getMine());
    }

    @Operation(summary = "Edit an announcement (course teacher or admin)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/announcements/{id}")
    public ResponseEntity<AnnouncementResponse> update(@PathVariable Integer id, @Valid @RequestBody AnnouncementRequest request) {
        return ResponseEntity.ok(announcementService.update(id, request));
    }

    @Operation(summary = "Delete an announcement (course teacher or admin)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Integer id) {
        announcementService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Announcement deleted"));
    }
}
