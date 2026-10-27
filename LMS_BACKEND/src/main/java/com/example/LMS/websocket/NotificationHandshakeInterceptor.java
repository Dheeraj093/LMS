package com.example.LMS.websocket;

import com.example.LMS.config.JwtService;
import com.example.LMS.model.User;
import com.example.LMS.model.UserStatus;
import com.example.LMS.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

// Checks the access token sent as ?token= when the browser opens the WebSocket.
// Browsers cannot add an Authorization header to a WebSocket, so the token travels in the URL.
@Component
public class NotificationHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public NotificationHandshakeInterceptor(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
        try {
            String email = jwtService.extractUser(token);
            User user = userRepository.findByEmailIgnoreCase(email);
            if (user != null && user.getStatus() == UserStatus.ACTIVE && jwtService.validateUser(user, token)) {
                attributes.put(NotificationSocketHandler.USER_ID, user.getId());
                return true;
            }
        } catch (Exception ignored) {
            // bad, expired or missing token
        }
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // nothing to do
    }
}
