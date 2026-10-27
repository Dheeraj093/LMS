package com.example.LMS.repository;

import com.example.LMS.model.Option;
import com.example.LMS.model.Question;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OptionRepositry extends JpaRepository<Option,Integer> {
    Option findByOptionTextAndQuestion(@NotBlank String optionText, Question question);


    List<Option> findByQuestion(Question question);

    Option findByQuestionAndCorrect(Question question, Boolean correct);
}
