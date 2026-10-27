package com.example.LMS.storage;

import com.example.LMS.exception.ResourseNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

// Saves files in a folder on the server (app.storage.local-dir, default "uploads").
// Good for development and small servers. Used unless app.storage.type=cloudinary.
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private final Path root;

    public LocalStorageService(@Value("${app.storage.local-dir:uploads}") String dir) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public void save(String key, InputStream data) throws IOException {
        Path target = resolve(key);
        Files.createDirectories(target.getParent());
        Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Resource load(String key) {
        Path file = resolve(key);
        if (!Files.exists(file)) {
            throw new ResourseNotFoundException("File is missing from storage");
        }
        return new FileSystemResource(file);
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ignored) {
            // The database row is removed anyway; a leftover file does no harm.
        }
    }

    // Stops keys like "../../etc/passwd" from leaving the uploads folder.
    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("Bad storage key");
        }
        return path;
    }
}
