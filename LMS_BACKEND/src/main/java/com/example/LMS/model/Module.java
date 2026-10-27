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
public class Module extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;

    private String description;

    Boolean published;

    @ToString.Exclude
    @ManyToMany(mappedBy = "modules")
    private List<Course> course;

    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private User teacher;

    // Lesson order inside this module (see Course.modules).
    @ToString.Exclude
    @ManyToMany
    @OrderColumn(name = "position")
    private List<Lesson> lessons;
}
