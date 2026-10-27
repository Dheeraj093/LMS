package com.example.LMS.config;

import com.example.LMS.model.Role;
import com.example.LMS.model.User;
import com.example.LMS.repository.RoleRepository;
import com.example.LMS.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Runs once at startup.
// 1. Makes sure the three roles exist (ADMIN, TEACHER, STUDENT).
// 2. Creates the first admin from application.properties if there is no admin yet.
// This is needed because register no longer allows anyone to become an admin.
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public DataSeeder(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Order matters on an empty table: ids become 1 = ADMIN, 2 = TEACHER, 3 = STUDENT (the frontend expects this).
        Role admin = ensureRole(CurrentUserService.ADMIN);
        ensureRole(CurrentUserService.TEACHER);
        ensureRole(CurrentUserService.STUDENT);

        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            return;
        }
        if (userRepository.findByEmailIgnoreCase(adminEmail) == null) {
            User user = new User();
            user.setName("Admin");
            user.setEmail(adminEmail);
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.setRole(admin);
            user.setActive(true);
            userRepository.save(user);
            log.info("Created the first admin account: {}", adminEmail);
        }
    }

    private Role ensureRole(String name) {
        Role role = roleRepository.findByNameIgnoreCase(name);
        if (role == null) {
            role = new Role();
            role.setName(name);
            role = roleRepository.save(role);
        }
        return role;
    }
}
