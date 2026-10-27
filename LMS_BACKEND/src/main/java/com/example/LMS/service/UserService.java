package com.example.LMS.service;

import com.example.LMS.DTO.AuthResponse;
import com.example.LMS.DTO.ChangePasswordRequest;
import com.example.LMS.DTO.LoginRequest;
import com.example.LMS.DTO.ProfileRequest;
import com.example.LMS.DTO.RegisterRequest;
import com.example.LMS.DTO.ResetPasswordRequest;
import com.example.LMS.DTO.UserResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.config.JwtService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.EmailNotVerifiedException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.EmailVerificationToken;
import com.example.LMS.model.FilePurpose;
import com.example.LMS.model.MediaFile;
import com.example.LMS.model.PasswordResetToken;
import com.example.LMS.model.Role;
import com.example.LMS.model.User;
import com.example.LMS.model.UserStatus;
import com.example.LMS.repository.EmailVerificationTokenRepository;
import com.example.LMS.repository.PasswordResetTokenRepository;
import com.example.LMS.repository.RoleRepository;
import com.example.LMS.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String FORGOT_MESSAGE = "If this email has an account, a reset link has been sent";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private RateLimitService rateLimitService;

    @Autowired
    private MailService mailService;

    // true = new users must click the link in a verification email before they can log in.
    @Value("${app.auth.email-verification-required:false}")
    private boolean emailVerificationRequired;

    // true = new teachers must be approved by an admin before they can log in.
    @Value("${app.auth.teacher-approval-required:false}")
    private boolean teacherApprovalRequired;

    // Page of the frontend that shows the "new password" form.
    @Value("${app.frontend.reset-password-url:http://localhost:5173/reset-password}")
    private String resetPasswordUrl;

    // DEVELOPMENT ONLY: also return the reset / verification code in the response (for tests without email).
    @Value("${app.auth.return-reset-token:false}")
    private boolean returnResetToken;

    public AuthResponse registerUser(RegisterRequest registerRequest) {
        String email = registerRequest.email().trim().toLowerCase();
        if (userRepository.findByEmailIgnoreCase(email) != null) {
            throw new ResourceAlreadyExistException("An account with this email already exists");
        }

        // Never trust the role sent by the browser: only TEACHER or STUDENT, default STUDENT.
        Role role = resolveRole(registerRequest.role(), registerRequest.roleId(), CurrentUserService.STUDENT);
        String roleName = CurrentUserService.normalize(role.getName());
        if (!roleName.equals(CurrentUserService.STUDENT) && !roleName.equals(CurrentUserService.TEACHER)) {
            throw new BadRequestException("You can register only as a student or a teacher");
        }

        User user = new User();
        user.setName(registerRequest.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(registerRequest.password()));
        user.setRole(role);
        user.setActive(true);
        boolean pending = teacherApprovalRequired && roleName.equals(CurrentUserService.TEACHER);
        user.setStatus(pending ? UserStatus.PENDING : UserStatus.ACTIVE);
        if (emailVerificationRequired) {
            user.setEmailVerified(false);
        }
        User savedUser = userRepository.save(user);

        if (emailVerificationRequired) {
            sendVerificationEmail(savedUser);
            String message = "We sent a confirmation link to " + email + ". Please open it to activate your account"
                    + (pending ? ". After that an admin must approve your teacher account" : "");
            return toAuthResponse(savedUser, false, message);
        }
        return toAuthResponse(savedUser, !pending,
                pending ? "Your teacher account is waiting for admin approval" : null);
    }

    // Finds a role by name ("STUDENT", "student" and "ROLE_STUDENT" all match), else by id, else the fallback name.
    // Names come first because role ids are not the same in every database.
    public Role resolveRole(String name, Integer id, String fallbackName) {
        Role role = null;
        if (name != null && !name.isBlank()) {
            role = findRoleByName(CurrentUserService.normalize(name));
        } else if (id != null) {
            role = roleRepository.findById(id).orElse(null);
        } else if (fallbackName != null) {
            role = findRoleByName(fallbackName);
        }
        if (role == null) {
            throw new ResourseNotFoundException("Role not found");
        }
        return role;
    }

    private Role findRoleByName(String normalizedName) {
        return roleRepository.findAll().stream()
                .filter(r -> r.getName() != null && CurrentUserService.normalize(r.getName()).equals(normalizedName))
                .findFirst()
                .orElse(null);
    }

    // ip = the caller's address, used to pause login after too many wrong passwords.
    public AuthResponse loginUser(LoginRequest loginRequest, String ip) {
        String email = loginRequest.email().trim().toLowerCase();
        rateLimitService.checkLogin(email, ip); // 429 after too many wrong passwords
        User user = userRepository.findByEmailIgnoreCase(email);
        // Clear messages for "not verified" and "waiting for approval", but only after the password is checked,
        // so this does not tell strangers which emails exist.
        if (user != null && passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
            if (!user.isEmailConfirmed()) {
                throw new EmailNotVerifiedException("Please confirm your email first. Open the link we sent to " + email);
            }
            if (user.getStatus() == UserStatus.PENDING) {
                throw new UnauthorizedAccessException("Your teacher account is waiting for admin approval");
            }
        }
        try {
            // Throws BadCredentialsException (401) for a wrong password
            // and DisabledException (403) for a blocked account.
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, loginRequest.password()));
        } catch (BadCredentialsException ex) {
            rateLimitService.loginFailed(email, ip);
            throw ex;
        }
        rateLimitService.loginSucceeded(email, ip);
        return toAuthResponse(userRepository.findByEmailIgnoreCase(email), true, null);
    }

    // Swaps a refresh token for a new access token + new refresh token. The old refresh token stops working.
    // Not @Transactional on purpose: when an old token is reused, RefreshTokenService must keep its
    // "log out everywhere" change even though an error is returned.
    public AuthResponse refresh(String refreshToken) {
        User user = refreshTokenService.use(refreshToken);
        return toAuthResponse(user, true, null);
    }

    // Cancels the refresh token of this device. The short access token simply runs out.
    public Map<String, String> logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
        return Map.of("message", "Logged out");
    }

    @Transactional
    public Map<String, String> verifyEmail(String code) {
        EmailVerificationToken row = emailVerificationTokenRepository.findByTokenHash(sha256(code.trim()));
        if (row == null || row.getUsedAt() != null || row.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("This confirmation link is invalid or has expired. Ask for a new one");
        }
        row.setUsedAt(LocalDateTime.now());
        emailVerificationTokenRepository.save(row);
        User user = row.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        String message = user.getStatus() == UserStatus.PENDING
                ? "Email confirmed. An admin must approve your teacher account before you can log in"
                : "Email confirmed. You can log in now";
        return Map.of("message", message);
    }

    // Always answers the same way, so nobody can use it to find out which emails are registered.
    @Transactional
    public Map<String, String> resendVerification(String rawEmail) {
        String email = rawEmail.trim().toLowerCase();
        rateLimitService.checkEmailRequest("verify", email);
        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", "If this email is waiting for confirmation, a new link has been sent");
        User user = userRepository.findByEmailIgnoreCase(email);
        if (user != null && !user.isEmailConfirmed() && user.getStatus() != UserStatus.BLOCKED) {
            String code = sendVerificationEmail(user);
            if (returnResetToken) {
                response.put("token", code);
            }
        }
        return response;
    }

    // Creates a new verification code (older ones stop working) and emails the link. Returns the plain code.
    private String sendVerificationEmail(User user) {
        for (EmailVerificationToken old : emailVerificationTokenRepository.findByUserAndUsedAtIsNull(user)) {
            old.setUsedAt(LocalDateTime.now());
            emailVerificationTokenRepository.save(old);
        }
        String code = randomCode();
        EmailVerificationToken row = new EmailVerificationToken();
        row.setUser(user);
        row.setTokenHash(sha256(code));
        row.setExpiresAt(LocalDateTime.now().plusHours(24));
        emailVerificationTokenRepository.save(row);
        mailService.sendVerification(user.getEmail(), user.getName(),
                mailService.absoluteLink("/verify-email?token=" + code));
        return code;
    }

    private static String randomCode() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public UserResponse getMe() {
        return toUserResponse(currentUserService.getCurrentUser());
    }

    public UserResponse updateMe(ProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        user.setName(request.name().trim());
        MediaFile avatar = fileService.requireOwnFile(request.avatarFileId(), FilePurpose.AVATAR);
        if (avatar != null) {
            user.setAvatarUrl(fileService.linkFor(avatar));
        }
        return toUserResponse(userRepository.save(user));
    }

    // Changing the password logs out every other device: older tokens stop working.
    // A new token is returned so this device stays logged in.
    public AuthResponse changePassword(ChangePasswordRequest request) {
        User user = currentUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Current password is wrong");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from the current one");
        }
        setPassword(user, request.newPassword());
        return toAuthResponse(user, true, "Password changed. Other devices were logged out");
    }

    // Always answers the same way, so nobody can use it to find out which emails are registered.
    @Transactional
    public Map<String, String> forgotPassword(String rawEmail) {
        String email = rawEmail.trim().toLowerCase();
        rateLimitService.checkEmailRequest("reset", email);
        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", FORGOT_MESSAGE);
        User user = userRepository.findByEmailIgnoreCase(email);
        if (user == null || user.getStatus() == UserStatus.BLOCKED) {
            return response;
        }
        // Older unused codes stop working, only the newest one is valid.
        for (PasswordResetToken old : passwordResetTokenRepository.findByUserAndUsedAtIsNull(user)) {
            old.setUsedAt(LocalDateTime.now());
            passwordResetTokenRepository.save(old);
        }
        String token = randomCode();

        PasswordResetToken row = new PasswordResetToken();
        row.setUser(user);
        row.setTokenHash(sha256(token));
        row.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(row);

        // Sent in the background. With app.mail.enabled=false the email (and link) is written to the server log.
        mailService.sendPasswordReset(user.getEmail(), user.getName(), resetPasswordUrl + "?token=" + token);
        if (returnResetToken) {
            response.put("token", token);
        }
        return response;
    }

    @Transactional
    public Map<String, String> resetPassword(ResetPasswordRequest request) {
        PasswordResetToken row = passwordResetTokenRepository.findByTokenHash(sha256(request.token().trim()));
        if (row == null || row.getUsedAt() != null || row.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("This reset link is invalid or has expired. Ask for a new one");
        }
        row.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(row);
        User user = row.getUser();
        setPassword(user, request.newPassword());
        // Opening the reset link proves the email works.
        if (!user.isEmailConfirmed()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }
        return Map.of("message", "Password changed. You can log in now");
    }

    public UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(),
                user.getRole() != null ? user.getRole().getId() : null,
                currentUserService.getRoleName(user), user.getStatus(), user.getAvatarUrl(),
                user.getCreatedAt(), user.getLastActiveAt());
    }

    private void setPassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        // Whole seconds, because tokens store their time in whole seconds.
        user.setPasswordChangedAt(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
        userRepository.save(user);
        refreshTokenService.revokeAll(user); // every device must log in again
    }

    private AuthResponse toAuthResponse(User user, boolean withToken, String message) {
        String token = withToken ? jwtService.generateToken(user) : null;
        String refreshToken = withToken ? refreshTokenService.create(user) : null;
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole().getId(),
                currentUserService.getRoleName(user), user.getName(), user.getStatus(), user.getAvatarUrl(),
                refreshToken, user.isEmailConfirmed(), message);
    }

    // Only the hash is stored, like a password.
    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
