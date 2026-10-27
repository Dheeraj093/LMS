package com.example.LMS.repository;

import com.example.LMS.model.LessonAnswer;
import com.example.LMS.model.LessonQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface LessonAnswerRepository extends JpaRepository<LessonAnswer, Integer> {

    // Answers of many questions in one query, oldest first (grouped by question in the service).
    List<LessonAnswer> findByQuestionInOrderByCreatedAtAsc(Collection<LessonQuestion> questions);
}
