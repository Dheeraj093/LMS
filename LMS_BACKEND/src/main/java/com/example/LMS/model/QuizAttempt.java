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
public class QuizAttempt extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;

    private Integer score;

    // score / totalMarks * 100, saved so charts do not have to calculate it again.
    private Double percentage;

    // Set by the server when the quiz starts. The browser cannot change it.
    private LocalDateTime startedAt;

    // startedAt + time limit. Submissions after this (plus a short grace time) are refused.
    private LocalDateTime deadline;

    private LocalDateTime submittedAt;

    private Boolean passed;

    @Enumerated(EnumType.STRING)
    private AttemptStatus status = AttemptStatus.SUBMITTED;

    // Old rows have no status: they were always submitted.
    public AttemptStatus getStatus() {
        return status == null ? AttemptStatus.SUBMITTED : status;
    }
}
