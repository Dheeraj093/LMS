package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
public class Option extends  BaseEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String optionText;

    private Boolean correct;

    @ManyToOne
    @JoinColumn(name = "question_id")
    private Question question;

    @ToString.Exclude
    @OneToMany(mappedBy = "selectedOption")
    private List<QuizAnswer> quizAnswers;
}
