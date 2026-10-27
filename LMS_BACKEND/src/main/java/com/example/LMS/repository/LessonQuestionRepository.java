package com.example.LMS.repository;

import com.example.LMS.model.Course;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.LessonQuestion;
import com.example.LMS.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LessonQuestionRepository extends JpaRepository<LessonQuestion, Integer> {

    List<LessonQuestion> findByCourseOrderByCreatedAtDesc(Course course);

    List<LessonQuestion> findByCourseAndLessonOrderByCreatedAtDesc(Course course, Lesson lesson);

    // Every question in the courses of one teacher.
    List<LessonQuestion> findByCourseTeacherOrderByCreatedAtDesc(User teacher);

    List<LessonQuestion> findAllByOrderByCreatedAtDesc();
}
