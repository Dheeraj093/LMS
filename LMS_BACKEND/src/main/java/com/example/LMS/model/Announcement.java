package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
// A message a teacher posts to everyone in a course ("Class moved to Friday", "Exam syllabus", ...).
public class Announcement extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Deleting a course deletes its announcements too (database ON DELETE CASCADE).
    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Course course;

    // The teacher (or admin) who wrote it.
    @ManyToOne
    @JoinColumn(name = "author_id")
    private User author;

    @Column(length = 150, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    // Pinned announcements are always listed first.
    private Boolean pinned = false;
}
