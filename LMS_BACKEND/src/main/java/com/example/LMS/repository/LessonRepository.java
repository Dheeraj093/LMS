package com.example.LMS.repository;

import com.example.LMS.model.*;
import com.example.LMS.model.Module;
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
public interface LessonRepository extends JpaRepository<Lesson, Integer> {

    List<Lesson> findByModule(Module module);

    Lesson findByTitleIgnoreCaseAndTeacher(String title, User teacher);

    List<Lesson> findAllByTeacher(User teacher);

    Lesson findByIdAndTeacher(Integer id, User teacher);

    List<Lesson> findByIdInAndTeacher(List<Integer> integers, User teacher);

    List<Lesson> findByVideoFileOrPdfFile(MediaFile videoFile, MediaFile pdfFile);
}
