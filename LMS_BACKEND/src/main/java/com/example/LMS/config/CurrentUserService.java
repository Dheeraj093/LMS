package com.example.LMS.config;

import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// Gives services the logged-in user, taken from the JWT token.
// Services must use this instead of trusting a "studentId" sent by the browser,
// otherwise one user could act as another just by changing a number.
@Component
public class CurrentUserService {

    public static final String ADMIN = "ADMIN";
    public static final String TEACHER = "TEACHER";
    public static final String STUDENT = "STUDENT";

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrinciple principal)) {
            throw new UnauthorizedAccessException("You are not logged in");
        }
        return principal.getUser();
    }

    public String getRoleName(User user) {
        if (user.getRole() == null || user.getRole().getName() == null) {
            return "";
        }
        return normalize(user.getRole().getName());
    }

    // "admin", "Admin" and "ROLE_ADMIN" all become "ADMIN".
    public static String normalize(String roleName) {
        String name = roleName.trim().toUpperCase();
        return name.startsWith("ROLE_") ? name.substring(5) : name;
    }

    public boolean isAdmin(User user) {
        return ADMIN.equals(getRoleName(user));
    }

    public boolean isTeacher(User user) {
        return TEACHER.equals(getRoleName(user));
    }

    public boolean isStudent(User user) {
        return STUDENT.equals(getRoleName(user));
    }

    // True when the user is an admin or is the given owner (for example the course teacher).
    public boolean isAdminOrOwner(User user, User owner) {
        return isAdmin(user) || (owner != null && owner.getId().equals(user.getId()));
    }
}
