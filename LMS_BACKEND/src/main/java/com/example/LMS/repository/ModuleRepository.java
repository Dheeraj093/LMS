package com.example.LMS.repository;

import com.example.LMS.model.Course;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.Module;
import com.example.LMS.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<Module,Integer> {

    List<Module> findByCourse(Course course);

    Module findByTitleIgnoreCaseAndTeacher(String title, User teacher);

    List<Module> findAllByTeacher(User teacher);

    Module findByIdAndTeacher(Integer id, User teacher);

    List<Module> findByIdInAndTeacher(List<Integer> modules, User teacher);

    List<Module> findByLessonsContaining(Lesson lesson);
}
