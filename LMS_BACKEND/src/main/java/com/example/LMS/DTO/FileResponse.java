package com.example.LMS.DTO;

import com.example.LMS.model.FilePurpose;

import java.time.LocalDateTime;

// url is relative to the API base URL, for example "/files/12/content?token=...".
// Private files get a token that expires (linkExpiresAt); ask GET /files/{id} again for a fresh link.
public record FileResponse(
        Integer id,
        FilePurpose purpose,
        String originalName,
        String contentType,
        Long sizeBytes,
        String url,
        LocalDateTime linkExpiresAt
) {
}
