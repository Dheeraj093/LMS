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
@Table(name = "users")
@Entity
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    @Column(unique = true, nullable = false)
    private String email;
    @ToString.Exclude
    @Column(nullable = false)
    private String password;
    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    // Kept for old rows. New code uses "status"; active = false is treated as BLOCKED.
    private Boolean active = true;

    @Enumerated(EnumType.STRING)
    private UserStatus status = UserStatus.ACTIVE;

    // Last time this user called the API. Used for the admin "active today" number.
    private LocalDateTime lastActiveAt;

    // Tokens created before this moment stop working (after a password change or reset).
    private LocalDateTime passwordChangedAt;

    // false = signed up but has not clicked the link in the verification email yet.
    // null (users from before email verification existed, or created by an admin) counts as verified.
    private Boolean emailVerified;

    // Link returned by the file upload API (or any image URL).
    private String avatarUrl;

    @ToString.Exclude
    @OneToMany(mappedBy = "teacher")
    private List<Course> courses;

    @ToString.Exclude
    @OneToMany(mappedBy = "student")
    private List<LessonProgress> lessonProgress;

    public boolean isEmailConfirmed() {
        return !Boolean.FALSE.equals(emailVerified);
    }

    // null (old rows) counts as ACTIVE.
    public UserStatus getStatus() {
        if (Boolean.FALSE.equals(active)) {
            return UserStatus.BLOCKED;
        }
        return status == null ? UserStatus.ACTIVE : status;
    }
}
