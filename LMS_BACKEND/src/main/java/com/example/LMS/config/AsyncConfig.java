package com.example.LMS.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

// Lets @Async methods (sending email) run in the background, so a slow mail server never slows an API call.
@Configuration
@EnableAsync
public class AsyncConfig {
}
