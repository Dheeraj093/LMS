package com.example.LMS.config;

import com.example.LMS.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.function.Function;

// Creates and reads JWT tokens.
// The secret and the lifetime come from application.properties, so they can be
// changed per environment without touching code.
@Service
public class JwtService {

    // "typ" claim tells login tokens and file-link tokens apart, so one can never be used as the other.
    private static final String TYPE_LOGIN = "login";
    private static final String TYPE_FILE = "file";

    private final SecretKey key;
    private final long expirationMs;
    private final long fileLinkMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms:21600000}") long expirationMs,
                      @Value("${app.files.link-expiration-ms:7200000}") long fileLinkMs) {
        // HS256 needs a key of at least 32 bytes (256 bits).
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 characters long");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.fileLinkMs = fileLinkMs;
    }

    public String generateToken(User user) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("typ", TYPE_LOGIN)
                .claim("userId", user.getId())
                .claim("role", user.getRole() != null ? user.getRole().getName() : null)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(key)
                .compact();
    }

    // Throws a JwtException if the token is broken, signed with another key or expired.
    public String extractUser(String token) {
        Claims claims = parse(token);
        // Old tokens have no "typ"; they are login tokens.
        Object type = claims.get("typ");
        if (type != null && !TYPE_LOGIN.equals(type)) {
            throw new JwtException("Not a login token");
        }
        return claims.getSubject();
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(parse(token));
    }

    // The token must belong to this user, not be expired, and be newer than the last password change.
    public boolean validateUser(User user, String token) {
        Claims claims = parse(token);
        if (!user.getEmail().equalsIgnoreCase(claims.getSubject()) || claims.getExpiration().before(new Date())) {
            return false;
        }
        if (user.getPasswordChangedAt() != null && claims.getIssuedAt() != null) {
            // Tokens only store whole seconds, so compare in seconds.
            long issued = claims.getIssuedAt().getTime() / 1000;
            long changed = user.getPasswordChangedAt().atZone(ZoneId.systemDefault()).toEpochSecond();
            return issued >= changed;
        }
        return true;
    }

    // A short-lived token that lets a browser <video>/<img>/<iframe> open one private file.
    // Those tags cannot send an Authorization header, so the permission travels in the URL.
    public String generateFileToken(Integer fileId) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject("file:" + fileId)
                .claim("typ", TYPE_FILE)
                .issuedAt(new Date(now))
                .expiration(new Date(now + fileLinkMs))
                .signWith(key)
                .compact();
    }

    public boolean isValidFileToken(String token, Integer fileId) {
        try {
            Claims claims = parse(token);
            return TYPE_FILE.equals(claims.get("typ")) && ("file:" + fileId).equals(claims.getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public LocalDateTime fileLinkExpiry() {
        return LocalDateTime.now().plusNanos(fileLinkMs * 1_000_000);
    }

    private Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
