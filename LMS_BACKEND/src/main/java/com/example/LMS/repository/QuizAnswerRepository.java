package com.example.LMS.repository;

import com.example.LMS.model.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, Integer> {

    List<QuizAnswer> findByAttempt(QuizAttempt attempt);

    boolean existsByQuestion(Question question);

    boolean existsBySelectedOption(Option option);

    // For each question of this teacher: question id, text, answers, correct answers.
    @Query("""
            select a.question.id, a.question.questionText, count(a),
                   sum(case when a.correct = true then 1 else 0 end)
            from QuizAnswer a
            where a.question.teacher = :teacher and a.correct is not null
            group by a.question.id, a.question.questionText
            """)
    List<Object[]> questionStatsForTeacher(@Param("teacher") User teacher);
}
