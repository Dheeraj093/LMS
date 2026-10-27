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
public class AssignmentSubmission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "assignment_id")
    private Assignment assignment;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;

    // A link (old way). Uploaded files are in "files".
    private String filePath;

    // A student can attach more than one uploaded file.
    @ToString.Exclude
    @ManyToMany
    @JoinTable(name = "assignment_submission_files")
    private List<MediaFile> files;

    private LocalDateTime submittedAt;

    // True when submitted after the assignment's due date.
    private Boolean late = false;

    @Enumerated(EnumType.STRING)
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    // Filled by the teacher when grading. null = not graded yet.
    private Integer marks;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    private LocalDateTime gradedAt;

    public SubmissionStatus getStatus() {
        if (marks != null) {
            return SubmissionStatus.GRADED;
        }
        return status == null ? SubmissionStatus.SUBMITTED : status;
    }
}
