package com.example.LMS.controller;

import com.example.LMS.DTO.LessonCopyRequest;
import com.example.LMS.DTO.LessonLibraryResponse;
import com.example.LMS.DTO.LessonRequest;
import com.example.LMS.DTO.LessonUsage;
import com.example.LMS.DTO.LessonResponse;
import com.example.LMS.service.LessonService;
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

@Tag(name = "Lesson APIs")
@RestController
@RequestMapping("/lessons")
public class LessonController {

    @Autowired
    LessonService lessonService;

    @Operation(summary = "Create Lesson")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<LessonResponse> addLesson(@Valid @RequestBody LessonRequest lessonRequest,
                                                    @RequestParam(required = false) Integer ownerId) {
        return new ResponseEntity<>(lessonService.addLesson(lessonRequest, ownerId), HttpStatus.CREATED);
    }

    @Operation(summary = "Get lessons (teacher: own, admin: all)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<LessonResponse>> getAllLessons() {
        return ResponseEntity.ok(lessonService.getAllLessons());
    }

    @Operation(summary = "Lesson library: my lessons with the courses that use each one (admin: all lessons)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/library")
    public ResponseEntity<List<LessonLibraryResponse>> getLibrary() {
        return ResponseEntity.ok(lessonService.getLibrary());
    }

    @Operation(summary = "Where a lesson is used (courses and modules)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}/usage")
    public ResponseEntity<List<LessonUsage>> getUsage(@PathVariable Integer id) {
        return ResponseEntity.ok(lessonService.getUsage(id));
    }

    @Operation(summary = "Copy a lesson; with moduleId the copy replaces the original in that module only")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping("/{id}/copy")
    public ResponseEntity<LessonResponse> copyLesson(@PathVariable Integer id, @RequestBody(required = false) LessonCopyRequest request) {
        return new ResponseEntity<>(lessonService.copyLesson(id, request == null ? null : request.moduleId()), HttpStatus.CREATED);
    }

    @Operation(summary = "Get Lesson By Id")
    @GetMapping("/{id}")
    public ResponseEntity<LessonResponse> getLessonById(@PathVariable Integer id) {
        return ResponseEntity.ok(lessonService.getLessonById(id));
    }

    @Operation(summary = "Update Lesson By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<LessonResponse> updateLesson(@PathVariable Integer id, @Valid @RequestBody LessonRequest lessonRequest) {
        return ResponseEntity.ok(lessonService.updateLesson(id, lessonRequest));
    }

    @Operation(summary = "Delete Lesson By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteLesson(@PathVariable Integer id) {
        lessonService.deleteLesson(id);
        return ResponseEntity.ok(Map.of("message", "Lesson deleted successfully"));
    }

    @Operation(summary = "Get Lessons By ModuleId")
    @GetMapping("/modules/{moduleId}")
    public ResponseEntity<List<LessonResponse>> getLessonsByModuleId(@PathVariable Integer moduleId) {
        return ResponseEntity.ok(lessonService.getLessonsByModuleId(moduleId));
    }
}
