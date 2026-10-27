package com.example.LMS.repository;

import com.example.LMS.model.Assignment;
import com.example.LMS.model.Course;
import com.example.LMS.model.StudentGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepositry extends JpaRepository<Assignment, Integer> {

    Assignment findByTitleIgnoreCaseAndCourse(String title, Course course);

    List<Assignment> findByCourse(Course course);

    List<Assignment> findByCourseIn(List<Course> courses);

    List<Assignment> findByGroupsContaining(StudentGroup group);
}
