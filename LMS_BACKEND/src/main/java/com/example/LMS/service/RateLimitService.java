package com.example.LMS.service;

import com.example.LMS.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Counts tries in memory and blocks for a while after too many:
//  - wrong passwords: per email + computer (IP), and per computer for many emails;
//  - forgot-password / resend-verification emails: per email.
// Memory only, so a restart clears it. With several servers behind a load balancer, move this to Redis.
@Service
public class RateLimitService {

    private final int maxLoginFailures;
    private final int maxEmailRequests;
    private final long windowMs;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public RateLimitService(@Value("${app.security.login.max-attempts:5}") int maxLoginFailures,
                            @Value("${app.security.email-requests.max:5}") int maxEmailRequests,
                            @Value("${app.security.login.window-minutes:15}") long windowMinutes) {
        this.maxLoginFailures = maxLoginFailures;
        this.maxEmailRequests = maxEmailRequests;
        this.windowMs = windowMinutes * 60_000L;
    }

    // Call before checking the password.
    public void checkLogin(String email, String ip) {
        check("login:" + email + "|" + ip, maxLoginFailures,
                "Too many wrong passwords. Please wait %s and try again, or reset your password");
        // One computer trying many different emails.
        check("login-ip:" + ip, maxLoginFailures * 4, "Too many failed logins from this network. Please wait %s");
    }

    public void loginFailed(String email, String ip) {
        add("login:" + email + "|" + ip);
        add("login-ip:" + ip);
    }

    public void loginSucceeded(String email, String ip) {
        hits.remove("login:" + email + "|" + ip);
    }

    // Forgot password / resend verification: counts every request, not only failures.
    public void checkEmailRequest(String kind, String email) {
        String key = kind + ":" + email;
        check(key, maxEmailRequests, "Too many emails asked for. Please wait %s and try again");
        add(key);
    }

    private void check(String key, int max, String message) {
        Deque<Long> times = hits.get(key);
        if (times == null) {
            return;
        }
        synchronized (times) {
            prune(times);
            if (times.size() >= max) {
                long waitSeconds = Math.max(1, (times.peekFirst() + windowMs - System.currentTimeMillis()) / 1000);
                throw new TooManyRequestsException(message.formatted(readable(waitSeconds)), waitSeconds);
            }
        }
    }

    private void add(String key) {
        Deque<Long> times = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            prune(times);
            times.addLast(System.currentTimeMillis());
        }
        if (hits.size() > 50_000) {
            cleanUp();
        }
    }

    private void prune(Deque<Long> times) {
        long oldest = System.currentTimeMillis() - windowMs;
        while (!times.isEmpty() && times.peekFirst() < oldest) {
            times.pollFirst();
        }
    }

    // Stops the map from growing forever.
    private void cleanUp() {
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                prune(e.getValue());
                return e.getValue().isEmpty();
            }
        });
    }

    private static String readable(long seconds) {
        long minutes = (seconds + 59) / 60;
        return minutes <= 1 ? "a minute" : minutes + " minutes";
    }
}
