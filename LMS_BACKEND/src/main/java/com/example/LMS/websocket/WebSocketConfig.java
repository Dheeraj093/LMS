package com.example.LMS.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

// Live notifications: ws://<api>/ws/notifications?token=<access token>.
// Only the frontend addresses from app.cors.allowed-origins may connect.
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationSocketHandler handler;
    private final NotificationHandshakeInterceptor interceptor;
    private final String allowedOrigins;

    public WebSocketConfig(NotificationSocketHandler handler, NotificationHandshakeInterceptor interceptor,
                           @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        this.handler = handler;
        this.interceptor = interceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/notifications")
                .addInterceptors(interceptor)
                .setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toArray(String[]::new));
    }
}
