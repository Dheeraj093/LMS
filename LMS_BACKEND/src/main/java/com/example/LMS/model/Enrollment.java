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
// A student can enroll in a course only once.
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "course_id"}))
public class Enrollment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne()
    @JoinColumn(name = "student_id")
    private User student;

    @ManyToOne()
    @JoinColumn(name = "course_id")
    private Course course;

    private LocalDate enrolledDate;

    // Set when the student finishes every lesson of the course. A certificate is issued at the same time.
    private LocalDateTime completedAt;
}
