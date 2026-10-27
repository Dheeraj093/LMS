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
public class Lesson extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;

    // A YouTube/Vimeo link, or the link of an uploaded file (/files/{id}/content).
    private String videoUrl;

    private String pdfUrl;

    // Uploaded files, when the teacher uploaded them instead of pasting a link.
    // Used to check that only enrolled students can open them.
    @ManyToOne
    @JoinColumn(name = "video_file_id")
    private MediaFile videoFile;

    @ManyToOne
    @JoinColumn(name = "pdf_file_id")
    private MediaFile pdfFile;

    private Integer duration;

    private String type;

    private Boolean published;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private User teacher;

    @ToString.Exclude
    @ManyToMany(mappedBy = "lessons")
    private List<Module> module;

    @ToString.Exclude
    @OneToMany(mappedBy = "lesson")
    private List<LessonProgress> lessonProgresses;
}
