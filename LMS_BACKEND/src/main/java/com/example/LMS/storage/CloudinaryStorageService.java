package com.example.LMS.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.example.LMS.exception.ResourseNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

// Keeps uploaded files in Cloudinary (app.storage.type=cloudinary).
// Files are uploaded as "authenticated": they cannot be opened with a plain Cloudinary link.
// The API still checks who may open a file (GET /files/{id}/content) and then redirects the browser
// to a signed Cloudinary link, so images, PDFs and videos load straight from Cloudinary's CDN.
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "cloudinary")
public class CloudinaryStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryStorageService.class);
    private static final Set<String> IMAGE_EXT = Set.of("jpg", "jpeg", "png", "gif", "webp", "svg");
    private static final Set<String> VIDEO_EXT = Set.of("mp4", "webm", "mov", "ogg", "mkv", "m4v");
    private static final String DELIVERY_TYPE = "authenticated";

    private final Cloudinary cloudinary;
    private final String folder;

    public CloudinaryStorageService(@Value("${app.cloudinary.url:}") String url,
                                    @Value("${app.cloudinary.cloud-name:}") String cloudName,
                                    @Value("${app.cloudinary.api-key:}") String apiKey,
                                    @Value("${app.cloudinary.api-secret:}") String apiSecret,
                                    @Value("${app.cloudinary.folder:learnly}") String folder) {
        if (url != null && !url.isBlank()) {
            this.cloudinary = new Cloudinary(url.trim());
        } else if (!cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank()) {
            Map<String, Object> config = new HashMap<>();
            config.put("cloud_name", cloudName.trim());
            config.put("api_key", apiKey.trim());
            config.put("api_secret", apiSecret.trim());
            this.cloudinary = new Cloudinary(config);
        } else {
            throw new IllegalStateException("app.storage.type=cloudinary needs CLOUDINARY_URL or "
                    + "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET");
        }
        this.cloudinary.config.secure = true;
        this.folder = folder == null || folder.isBlank() ? "" : folder.replaceAll("^/+|/+$", "") + "/";
        log.info("File storage: Cloudinary (cloud {}, folder '{}')", cloudinary.config.cloudName, this.folder);
    }

    @Override
    public void save(String key, InputStream data) throws IOException {
        // The SDK needs a file (it uploads big videos in 20 MB parts), so the stream is copied to a temp file first.
        Path temp = Files.createTempFile("upload-", "." + extension(key));
        try {
            Files.copy(data, temp, StandardCopyOption.REPLACE_EXISTING);
            Target t = target(key);
            Map<String, Object> options = new HashMap<>();
            options.put("public_id", t.publicId());
            options.put("resource_type", t.resourceType());
            options.put("type", DELIVERY_TYPE);
            options.put("overwrite", true);
            cloudinary.uploader().uploadLarge(temp.toFile(), options, 20 * 1024 * 1024);
        } catch (RuntimeException ex) {
            throw new IOException("Cloudinary upload failed: " + ex.getMessage(), ex);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    // Normally not used (the controller redirects to directUrl), kept so every caller still works.
    @Override
    public Resource load(String key) {
        try {
            return new UrlResource(directUrl(key, false));
        } catch (MalformedURLException ex) {
            throw new ResourseNotFoundException("File is missing from storage");
        }
    }

    @Override
    public void delete(String key) {
        Target t = target(key);
        try {
            Map<String, Object> options = new HashMap<>();
            options.put("resource_type", t.resourceType());
            options.put("type", DELIVERY_TYPE);
            options.put("invalidate", true);
            cloudinary.uploader().destroy(t.publicId(), options);
        } catch (Exception ex) {
            // The database row is removed anyway; a leftover file does no harm.
            log.warn("Could not delete {} from Cloudinary: {}", key, ex.getMessage());
        }
    }

    @Override
    public String directUrl(String key, boolean download) {
        Target t = target(key);
        var url = cloudinary.url().secure(true).signed(true).type(DELIVERY_TYPE).resourceType(t.resourceType());
        if (t.format() != null) {
            url = url.format(t.format());
        }
        if (download && !"raw".equals(t.resourceType())) {
            url = url.transformation(new Transformation().flags("attachment"));
        }
        return url.generate(t.publicId());
    }

    // Images and videos: public id without the extension (Cloudinary adds the format).
    // Everything else (PDF, Word, zip): "raw", the public id keeps the extension so the file stays exactly as uploaded.
    private Target target(String key) {
        String ext = extension(key);
        String base = key.contains(".") ? key.substring(0, key.lastIndexOf('.')) : key;
        if (IMAGE_EXT.contains(ext)) {
            return new Target(folder + base, "image", ext);
        }
        if (VIDEO_EXT.contains(ext)) {
            return new Target(folder + base, "video", ext);
        }
        return new Target(folder + key, "raw", null);
    }

    private static String extension(String key) {
        int dot = key.lastIndexOf('.');
        return dot < 0 ? "bin" : key.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private record Target(String publicId, String resourceType, String format) {
    }
}
