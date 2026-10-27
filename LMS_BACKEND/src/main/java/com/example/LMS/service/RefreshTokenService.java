package com.example.LMS.service;

import com.example.LMS.model.RefreshToken;
import com.example.LMS.model.User;
import com.example.LMS.model.UserStatus;
import com.example.LMS.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import com.example.LMS.exception.SessionExpiredException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

// Creates, rotates and cancels refresh tokens ("stay logged in" codes).
@Service
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;
    private final long refreshDays;

    public RefreshTokenService(RefreshTokenRepository repository,
                               @Value("${app.jwt.refresh-days:7}") long refreshDays) {
        this.repository = repository;
        this.refreshDays = refreshDays;
    }

    // Returns the plain code. It is shown to the browser once; only its hash is saved.
    public String create(User user) {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshToken row = new RefreshToken();
        row.setUser(user);
        row.setTokenHash(sha256(token));
        row.setExpiresAt(LocalDateTime.now().plusDays(refreshDays));
        repository.save(row);
        return token;
    }

    // Checks the code and cancels it. The caller then creates a new one (rotation).
    // Using a code that was already swapped means it was probably stolen: every session of that user is ended.
    // noRollbackFor: the "revoke everything" step must stay saved even though an error is returned.
    @Transactional(noRollbackFor = SessionExpiredException.class)
    public User use(String token) {
        RefreshToken row = repository.findByTokenHash(sha256(token.trim()));
        if (row == null) {
            throw new SessionExpiredException();
        }
        User user = row.getUser();
        if (row.getRevokedAt() != null) {
            if (Boolean.TRUE.equals(row.getRotated())) {
                revokeAll(user);
            }
            throw new SessionExpiredException();
        }
        if (row.getExpiresAt().isBefore(LocalDateTime.now()) || user.getStatus() != UserStatus.ACTIVE
                || !user.isEmailConfirmed()) {
            row.setRevokedAt(LocalDateTime.now());
            repository.save(row);
            throw new SessionExpiredException();
        }
        row.setRevokedAt(LocalDateTime.now());
        row.setRotated(true);
        repository.save(row);
        return user;
    }

    // Logout: cancels this one code. Unknown codes are ignored so logout always "works".
    public void revoke(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        RefreshToken row = repository.findByTokenHash(sha256(token.trim()));
        if (row != null && row.getRevokedAt() == null) {
            row.setRevokedAt(LocalDateTime.now());
            repository.save(row);
        }
    }

    // Password change/reset, blocked account, stolen code: log out every device.
    @Transactional(propagation = Propagation.REQUIRED)
    public void revokeAll(User user) {
        LocalDateTime now = LocalDateTime.now();
        var rows = repository.findByUserAndRevokedAtIsNull(user);
        rows.forEach(r -> r.setRevokedAt(now));
        repository.saveAll(rows);
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
