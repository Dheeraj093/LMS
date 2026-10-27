package com.example.LMS.controller;

import com.example.LMS.DTO.NotificationResponse;
import com.example.LMS.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Notification APIs")
@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Operation(summary = "My latest 50 notifications")
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMine() {
        return ResponseEntity.ok(notificationService.getMyNotifications());
    }

    @Operation(summary = "Number of unread notifications (for the bell badge)")
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(notificationService.unreadCount());
    }

    @Operation(summary = "Mark one as read")
    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable Integer id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    @Operation(summary = "Mark all as read")
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
