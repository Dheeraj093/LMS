package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Entity
public class Assignment extends BaseEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;

    private String description;

    private LocalDateTime dueDate;

    private Integer totalMarks;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;

    // ALL or GROUPS (LINK is for quizzes only). null is read as ALL.
    @Enumerated(EnumType.STRING)
    private Audience audience = Audience.ALL;

    @ToString.Exclude
    @ManyToMany
    @JoinTable(name = "assignment_groups",
            joinColumns = @JoinColumn(name = "assignment_id"),
            inverseJoinColumns = @JoinColumn(name = "group_id"))
    private List<StudentGroup> groups = new ArrayList<>();
}
