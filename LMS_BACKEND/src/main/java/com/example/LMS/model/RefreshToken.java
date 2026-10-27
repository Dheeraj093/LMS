package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
// A long-lived "stay logged in" code. The short access token is renewed with it (POST /auth/refresh).
// Every use gives a new code and cancels the old one (rotation). Only the hash is stored.
public class RefreshToken extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ToString.Exclude
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    private LocalDateTime expiresAt;

    // Set on logout, rotation, password change or when reuse of an old code is detected.
    private LocalDateTime revokedAt;

    // true = cancelled because it was swapped for a new one. Using it again means it was copied (stolen).
    private Boolean rotated;
}
