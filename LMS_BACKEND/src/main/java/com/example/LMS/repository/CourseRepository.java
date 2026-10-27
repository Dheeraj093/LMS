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
public interface CourseRepository extends JpaRepository<Course, Integer> {

    List<Course> findByTeacher(User user);

    // Titles only need to be unique for the same teacher.
    Course findByTitleIgnoreCaseAndTeacher(String title, User teacher);

    Course findByIdAndTeacher(Integer id, User teacher);

    List<Course> findByPublishedTrue();

    Course findByIdAndPublishedTrue(Integer id);

    boolean existsByCategory(Category category);

    List<Course> findByModulesContaining(Module module);

    long countByPublishedTrue();

    // Catalog search: text in title/description, optional category. A null filter means "any".
    @Query("""
            select c from Course c
            where c.published = true
              and (:categoryId is null or c.category.id = :categoryId)
              and (:search is null or lower(c.title) like :search or lower(c.description) like :search)
            """)
    Page<Course> searchPublished(@Param("search") String search, @Param("categoryId") Integer categoryId, Pageable pageable);

    @Query("select coalesce(c.category.name, 'Uncategorised'), count(c) from Course c left join c.category where c.published = true group by c.category.name")
    List<Object[]> countPublishedByCategory();
}
