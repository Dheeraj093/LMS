package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

// Saved when a student opens a quiz with its join code.
// For a LINK quiz this row is what lets the student take it.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"quiz_id", "student_id"}))
public class QuizJoin extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;
}
