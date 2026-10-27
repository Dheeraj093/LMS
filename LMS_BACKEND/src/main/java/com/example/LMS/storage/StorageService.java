package com.example.LMS.storage;

import org.springframework.core.io.Resource;

import java.io.InputStream;

// Where uploaded file bytes are kept. The rest of the app only talks to this interface,
// so moving from a local folder to S3 or Cloudinary means writing one new class, nothing else.
public interface StorageService {

    void save(String key, InputStream data) throws java.io.IOException;

    Resource load(String key);

    void delete(String key);

    // Cloud storage can send the browser straight to the file (faster, and video seeking works through the CDN).
    // Returns null when the bytes must be served by this API (local folder).
    default String directUrl(String key, boolean download) {
        return null;
    }
}
