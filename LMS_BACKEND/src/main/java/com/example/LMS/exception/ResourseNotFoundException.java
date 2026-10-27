package com.example.LMS.exception;

public class ResourseNotFoundException extends RuntimeException{
    public ResourseNotFoundException(String message){
        super(message);
    }
}
