package com.example.LMS.controller;

import com.example.LMS.DTO.ModuleRequest;
import com.example.LMS.DTO.ModuleResponse;
import com.example.LMS.service.ModuleService;
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

@Tag(name = "Module APIs")
@RestController
@RequestMapping("/modules")
public class ModuleController {

    @Autowired
    private ModuleService moduleService;

    @Operation(summary = "Create Module")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PostMapping
    public ResponseEntity<ModuleResponse> addModule(@Valid @RequestBody ModuleRequest moduleRequest,
                                                    @RequestParam(required = false) Integer ownerId) {
        return new ResponseEntity<>(moduleService.addModule(moduleRequest, ownerId), HttpStatus.CREATED);
    }

    @Operation(summary = "Get modules (teacher: own, admin: all)")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<ModuleResponse>> getAllModule() {
        return ResponseEntity.ok(moduleService.getAllModule());
    }

    @Operation(summary = "Get Module By Id")
    @GetMapping("/{id}")
    public ResponseEntity<ModuleResponse> getModuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(moduleService.getModuleById(id));
    }

    @Operation(summary = "Update Module By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ModuleResponse> updateModule(@PathVariable Integer id, @Valid @RequestBody ModuleRequest moduleRequest) {
        return ResponseEntity.ok(moduleService.updateModule(id, moduleRequest));
    }

    @Operation(summary = "Delete Module By Id")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteModule(@PathVariable Integer id) {
        moduleService.deleteModule(id);
        return ResponseEntity.ok(Map.of("message", "Module Deleted Successfully"));
    }

    @Operation(summary = "Get Modules By CourseId")
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<ModuleResponse>> getAllModuleByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(moduleService.getAllModuleByCourse(courseId));
    }
}
