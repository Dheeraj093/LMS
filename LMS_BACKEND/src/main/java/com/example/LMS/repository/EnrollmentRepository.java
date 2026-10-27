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
public interface EnrollmentRepository extends JpaRepository<Enrollment, Integer> {

    List<Enrollment> findByStudent(User student);

    List<Enrollment> findByCourse(Course course);

    // Was findByStudentAndStudent(student, course), which compared the student twice.
    Enrollment findByStudentAndCourse(User student, Course course);

    boolean existsByStudentAndCourse(User student, Course course);

    boolean existsByCourse(Course course);

    long countByCourse(Course course);

    List<Enrollment> findByCourseIn(Collection<Course> courses);

    @Query("select e.enrolledDate, count(e) from Enrollment e where e.enrolledDate >= :from group by e.enrolledDate")
    List<Object[]> countPerDay(@Param("from") LocalDate from);

    @Query("select e.enrolledDate, count(e) from Enrollment e where e.course.teacher = :teacher and e.enrolledDate >= :from group by e.enrolledDate")
    List<Object[]> countPerDayForTeacher(@Param("teacher") User teacher, @Param("from") LocalDate from);

    @Query("select e.course.id, count(e) from Enrollment e group by e.course.id order by count(e) desc")
    List<Object[]> countPerCourse(Pageable pageable);
}
