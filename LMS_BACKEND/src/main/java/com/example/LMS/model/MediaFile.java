package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
// One row per uploaded file. The bytes live in storage (a folder, S3, ...); the database keeps only the key.
public class MediaFile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User owner;

    @Enumerated(EnumType.STRING)
    private FilePurpose purpose;

    // Random name inside storage, for example "lesson_video/2026/10/7f3c...e1.mp4".
    // Never the user's own file name, so nobody can overwrite or guess files.
    @Column(nullable = false, unique = true)
    private String storageKey;

    // Only used for display and as the download name.
    private String originalName;

    private String contentType;

    private Long sizeBytes;
}
