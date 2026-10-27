package com.example.LMS.service;

import com.example.LMS.DTO.NotificationResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.model.Notification;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.User;
import com.example.LMS.repository.NotificationRepository;
import com.example.LMS.websocket.NotificationSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// Creates and reads the messages shown under the bell icon.
// Other services call notify(...) when something happens (graded, enrolled, approved, ...).
// Each new notification is also pushed live to the user's open browser tabs (WebSocket)
// and, for the types in app.mail.notify-types, sent by email.
@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private NotificationSocketHandler socketHandler;

    @Autowired
    private MailService mailService;

    private Set<NotificationType> emailTypes = EnumSet.noneOf(NotificationType.class);

    @Value("${app.mail.notify-types:}")
    void setEmailTypes(String types) {
        emailTypes = Arrays.stream(types.split(","))
                .map(String::trim).filter(t -> !t.isEmpty())
                .flatMap(t -> Arrays.stream(NotificationType.values()).filter(v -> v.name().equalsIgnoreCase(t)))
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(NotificationType.class)));
    }

    public void notify(User user, NotificationType type, String message, String link) {
        if (user == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setMessage(message);
        notification.setLink(link);
        notification.setReadFlag(false);
        Notification saved = notificationRepository.save(notification);

        // Push and email only after the database change is really saved (not rolled back).
        Runnable afterSave = () -> {
            pushLive(user.getId(), saved);
            if (emailTypes.contains(type)) {
                mailService.sendNotification(user.getEmail(), user.getName(), subjectFor(type), message, link);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    afterSave.run();
                }
            });
        } else {
            afterSave.run();
        }
    }

    // {"type":"NOTIFICATION","notification":{...},"unread":3}
    private void pushLive(Integer userId, Notification n) {
        try {
            long unread = notificationRepository.countByUserAndReadFlagFalse(n.getUser());
            String json = "{\"type\":\"NOTIFICATION\",\"unread\":" + unread + ",\"notification\":{"
                    + "\"id\":" + n.getId()
                    + ",\"type\":" + quote(n.getType() != null ? n.getType().name() : null)
                    + ",\"message\":" + quote(n.getMessage())
                    + ",\"link\":" + quote(n.getLink())
                    + ",\"read\":false"
                    + ",\"createdAt\":" + quote(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null)
                    + "}}";
            socketHandler.sendToUser(userId, json);
        } catch (Exception ignored) {
            // Live push is a bonus; the bell still finds it on the next load.
        }
    }

    private static String subjectFor(NotificationType type) {
        return switch (type) {
            case ACCOUNT_APPROVED -> "Your Learnly account is ready";
            case ACCOUNT_STATUS -> "Your Learnly account status changed";
            case ASSIGNMENT_GRADED -> "Your assignment was graded";
            case NEW_ASSIGNMENT -> "New assignment in your course";
            case ANNOUNCEMENT -> "New announcement in your course";
            case QUESTION_ANSWERED -> "Your question got an answer";
            case QUESTION_ASKED -> "A student asked a question";
            case NEW_ENROLLMENT -> "New student in your course";
            case SUBMISSION_RECEIVED -> "New assignment submission";
            case COURSE_COMPLETED -> "Course completed. Well done!";
            case NEW_REVIEW -> "New review on your course";
            case ADDED_TO_GROUP -> "You were added to a group";
        };
    }

    private static String quote(String value) {
        if (value == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20 || c == '<' || c == '>') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    public List<NotificationResponse> getMyNotifications() {
        User user = currentUserService.getCurrentUser();
        return notificationRepository.findTop50ByUserOrderByCreatedAtDesc(user).stream().map(this::toResponse).toList();
    }

    public Map<String, Long> unreadCount() {
        User user = currentUserService.getCurrentUser();
        return Map.of("unread", notificationRepository.countByUserAndReadFlagFalse(user));
    }

    public NotificationResponse markRead(Integer id) {
        User user = currentUserService.getCurrentUser();
        Notification notification = notificationRepository.findById(id)
                .filter(n -> n.getUser().getId().equals(user.getId())) // only your own
                .orElseThrow(() -> new ResourseNotFoundException("Notification not found with id " + id));
        notification.setReadFlag(true);
        return toResponse(notificationRepository.save(notification));
    }

    public void markAllRead() {
        User user = currentUserService.getCurrentUser();
        List<Notification> unread = notificationRepository.findByUserAndReadFlagFalse(user);
        unread.forEach(n -> n.setReadFlag(true));
        notificationRepository.saveAll(unread);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getMessage(), n.getLink(),
                Boolean.TRUE.equals(n.getReadFlag()), n.getCreatedAt());
    }
}
