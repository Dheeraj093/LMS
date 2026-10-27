package com.example.LMS.repository;

import com.example.LMS.model.Question;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.User;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepositry extends JpaRepository<Question, Integer> {
    List<Question> findByQuiz(Quiz quiz);

    List<Question> findByTeacher(User teacher);

    List<Question> findAllByIdInAndTeacher(@NotNull List<Integer> integers, User teacher);
}
