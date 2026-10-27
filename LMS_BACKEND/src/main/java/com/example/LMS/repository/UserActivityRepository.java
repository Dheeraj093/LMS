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
public interface UserActivityRepository extends JpaRepository<UserActivity, Integer> {

    UserActivity findByUserAndActivityDate(User user, LocalDate date);

    long countByActivityDate(LocalDate date);

    // Daily active users: one row per day with the number of users.
    @Query("select a.activityDate, count(a) from UserActivity a where a.activityDate >= :from group by a.activityDate")
    List<Object[]> countUsersPerDay(@Param("from") LocalDate from);

    // Minutes studied per day for one student.
    List<UserActivity> findByUserAndActivityDateGreaterThanEqual(User user, LocalDate from);

    @Query("select coalesce(sum(a.secondsSpent), 0) from UserActivity a where a.user = :user")
    Long totalSeconds(@Param("user") User user);
}
