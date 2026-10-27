package com.example.LMS.repository;

import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentGroupRepository extends JpaRepository<StudentGroup, Integer> {

    List<StudentGroup> findByTeacherOrderByNameAsc(User teacher);

    List<StudentGroup> findAllByOrderByNameAsc();

    // Groups a student belongs to.
    List<StudentGroup> findByMembersContainingOrderByNameAsc(User student);

    List<StudentGroup> findByTeacherAndMembersContainingOrderByNameAsc(User teacher, User student);

    StudentGroup findByNameIgnoreCaseAndTeacher(String name, User teacher);
}
