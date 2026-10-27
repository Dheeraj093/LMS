package com.example.LMS.service;

import com.example.LMS.model.User;
import com.example.LMS.model.UserActivity;
import com.example.LMS.repository.UserActivityRepository;
import com.example.LMS.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

// Keeps "who used the app on which day" and "how many seconds a student studied each day".
@Service
public class ActivityService {

    @Autowired
    private UserActivityRepository userActivityRepository;

    @Autowired
    private UserRepository userRepository;

    // Called on every logged-in request, but writes to the database only
    // when lastActiveAt is older than 5 minutes, so it stays cheap.
    public void touch(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last = user.getLastActiveAt();
        if (last != null && last.isAfter(now.minusMinutes(5))) {
            return;
        }
        user.setLastActiveAt(now);
        userRepository.save(user);
        todayRow(user);
    }

    public void addStudySeconds(User user, int seconds) {
        UserActivity row = todayRow(user);
        row.setSecondsSpent((row.getSecondsSpent() == null ? 0 : row.getSecondsSpent()) + seconds);
        userActivityRepository.save(row);
    }

    private UserActivity todayRow(User user) {
        LocalDate today = LocalDate.now();
        UserActivity row = userActivityRepository.findByUserAndActivityDate(user, today);
        if (row != null) {
            return row;
        }
        try {
            row = new UserActivity();
            row.setUser(user);
            row.setActivityDate(today);
            row.setSecondsSpent(0);
            return userActivityRepository.save(row);
        } catch (DataIntegrityViolationException ex) {
            // Two requests at the same moment both tried to create today's row; use the one that won.
            return userActivityRepository.findByUserAndActivityDate(user, today);
        }
    }
}
