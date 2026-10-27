package com.example.LMS.controller;

import com.example.LMS.DTO.AuthResponse;
import com.example.LMS.DTO.ChangePasswordRequest;
import com.example.LMS.DTO.ForgotPasswordRequest;
import com.example.LMS.DTO.ProfileRequest;
import com.example.LMS.DTO.ResetPasswordRequest;
import com.example.LMS.DTO.UserResponse;
import com.example.LMS.DTO.LoginRequest;
import com.example.LMS.DTO.RefreshRequest;
import com.example.LMS.DTO.RegisterRequest;
import com.example.LMS.DTO.VerifyEmailRequest;
import com.example.LMS.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "User APIs")
@RequestMapping("/auth")
@RestController
public class UserController {

    @Autowired
    private UserService userService;

    @Operation(summary = "User Register")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        return new ResponseEntity<>(userService.registerUser(registerRequest), HttpStatus.CREATED);
    }

    @Operation(summary = "Ask for a password reset link (always answers the same way)")
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(userService.forgotPassword(request.email()));
    }

    @Operation(summary = "Set a new password with the code from the reset link")
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(userService.resetPassword(request));
    }

    @Operation(summary = "The logged-in user")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe() {
        return ResponseEntity.ok(userService.getMe());
    }

    @Operation(summary = "Update my name and picture")
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(userService.updateMe(request));
    }

    @Operation(summary = "Change my password (returns a new token; other devices are logged out)")
    @PutMapping("/change-password")
    public ResponseEntity<AuthResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(userService.changePassword(request));
    }

    // A wrong email/password now throws BadCredentialsException, which GlobalExceptionHandler turns into 401.
    // Too many wrong passwords for one email from one computer answers 429 for a while.
    // Behind a proxy (Nginx, Render, ...) set server.forward-headers-strategy=framework so the real IP is used.
    @Operation(summary = "User Login (returns a short access token and a refresh token)")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest http) {
        return ResponseEntity.ok(userService.loginUser(loginRequest, http.getRemoteAddr()));
    }

    @Operation(summary = "Get a new access token with the refresh token (the refresh token is replaced too)")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(userService.refresh(request.refreshToken()));
    }

    @Operation(summary = "Log out this device (cancels its refresh token)")
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestBody(required = false) RefreshRequest request) {
        return ResponseEntity.ok(userService.logout(request != null ? request.refreshToken() : null));
    }

    @Operation(summary = "Confirm the email with the code from the verification link")
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(userService.verifyEmail(request.token()));
    }

    @Operation(summary = "Send the verification email again (always answers the same way)")
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(userService.resendVerification(request.email()));
    }
}
