package com.example.LMS.exception;

import org.springframework.security.authentication.BadCredentialsException;

// The refresh token is unknown, expired or cancelled: the user must log in again. Returns HTTP 401.
public class SessionExpiredException extends BadCredentialsException {
    public SessionExpiredException() {
        super("Your session has ended. Please log in again");
    }
}
