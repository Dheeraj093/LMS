package com.example.LMS.service;

import com.example.LMS.DTO.FileResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.AssignmentSubmission;
import com.example.LMS.model.FilePurpose;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.MediaFile;
import com.example.LMS.model.User;
import com.example.LMS.config.JwtService;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.LessonRepository;
import com.example.LMS.repository.MediaFileRepository;
import com.example.LMS.storage.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

// Upload, check and serve files (thumbnails, avatars, lesson videos and PDFs, assignment files).
@Service
public class FileService {

    private static final long MB = 1024L * 1024L;

    @Autowired
    private MediaFileRepository mediaFileRepository;

    @Autowired
    private StorageService storageService;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private JwtService jwtService;

    @Value("${app.files.max-video-mb:500}")
    private long maxVideoMb;

    public FileResponse upload(MultipartFile file, FilePurpose purpose) {
        User user = currentUserService.getCurrentUser();
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose a file to upload");
        }
        checkCanUpload(user, purpose);

        if (file.getSize() > maxBytes(purpose)) {
            throw new BadRequestException("File is too big. The limit for " + purpose + " is " + (maxBytes(purpose) / MB) + " MB");
        }

        String originalName = cleanName(file.getOriginalFilename());
        // Look at the first bytes of the file, not only the name: a ".exe" renamed to ".pdf" is refused.
        String detectedType = detectType(file, originalName);
        if (detectedType == null || !allowedTypes(purpose).contains(detectedType)) {
            throw new BadRequestException("This file type is not allowed for " + purpose + ". Allowed: " + allowedTypes(purpose));
        }

        String key = purpose.name().toLowerCase(Locale.ROOT) + "/" + LocalDate.now().getYear() + "/"
                + String.format("%02d", LocalDate.now().getMonthValue()) + "/" + UUID.randomUUID() + extensionFor(detectedType);
        try (InputStream in = file.getInputStream()) {
            storageService.save(key, in);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not save the file", ex);
        }

        MediaFile media = new MediaFile();
        media.setOwner(user);
        media.setPurpose(purpose);
        media.setStorageKey(key);
        media.setOriginalName(originalName);
        media.setContentType(detectedType);
        media.setSizeBytes(file.getSize());
        return toResponse(mediaFileRepository.save(media));
    }

    // Metadata plus a fresh link, after checking the user may see this file.
    public FileResponse getFile(Integer id) {
        MediaFile file = findFile(id);
        if (!file.getPurpose().isPublic() && !canView(currentUserService.getCurrentUser(), file)) {
            throw new UnauthorizedAccessException("You are not allowed to open this file");
        }
        return toResponse(file);
    }

    // Used by GET /files/{id}/content. Public files need nothing; private files need a valid link token.
    public MediaFile checkContentAccess(Integer id, String token) {
        MediaFile file = findFile(id);
        if (!file.getPurpose().isPublic() && (token == null || !jwtService.isValidFileToken(token, id))) {
            throw new UnauthorizedAccessException("This link is invalid or has expired. Open the page again to get a new one");
        }
        return file;
    }

    public Resource load(MediaFile file) {
        return storageService.load(file.getStorageKey());
    }

    // A direct cloud link (Cloudinary), or null when this API serves the bytes itself.
    public String directUrl(MediaFile file, boolean download) {
        return storageService.directUrl(file.getStorageKey(), download);
    }

    public void delete(Integer id) {
        MediaFile file = findFile(id);
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, file.getOwner())) {
            throw new UnauthorizedAccessException("Only the person who uploaded this file can delete it");
        }
        if (!lessonRepository.findByVideoFileOrPdfFile(file, file).isEmpty()
                || !assignmentSubmissionRepository.findByFilesContaining(file).isEmpty()) {
            throw new BadRequestException("This file is still used by a lesson or a submission");
        }
        mediaFileRepository.delete(file);
        storageService.delete(file.getStorageKey());
    }

    // Used by other services when a request carries a file id (lesson video, submission file, ...).
    public MediaFile requireOwnFile(Integer id, FilePurpose purpose) {
        if (id == null) {
            return null;
        }
        MediaFile file = findFile(id);
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, file.getOwner())) {
            throw new UnauthorizedAccessException("File " + id + " was uploaded by someone else");
        }
        if (file.getPurpose() != purpose) {
            throw new BadRequestException("File " + id + " was uploaded as " + file.getPurpose() + ", not " + purpose);
        }
        return file;
    }

    // Public files get a plain link; private files get a link with a short-lived token.
    public String linkFor(MediaFile file) {
        if (file == null) {
            return null;
        }
        String base = "/files/" + file.getId() + "/content";
        return file.getPurpose().isPublic() ? base : base + "?token=" + jwtService.generateFileToken(file.getId());
    }

    public FileResponse toResponse(MediaFile file) {
        return new FileResponse(file.getId(), file.getPurpose(), file.getOriginalName(), file.getContentType(),
                file.getSizeBytes(), linkFor(file), file.getPurpose().isPublic() ? null : jwtService.fileLinkExpiry());
    }

    private boolean canView(User user, MediaFile file) {
        if (currentUserService.isAdminOrOwner(user, file.getOwner())) {
            return true;
        }
        switch (file.getPurpose()) {
            case LESSON_VIDEO, LESSON_PDF -> {
                for (Lesson lesson : lessonRepository.findByVideoFileOrPdfFile(file, file)) {
                    if (accessService.canViewLesson(user, lesson)) {
                        return true;
                    }
                }
                return false;
            }
            case ASSIGNMENT_FILE -> {
                for (AssignmentSubmission s : assignmentSubmissionRepository.findByFilesContaining(file)) {
                    if (s.getStudent().getId().equals(user.getId())
                            || currentUserService.isAdminOrOwner(user, s.getAssignment().getCourse().getTeacher())) {
                        return true;
                    }
                }
                return false;
            }
            default -> {
                return true;
            }
        }
    }

    private void checkCanUpload(User user, FilePurpose purpose) {
        boolean teacherOrAdmin = currentUserService.isTeacher(user) || currentUserService.isAdmin(user);
        switch (purpose) {
            case COURSE_THUMBNAIL, LESSON_VIDEO, LESSON_PDF -> {
                if (!teacherOrAdmin) {
                    throw new UnauthorizedAccessException("Only teachers can upload course and lesson files");
                }
            }
            case ASSIGNMENT_FILE -> {
                if (!currentUserService.isStudent(user)) {
                    throw new UnauthorizedAccessException("Only students upload assignment files");
                }
            }
            default -> { }
        }
    }

    private long maxBytes(FilePurpose purpose) {
        return switch (purpose) {
            case COURSE_THUMBNAIL, AVATAR -> 5 * MB;
            case LESSON_PDF -> 25 * MB;
            case ASSIGNMENT_FILE -> 20 * MB;
            case LESSON_VIDEO -> maxVideoMb * MB;
        };
    }

    private Set<String> allowedTypes(FilePurpose purpose) {
        return switch (purpose) {
            case COURSE_THUMBNAIL, AVATAR -> Set.of("image/jpeg", "image/png", "image/webp");
            case LESSON_PDF -> Set.of("application/pdf");
            case LESSON_VIDEO -> Set.of("video/mp4", "video/webm");
            case ASSIGNMENT_FILE -> Set.of("application/pdf", "image/jpeg", "image/png", "application/zip",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        };
    }

    // Reads the "magic bytes" at the start of the file. Each format starts with a fixed signature.
    private String detectType(MultipartFile file, String name) {
        byte[] head = new byte[16];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(head, 0, head.length);
        } catch (IOException ex) {
            return null;
        }
        head = Arrays.copyOf(head, read);
        if (startsWith(head, 0xFF, 0xD8, 0xFF)) return "image/jpeg";
        if (startsWith(head, 0x89, 'P', 'N', 'G')) return "image/png";
        if (startsWith(head, 'R', 'I', 'F', 'F') && read >= 12 && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P') return "image/webp";
        if (startsWith(head, '%', 'P', 'D', 'F')) return "application/pdf";
        if (read >= 8 && head[4] == 'f' && head[5] == 't' && head[6] == 'y' && head[7] == 'p') return "video/mp4";
        if (startsWith(head, 0x1A, 0x45, 0xDF, 0xA3)) return "video/webm";
        if (startsWith(head, 'P', 'K', 0x03, 0x04)) {
            // .docx files are zip files inside, so use the name to tell them apart.
            return name.toLowerCase(Locale.ROOT).endsWith(".docx")
                    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    : "application/zip";
        }
        return null;
    }

    private boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if ((data[i] & 0xFF) != signature[i]) return false;
        }
        return true;
    }

    private String extensionFor(String type) {
        return switch (type) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            case "application/zip" -> ".zip";
            default -> ".docx";
        };
    }

    // Keep only the file name part and safe characters.
    private String cleanName(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        String base = name.replace("\\", "/");
        base = base.substring(base.lastIndexOf('/') + 1);
        base = base.replaceAll("[^A-Za-z0-9._ -]", "_");
        return base.length() > 150 ? base.substring(base.length() - 150) : base;
    }

    private MediaFile findFile(Integer id) {
        return mediaFileRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("File not found with id " + id));
    }

    public List<MediaFile> requireOwnFiles(List<Integer> ids, FilePurpose purpose) {
        if (ids == null) {
            return List.of();
        }
        return ids.stream().distinct().map(id -> requireOwnFile(id, purpose)).toList();
    }
}
