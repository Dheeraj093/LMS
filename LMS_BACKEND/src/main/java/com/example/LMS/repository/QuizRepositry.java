package com.example.LMS.repository;

import com.example.LMS.model.Course;
import com.example.LMS.model.Question;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepositry extends JpaRepository<Quiz, Integer> {
    Quiz findByTitleIgnoreCaseAndTeacher(String title, User teacher);

    List<Quiz> findByCourse(Course course);

    List<Quiz> findByTeacher(User teacher);

    List<Quiz> findByQuestionsContaining(Question question);

    Quiz findByJoinCode(String joinCode);

    List<Quiz> findByGroupsContaining(StudentGroup group);

    List<Quiz> findByCourseIn(List<Course> courses);
}
