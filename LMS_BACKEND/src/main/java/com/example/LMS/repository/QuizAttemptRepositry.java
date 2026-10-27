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
public interface QuizAttemptRepositry extends JpaRepository<QuizAttempt, Integer> {

    boolean existsByStudentAndQuiz(User student, Quiz quiz);

    boolean existsByQuiz(Quiz quiz);

    long countByStudentAndQuizAndStatus(User student, Quiz quiz, AttemptStatus status);

    // Old rows have status null; they count as submitted.
    @Query("select count(a) from QuizAttempt a where a.student = :student and a.quiz = :quiz and (a.status is null or a.status = com.example.LMS.model.AttemptStatus.SUBMITTED)")
    long countSubmitted(@Param("student") User student, @Param("quiz") Quiz quiz);

    QuizAttempt findFirstByStudentAndQuizAndStatus(User student, Quiz quiz, AttemptStatus status);

    @Query("select a from QuizAttempt a where a.student = :student and (a.status is null or a.status = com.example.LMS.model.AttemptStatus.SUBMITTED) order by a.submittedAt desc")
    List<QuizAttempt> findSubmittedByStudent(@Param("student") User student);

    @Query("select a from QuizAttempt a where a.quiz = :quiz and (a.status is null or a.status = com.example.LMS.model.AttemptStatus.SUBMITTED) order by a.submittedAt desc")
    List<QuizAttempt> findSubmittedByQuiz(@Param("quiz") Quiz quiz);

    @Query("select a from QuizAttempt a where a.quiz.teacher = :teacher and (a.status is null or a.status = com.example.LMS.model.AttemptStatus.SUBMITTED)")
    List<QuizAttempt> findSubmittedForTeacher(@Param("teacher") User teacher);

    List<QuizAttempt> findByStudentOrderBySubmittedAtDesc(User student);

    List<QuizAttempt> findByQuizOrderBySubmittedAtDesc(Quiz quiz);
}
