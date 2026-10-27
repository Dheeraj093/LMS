package com.example.LMS.model;

// ACTIVE  = can log in.
// PENDING = a teacher who registered and waits for an admin to approve.
// BLOCKED = stopped by an admin; old tokens stop working too.
public enum UserStatus {
    ACTIVE, PENDING, BLOCKED
}
