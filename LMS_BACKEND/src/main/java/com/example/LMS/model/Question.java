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
public class Question extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String questionText;

    private Integer marks;

    private Boolean published;

    private String topic;

    @ManyToOne
    private User teacher;

    @ToString.Exclude
    @ManyToMany(mappedBy = "questions")
    private List<Quiz> quiz;

    @ToString.Exclude
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    private List<Option> options;

}
