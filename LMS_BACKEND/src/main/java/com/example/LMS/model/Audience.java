package com.example.LMS.model;

// Who can see a quiz or an assignment.
// ALL    = every student enrolled in the course (the old behaviour, also used when the value is empty)
// GROUPS = only enrolled students who are in one of the chosen groups
// LINK   = only students who opened the quiz with its join code (quizzes only)
public enum Audience {
    ALL, GROUPS, LINK
}
