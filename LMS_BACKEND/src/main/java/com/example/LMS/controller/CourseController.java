package com.example.LMS.controller;

import com.example.LMS.DTO.CourseRequest;
import com.example.LMS.DTO.CourseResponse;
import com.example.LMS.DTO.CourseStructureRequest;
import com.example.LMS.DTO.CurriculumResponse;
import com.example.LMS.DTO.PageResponse;
import com.example.LMS.DTO.ReviewRequest;
import com.example.LMS.DTO.ReviewResponse;
import com.example.LMS.service.CourseService;
import com.example.LMS.service.ReviewService;
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

@Tag(name = "Course APIs")
@RestController
@RequestMapping("/courses")
public class CourseController {

    @Autowired
    private CourseService courseService;

    @Autowired
    private ReviewService reviewService;

    @Operation(summary = "Create Course")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<CourseResponse> addCourse(@Valid @RequestBody CourseRequest courseRequest) {
        return new ResponseEntity<>(courseService.addCourse(courseRequest), HttpStatus.CREATED);
    }

    @Operation(summary = "Get courses (teacher: own, admin: all)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<CourseResponse>> getAllCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }

    // The student catalog. The frontend already called these two URLs, but they did not exist.
    @Operation(summary = "Get published courses (catalog). Optional: search, categoryId")
    @GetMapping("/published")
    public ResponseEntity<List<CourseResponse>> getPublishedCourses(@RequestParam(required = false) String search,
                                                                    @RequestParam(required = false) Integer categoryId) {
        return ResponseEntity.ok(courseService.getPublishedCourses(search, categoryId));
    }

    @Operation(summary = "Catalog one page at a time: search, categoryId, page (from 0), size")
    @GetMapping("/catalog")
    public ResponseEntity<PageResponse<CourseResponse>> getCatalog(@RequestParam(required = false) String search,
                                                                   @RequestParam(required = false) Integer categoryId,
                                                                   @RequestParam(defaultValue = "0") int page,
                                                                   @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(courseService.getCatalogPage(search, categoryId, page, size));
    }

    @Operation(summary = "Modules and lessons in order, with my progress (one call for the course page and player)")
    @GetMapping("/{id}/curriculum")
    public ResponseEntity<CurriculumResponse> getCurriculum(@PathVariable Integer id) {
        return ResponseEntity.ok(courseService.getCurriculum(id));
    }

    @Operation(summary = "Save the course builder tree: module order and lesson order")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}/structure")
    public ResponseEntity<CurriculumResponse> updateStructure(@PathVariable Integer id, @Valid @RequestBody CourseStructureRequest request) {
        return ResponseEntity.ok(courseService.updateStructure(id, request));
    }

    @Operation(summary = "Reviews of a course")
    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ReviewResponse>> getReviews(@PathVariable Integer id) {
        return ResponseEntity.ok(reviewService.getReviews(id));
    }

    @Operation(summary = "Add or update my review (enrolled student)")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/{id}/reviews")
    public ResponseEntity<ReviewResponse> addReview(@PathVariable Integer id, @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.addOrUpdate(id, request));
    }

    @Operation(summary = "Get one published course")
    @GetMapping("/published/{id}")
    public ResponseEntity<CourseResponse> getPublishedCourseById(@PathVariable Integer id) {
        return ResponseEntity.ok(courseService.getPublishedCourseById(id));
    }

    @Operation(summary = "Get Course By Id (owner or admin)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<CourseResponse> getCourseById(@PathVariable Integer id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    @Operation(summary = "Update Course By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<CourseResponse> updateCourse(@PathVariable Integer id, @Valid @RequestBody CourseRequest courseRequest) {
        return ResponseEntity.ok(courseService.updateCourse(id, courseRequest));
    }

    @Operation(summary = "Delete Course By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCourse(@PathVariable Integer id) {
        courseService.deleteCourse(id);
        return ResponseEntity.ok(Map.of("message", "Course deleted successfully"));
    }
}
