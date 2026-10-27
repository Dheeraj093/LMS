package com.example.LMS.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// Keeps the open browser connections of each user and pushes new notifications to them.
// The browser connects to ws://<api>/ws/notifications?token=<access token>; the token is checked by
// NotificationHandshakeInterceptor before this class sees the connection.
// Memory only: with several servers, use a message broker (Redis pub/sub) instead.
@Component
public class NotificationSocketHandler extends TextWebSocketHandler {

    public static final String USER_ID = "userId";
    private static final Logger log = LoggerFactory.getLogger(NotificationSocketHandler.class);

    private final Map<Integer, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Integer userId = (Integer) session.getAttributes().get(USER_ID);
        // The decorator makes sending safe from many threads at once.
        WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, 5000, 64 * 1024);
        sessions.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet()).add(safe);
        send(safe, "{\"type\":\"CONNECTED\"}");
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // The browser sends "ping" to keep the connection alive through proxies.
        if ("ping".equals(message.getPayload())) {
            try {
                session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
            } catch (IOException ignored) {
                // closed meanwhile
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Integer userId = (Integer) session.getAttributes().get(USER_ID);
        Set<WebSocketSession> set = sessions.get(userId);
        if (set != null) {
            set.removeIf(s -> s.getId().equals(session.getId()));
            if (set.isEmpty()) {
                sessions.remove(userId);
            }
        }
    }

    // Sends the JSON text to every open tab/device of this user.
    public void sendToUser(Integer userId, String json) {
        Set<WebSocketSession> set = sessions.get(userId);
        if (set == null) {
            return;
        }
        for (WebSocketSession s : set) {
            send(s, json);
        }
    }

    // Used after a password change or block: close that user's live connections.
    public void disconnectUser(Integer userId) {
        Set<WebSocketSession> set = sessions.remove(userId);
        if (set != null) {
            set.forEach(s -> {
                try {
                    s.close(CloseStatus.POLICY_VIOLATION);
                } catch (IOException ignored) {
                    // already closed
                }
            });
        }
    }

    public int openConnections() {
        return sessions.values().stream().mapToInt(Set::size).sum();
    }

    private void send(WebSocketSession session, String json) {
        if (!session.isOpen()) {
            return;
        }
        try {
            session.sendMessage(new TextMessage(json));
        } catch (Exception ex) {
            log.debug("Could not push to a WebSocket: {}", ex.getMessage());
        }
    }
}
