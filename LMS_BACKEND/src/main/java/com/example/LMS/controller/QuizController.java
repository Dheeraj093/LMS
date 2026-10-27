package com.example.LMS.controller;

import com.example.LMS.DTO.QuizRequest;
import com.example.LMS.DTO.QuizResponse;
import com.example.LMS.DTO.QuizStartResponse;
import com.example.LMS.service.QuizAttemptService;
import com.example.LMS.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.example.LMS.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Quiz APIs")
@RestController
@RequestMapping("/quiz")
public class QuizController {

    @Autowired
    private QuizService quizService;

    @Autowired
    private QuizAttemptService quizAttemptService;

    @Autowired
    private ReportService reportService;

    @Operation(summary = "Download quiz results with every submitted attempt (format=xlsx or pdf)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}/results/export")
    public ResponseEntity<byte[]> exportResults(@PathVariable Integer id, @RequestParam(defaultValue = "xlsx") String format) {
        return reportService.quizResults(id, format).toResponse();
    }

    @Operation(summary = "Create Quiz")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<QuizResponse> addQuiz(@Valid @RequestBody QuizRequest quizRequest) {
        return new ResponseEntity<>(quizService.addQuiz(quizRequest), HttpStatus.CREATED);
    }

    @Operation(summary = "Get quizzes (teacher: own, admin: all)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<QuizResponse>> getAllQuiz() {
        return ResponseEntity.ok(quizService.getAllQuiz());
    }

    @Operation(summary = "Get Quiz By Id (owner or admin)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<QuizResponse> getQuizById(@PathVariable Integer id) {
        return ResponseEntity.ok(quizService.getQuizById(id));
    }

    @Operation(summary = "Quizzes I can take (student): joined courses, my groups and join codes I used")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/my")
    public ResponseEntity<List<QuizResponse>> getMyQuizzes() {
        return ResponseEntity.ok(quizService.getMyQuizzes());
    }

    // The /join page calls this with the code the teacher shared.
    @Operation(summary = "Find a quiz by its join code (and, for a LINK quiz, get access to it)")
    @GetMapping("/join/{code}")
    public ResponseEntity<QuizResponse> joinByCode(@PathVariable String code) {
        return ResponseEntity.ok(quizService.joinByCode(code));
    }

    // The student quiz page already called this URL, but it did not exist.
    @Operation(summary = "Get a quiz to take (enrolled student)")
    @GetMapping("/{id}/public")
    public ResponseEntity<QuizResponse> getQuizForStudent(@PathVariable Integer id) {
        return ResponseEntity.ok(quizService.getQuizForStudent(id));
    }

    @Operation(summary = "Start (or resume) a quiz: returns questions without answers and the server deadline")
    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/{id}/start")
    public ResponseEntity<QuizStartResponse> startQuiz(@PathVariable Integer id) {
        return ResponseEntity.ok(quizAttemptService.startQuiz(id));
    }

    @Operation(summary = "Update Quiz By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<QuizResponse> updateQuiz(@PathVariable Integer id, @Valid @RequestBody QuizRequest quizRequest) {
        return ResponseEntity.ok(quizService.updateQuiz(id, quizRequest));
    }

    @Operation(summary = "Delete Quiz By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteQuizById(@PathVariable Integer id) {
        quizService.deleteQuizById(id);
        return ResponseEntity.ok(Map.of("message", "Quiz Deleted Successfully"));
    }

    @Operation(summary = "Get Quizzes By CourseId")
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<QuizResponse>> getAllQuizByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(quizService.getAllQuizByCourse(courseId));
    }
}
