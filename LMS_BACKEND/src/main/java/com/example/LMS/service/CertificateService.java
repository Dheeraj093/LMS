package com.example.LMS.service;

import com.example.LMS.DTO.CertificateResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.model.Certificate;
import com.example.LMS.model.Course;
import com.example.LMS.model.User;
import com.example.LMS.repository.CertificateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CertificateService {

    // No 0/O or 1/I, so a code read from paper is not mistyped.
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private CertificateRepository certificateRepository;

    @Autowired
    private CurrentUserService currentUserService;

    // Called when a student finishes every lesson of a course. Issuing twice does nothing.
    public Certificate issue(User student, Course course) {
        if (certificateRepository.existsByStudentAndCourse(student, course)) {
            return null;
        }
        Certificate certificate = new Certificate();
        certificate.setStudent(student);
        certificate.setCourse(course);
        certificate.setIssuedAt(LocalDateTime.now());
        String code;
        do {
            code = randomCode();
        } while (certificateRepository.findByCode(code) != null);
        certificate.setCode(code);
        return certificateRepository.save(certificate);
    }

    public List<CertificateResponse> getMyCertificates() {
        User student = currentUserService.getCurrentUser();
        return certificateRepository.findByStudentOrderByIssuedAtDesc(student).stream().map(this::toResponse).toList();
    }

    // Public: an employer can check a certificate code without logging in.
    public CertificateResponse verify(String code) {
        Certificate certificate = certificateRepository.findByCode(code.trim().toUpperCase());
        if (certificate == null) {
            throw new ResourseNotFoundException("No certificate with code " + code);
        }
        return toResponse(certificate);
    }

    private CertificateResponse toResponse(Certificate c) {
        Course course = c.getCourse();
        return new CertificateResponse(c.getId(), c.getCode(), c.getStudent().getName(), course.getId(), course.getTitle(),
                course.getTeacher() != null ? course.getTeacher().getName() : null, c.getIssuedAt());
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder("LMS-");
        for (int i = 0; i < 8; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
