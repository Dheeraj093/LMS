package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
public class Quiz extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;

    private String description;

    private Integer totalMarks;

    private Integer passingMarks;

    private Integer timeLimitInMinutes;

    private Boolean published;

    // How many times a student may take this quiz. null or 1 = once.
    private Integer maxAttempts = 1;

    @ManyToOne
    User teacher;

    @ToString.Exclude
    @ManyToMany
    private List<Question> questions;
    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;

    // Who can see the quiz. null is read as ALL, so old quizzes keep working.
    @Enumerated(EnumType.STRING)
    private Audience audience = Audience.ALL;

    // Used when audience = GROUPS.
    @ToString.Exclude
    @ManyToMany
    @JoinTable(name = "quiz_groups",
            joinColumns = @JoinColumn(name = "quiz_id"),
            inverseJoinColumns = @JoinColumn(name = "group_id"))
    private List<StudentGroup> groups = new ArrayList<>();

    // Short code students type at /join (upper case letters and digits). Unique across all quizzes.
    @Column(name = "join_code", unique = true, length = 12)
    private String joinCode;

    // Optional. After this time students cannot start a new attempt. Shown on the calendar.
    private LocalDateTime dueDate;
}
