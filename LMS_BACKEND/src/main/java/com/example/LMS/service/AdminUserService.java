package com.example.LMS.service;

import com.example.LMS.DTO.AdminCreateUserRequest;
import com.example.LMS.DTO.PageResponse;
import com.example.LMS.DTO.UserResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.Role;
import com.example.LMS.model.User;
import com.example.LMS.model.UserStatus;
import com.example.LMS.repository.RoleRepository;
import com.example.LMS.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

// Admin screens: list users, approve teachers, block/unblock, change role.
@Service
public class AdminUserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // All filters are optional. role = ADMIN/TEACHER/STUDENT, search matches name or email.
    public PageResponse<UserResponse> listUsers(String role, UserStatus status, String search, int page, int size) {
        String roleName = role == null || role.isBlank() ? null : CurrentUserService.normalize(role);
        String like = search == null || search.isBlank() ? null : "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        int safeSize = Math.min(Math.max(size, 1), 100);
        return PageResponse.of(userRepository.search(roleName, status, like,
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))), userService::toUserResponse);
    }

    public UserResponse getUser(Integer id) {
        return userService.toUserResponse(findUser(id));
    }

    public UserResponse setStatus(Integer id, UserStatus status) {
        User user = findOther(id);
        user.setStatus(status);
        // The old "active" column is kept in step, because BLOCKED is also read from it.
        user.setActive(status != UserStatus.BLOCKED);
        User saved = userRepository.save(user);
        notificationService.notify(saved, NotificationType.ACCOUNT_STATUS, "Your account status is now " + status, "/profile");
        return userService.toUserResponse(saved);
    }

    // An admin adds an account directly (any role). It is active at once, with no approval step.
    public UserResponse createUser(AdminCreateUserRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailIgnoreCase(email) != null) {
            throw new ResourceAlreadyExistException("An account with this email already exists");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(userService.resolveRole(request.role(), null, CurrentUserService.STUDENT));
        user.setActive(true);
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepository.save(user);
        notificationService.notify(saved, NotificationType.ACCOUNT_APPROVED, "Welcome! An admin created your account.", "/dashboard");
        return userService.toUserResponse(saved);
    }

    // Every user matching the same filters as the list, for the Excel export.
    public List<User> allUsers(String role, UserStatus status, String search) {
        String roleName = role == null || role.isBlank() ? null : CurrentUserService.normalize(role);
        String like = search == null || search.isBlank() ? null : "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        return userRepository.search(roleName, status, like,
                PageRequest.of(0, 10000, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
    }

    public UserResponse approve(Integer id) {
        User user = findUser(id);
        if (user.getStatus() != UserStatus.PENDING) {
            throw new BadRequestException("Only pending accounts can be approved");
        }
        user.setStatus(UserStatus.ACTIVE);
        user.setActive(true);
        User saved = userRepository.save(user);
        notificationService.notify(saved, NotificationType.ACCOUNT_APPROVED, "Your teacher account was approved. Welcome!", "/dashboard");
        return userService.toUserResponse(saved);
    }

    public UserResponse setRole(Integer id, Integer roleId, String roleName) {
        User user = findOther(id);
        if (roleId == null && (roleName == null || roleName.isBlank())) {
            throw new BadRequestException("Role is required");
        }
        Role role = userService.resolveRole(roleName, roleId, null);
        user.setRole(role);
        return userService.toUserResponse(userRepository.save(user));
    }

    // An admin cannot block themselves or remove their own admin role, so the site always has an admin.
    private User findOther(Integer id) {
        User user = findUser(id);
        if (user.getId().equals(currentUserService.getCurrentUser().getId())) {
            throw new BadRequestException("You cannot change your own status or role");
        }
        return user;
    }

    private User findUser(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("User not found with id " + id));
    }
}
