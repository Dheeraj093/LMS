package com.example.LMS.config;

import com.example.LMS.service.ActivityService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Runs once for every request. If there is a valid "Authorization: Bearer <token>"
// header, it loads the user and marks the request as logged in.
// A bad or expired token is ignored here: the request continues as "not logged in"
// and Spring Security answers 401 for protected URLs.
@Component
public class JwtFiter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MyUserDatilsService userDetailsService;

    @Autowired
    @Lazy
    private ActivityService activityService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = header.substring(7);
            try {
                String username = jwtService.extractUser(token);
                UserPrinciple principal = (UserPrinciple) userDetailsService.loadUserByUsername(username);
                // isEnabled = status ACTIVE. Blocked or pending users are rejected even with an old token.
                if (principal.isEnabled() && jwtService.validateUser(principal.getUser(), token)) {
                    UsernamePasswordAuthenticationToken authenticationToken =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                    // Records "active today" (at most one database write per user per day).
                    activityService.touch(principal.getUser());
                }
            } catch (JwtException | IllegalArgumentException | UsernameNotFoundException ex) {
                // Invalid, expired or unknown-user token: stay anonymous.
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
