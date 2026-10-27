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
// A question a student asks under a lesson (the Q&A tab of the course player).
// A lesson can be reused in many courses, so the question also remembers the course it was asked in.
// ON DELETE CASCADE: deleting the course, lesson or user also deletes its questions.
public class LessonQuestion extends BaseEntity {

    public static final int MAX_BODY = 4000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "course_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Course course;

    @ManyToOne(optional = false)
    @JoinColumn(name = "lesson_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Lesson lesson;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User author;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    private Boolean resolved = false;
}
