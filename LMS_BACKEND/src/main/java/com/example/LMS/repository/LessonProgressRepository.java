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
public interface LessonProgressRepository extends JpaRepository<LessonProgress, Integer> {

    // Was findByLesson(lesson): it ignored the student, so one student's progress showed for everyone.
    LessonProgress findByStudentAndLesson(User student, Lesson lesson);

    boolean existsByStudentAndLessonAndCompletedTrue(User student, Lesson lesson);

    List<LessonProgress> findByLesson(Lesson lesson);

    @Query("select p.lesson.id from LessonProgress p where p.student = :student and p.completed = true and p.lesson.id in :lessonIds")
    List<Integer> completedLessonIds(@Param("student") User student, @Param("lessonIds") Collection<Integer> lessonIds);

    long countByStudentAndCompletedTrue(User student);
}
