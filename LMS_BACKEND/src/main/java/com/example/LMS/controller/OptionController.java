package com.example.LMS.controller;

import com.example.LMS.DTO.OptionRequest;
import com.example.LMS.DTO.OptionResponse;
import com.example.LMS.service.OptionService;
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

// Options are created together with their question (POST /question), so there is no create endpoint here.
@Tag(name = "Option APIs")
@RestController
@RequestMapping("/option")
@PreAuthorize("hasAnyRole('TEACHER','ADMIN')") // applies to every method in this class
public class OptionController {

    @Autowired
    private OptionService optionService;

    @Operation(summary = "Update Option By Id")
    @PutMapping("/{id}")
    public ResponseEntity<OptionResponse> updateOption(@PathVariable Integer id, @Valid @RequestBody OptionRequest optionRequest) {
        return ResponseEntity.ok(optionService.updateOption(id, optionRequest));
    }

    @Operation(summary = "Delete Option By Id")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteOption(@PathVariable Integer id) {
        optionService.deleteOption(id);
        return ResponseEntity.ok(Map.of("message", "Option deleted"));
    }

    @Operation(summary = "Get Options By QuestionId")
    @GetMapping("/question/{questionId}")
    public ResponseEntity<List<OptionResponse>> getOptionByQuestionId(@PathVariable Integer questionId) {
        return ResponseEntity.ok(optionService.getOptionByQuestionId(questionId));
    }
}
