package com.example.LMS.report;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;

// A generated file (Excel or PDF) ready to send as a download.
public record ReportFile(byte[] bytes, String fileName, MediaType type) {

    public static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    public ResponseEntity<byte[]> toResponse() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(type);
        headers.setContentDisposition(ContentDisposition.attachment().filename(fileName, StandardCharsets.UTF_8).build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    // "Spring Boot basics quiz" -> "spring-boot-basics-quiz"
    public static String slug(String text) {
        String s = text == null ? "" : text.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return s.isEmpty() ? "report" : (s.length() > 60 ? s.substring(0, 60) : s);
    }
}
