package com.example.LMS.repository;

import com.example.LMS.model.Announcement;
import com.example.LMS.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Integer> {

    // Pinned first, then newest.
    List<Announcement> findByCourseOrderByPinnedDescCreatedAtDesc(Course course);

    List<Announcement> findByCourseInOrderByPinnedDescCreatedAtDesc(Collection<Course> courses);

    List<Announcement> findAllByOrderByPinnedDescCreatedAtDesc();
}
