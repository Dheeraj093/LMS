package com.example.LMS.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
// One row per user per day they used the app. Gives "daily active users" and "minutes studied per day".
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "activity_date"}))
public class UserActivity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    // Seconds spent in lessons that day (from the lesson player).
    private Integer secondsSpent = 0;
}
