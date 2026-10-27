package com.example.LMS.controller;

import com.example.LMS.DTO.FileResponse;
import com.example.LMS.model.FilePurpose;
import com.example.LMS.model.MediaFile;
import com.example.LMS.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Tag(name = "File APIs")
@RestController
@RequestMapping("/files")
public class FileController {

    @Autowired
    private FileService fileService;

    // multipart/form-data with two fields: file and purpose.
    @Operation(summary = "Upload a file. purpose: COURSE_THUMBNAIL, AVATAR, LESSON_VIDEO, LESSON_PDF, ASSIGNMENT_FILE")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(@RequestParam("file") MultipartFile file,
                                               @RequestParam("purpose") FilePurpose purpose) {
        return new ResponseEntity<>(fileService.upload(file, purpose), HttpStatus.CREATED);
    }

    @Operation(summary = "File details and a fresh link (checks that you may open it)")
    @GetMapping("/{id}")
    public ResponseEntity<FileResponse> getFile(@PathVariable Integer id) {
        return ResponseEntity.ok(fileService.getFile(id));
    }

    // Open to everyone in SecurityConfiguration: public files need nothing, private files need ?token=.
    // Returning a Resource lets Spring answer "Range" requests, so videos can seek without downloading everything.
    @Operation(summary = "The file bytes (used directly in <img>, <video>, <iframe>)")
    @GetMapping("/{id}/content")
    public ResponseEntity<Resource> content(@PathVariable Integer id, @RequestParam(required = false) String token,
                                            @RequestParam(defaultValue = "false") boolean download) {
        MediaFile file = fileService.checkContentAccess(id, token);
        // Cloud storage (Cloudinary): send the browser to a signed CDN link after the access check.
        String direct = fileService.directUrl(file, download);
        if (direct != null) {
            return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, direct).build();
        }
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(file.getOriginalName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(fileService.load(file));
    }

    @Operation(summary = "Delete my file (if no lesson or submission uses it)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Integer id) {
        fileService.delete(id);
        return ResponseEntity.ok(Map.of("message", "File deleted"));
    }
}
