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
public interface ReviewRepository extends JpaRepository<Review, Integer> {

    Review findByStudentAndCourse(User student, Course course);

    List<Review> findByCourseOrderByCreatedAtDesc(Course course);

    @Query("select avg(r.rating) from Review r where r.course = :course")
    Double averageRating(@Param("course") Course course);

    long countByCourse(Course course);

    @Query("select avg(r.rating) from Review r where r.course.teacher = :teacher")
    Double averageRatingForTeacher(@Param("teacher") User teacher);

    @Query("select count(r) from Review r where r.course.teacher = :teacher")
    long countForTeacher(@Param("teacher") User teacher);
}
