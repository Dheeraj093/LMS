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
// One row per (student, lesson): the same student cannot complete the same lesson twice.
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "lesson_id"}))
public class LessonProgress extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    private Boolean completed = false;

    // When the lesson was completed. Used for activity charts on the dashboard.
    private LocalDateTime completedAt;

    // Total time the student spent on this lesson (sent by the player every minute or so).
    private Integer timeSpentSeconds = 0;
}
