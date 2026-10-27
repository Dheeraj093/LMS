package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

// A batch of students made by a teacher, for example "Section A".
// Quizzes and assignments can be limited to one or more groups.
// The table is called student_group because "group" is a reserved word in SQL.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "student_group")
public class StudentGroup extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // The teacher who owns the group.
    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private User teacher;

    @ToString.Exclude
    @ManyToMany
    @JoinTable(name = "student_group_members",
            joinColumns = @JoinColumn(name = "group_id"),
            inverseJoinColumns = @JoinColumn(name = "student_id"))
    private List<User> members = new ArrayList<>();
}
