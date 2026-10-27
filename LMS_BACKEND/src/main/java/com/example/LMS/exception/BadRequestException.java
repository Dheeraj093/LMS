package com.example.LMS.exception;

// Thrown when the request is understood but not allowed by a business rule
// (for example: passing marks bigger than total marks). Returns HTTP 400.
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
