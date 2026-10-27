package com.example.LMS.controller;

import com.example.LMS.DTO.LessonProgressRequest;
import com.example.LMS.DTO.LessonProgressResponse;
import com.example.LMS.DTO.StudyTimeRequest;
import com.example.LMS.service.LessonProgressService;
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

@Tag(name = "LessonProgress APIs")
@RestController
@RequestMapping("/progress")
public class LessonProgressController {

    @Autowired
    private LessonProgressService lessonProgressService;

    @Operation(summary = "Mark a lesson as completed for the logged-in student")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping
    public ResponseEntity<Map<String, String>> addLessonProgress(@Valid @RequestBody LessonProgressRequest lessonProgressRequest) {
        lessonProgressService.addLessonProgress(lessonProgressRequest);
        return ResponseEntity.ok(Map.of("message", "Lesson Completed Successfully"));
    }

    @Operation(summary = "Mark a lesson complete (returns my progress in that course)")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/lessons/{lessonId}/complete")
    public ResponseEntity<LessonProgressResponse> completeLesson(@PathVariable Integer lessonId) {
        return ResponseEntity.ok(lessonProgressService.completeLesson(lessonId));
    }

    @Operation(summary = "Add study time for a lesson (send every minute while the lesson is open)")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/lessons/{lessonId}/time")
    public ResponseEntity<Map<String, String>> addStudyTime(@PathVariable Integer lessonId, @Valid @RequestBody StudyTimeRequest request) {
        lessonProgressService.addStudyTime(lessonId, request.seconds());
        return ResponseEntity.ok(Map.of("message", "Saved"));
    }

    @Operation(summary = "Get my progress in a course")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/course/{courseId}")
    public ResponseEntity<LessonProgressResponse> getLessonProgress(@PathVariable Integer courseId) {
        return ResponseEntity.ok(lessonProgressService.getLessonProgress(courseId));
    }
}
