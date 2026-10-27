package com.example.LMS.config;

import com.example.LMS.model.User;
import com.example.LMS.model.UserStatus;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

// Wraps our User entity so Spring Security can use it.
public class UserPrinciple implements UserDetails {

    private final User user;

    public UserPrinciple(User user) {
        this.user = user;
    }

    // The user's real role becomes ROLE_ADMIN, ROLE_TEACHER or ROLE_STUDENT.
    // @PreAuthorize("hasRole('TEACHER')") checks exactly this value.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (user.getRole() == null || user.getRole().getName() == null) {
            return List.of();
        }
        return List.of(new SimpleGrantedAuthority("ROLE_" + CurrentUserService.normalize(user.getRole().getName())));
    }

    @Override
    public @Nullable String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    public User getUser() {
        return user;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // Only ACTIVE users can log in or use a token. BLOCKED and PENDING (teacher not approved yet) cannot.
    @Override
    public boolean isEnabled() {
        return user.getStatus() == UserStatus.ACTIVE;
    }
}
