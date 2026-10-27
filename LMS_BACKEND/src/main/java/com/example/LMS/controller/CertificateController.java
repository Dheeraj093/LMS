package com.example.LMS.controller;

import com.example.LMS.DTO.CertificateResponse;
import com.example.LMS.service.CertificateService;
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

@Tag(name = "Certificate APIs")
@RestController
@RequestMapping("/certificates")
public class CertificateController {

    @Autowired
    private CertificateService certificateService;

    @Operation(summary = "My certificates")
    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/my")
    public ResponseEntity<List<CertificateResponse>> getMine() {
        return ResponseEntity.ok(certificateService.getMyCertificates());
    }

    // Public (no login), so anyone can check a certificate code.
    @Operation(summary = "Check a certificate code")
    @GetMapping("/verify/{code}")
    public ResponseEntity<CertificateResponse> verify(@PathVariable String code) {
        return ResponseEntity.ok(certificateService.verify(code));
    }
}
