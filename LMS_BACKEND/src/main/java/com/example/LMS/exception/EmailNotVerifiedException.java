package com.example.LMS.exception;

// The password is right but the user has not clicked the link in the verification email yet.
// Returns HTTP 403 with "code": "EMAIL_NOT_VERIFIED" so the frontend can show a "send again" button.
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
