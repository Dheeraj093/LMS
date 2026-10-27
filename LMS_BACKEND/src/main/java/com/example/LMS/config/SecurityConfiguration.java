package com.example.LMS.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // turns on @PreAuthorize("hasRole('...')") on controller methods
public class SecurityConfiguration {

    @Autowired
    private MyUserDatilsService myUserDatilsService;

    @Autowired
    private JwtFiter jwtFiter;

    // Comma separated list, for example: http://localhost:5173,https://lms.example.com
    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable()); // safe here: we use tokens in a header, not cookies
        http.cors(Customizer.withDefaults()); // uses the corsConfigurationSource bean below
        http.authorizeHttpRequests(request -> request
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/auth/register", "/auth/login", "/auth/forgot-password", "/auth/reset-password",
                        "/auth/refresh", "/auth/logout", "/auth/verify-email", "/auth/resend-verification").permitAll()
                // The WebSocket handshake checks the ?token= itself (browsers cannot send headers there).
                .requestMatchers("/ws/**").permitAll()
                // Checked inside the controller: public files are open, private ones need a link token.
                .requestMatchers(HttpMethod.GET, "/files/*/content").permitAll()
                .requestMatchers(HttpMethod.GET, "/certificates/verify/**").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated());
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        // The frontend shows lesson PDFs inside the page (an iframe). The default "X-Frame-Options: DENY" blocks that,
        // so instead only the frontend's own addresses may frame responses from this API.
        String frameAncestors = "frame-ancestors 'self' " + String.join(" ",
                Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        http.headers(headers -> headers
                .frameOptions(frame -> frame.disable())
                .contentSecurityPolicy(csp -> csp.policyDirectives(frameAncestors)));

        // Same JSON error shape as GlobalExceptionHandler, for errors raised before a controller runs.
        http.exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) -> writeError(res, 401, "Please log in again"))
                .accessDeniedHandler((req, res, e) -> writeError(res, 403, "You do not have permission to do this")));

        http.addFilterBefore(jwtFiter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse res, int status, String message) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.getWriter().write("{\"message\":\"" + message + "\",\"status\":" + status
                + ",\"timestamp\":\"" + LocalDateTime.now() + "\"}");
    }

    // One CORS rule for every controller (replaces @CrossOrigin on each controller).
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setExposedHeaders(List.of("Content-Disposition")); // lets the browser read download file names
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // One shared encoder: used for register (hash) and login (compare).
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationProvider authenticationProvider(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider(myUserDatilsService);
        authenticationProvider.setPasswordEncoder(passwordEncoder);
        return authenticationProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
