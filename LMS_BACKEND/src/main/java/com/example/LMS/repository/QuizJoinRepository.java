package com.example.LMS.repository;

import com.example.LMS.model.Quiz;
import com.example.LMS.model.QuizJoin;
import com.example.LMS.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizJoinRepository extends JpaRepository<QuizJoin, Integer> {

    boolean existsByQuizAndStudent(Quiz quiz, User student);

    List<QuizJoin> findByStudent(User student);

    List<QuizJoin> findByQuiz(Quiz quiz);
}
