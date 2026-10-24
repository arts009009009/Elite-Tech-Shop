package com.eliteshop.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.logging.Logger;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = Logger.getLogger(SecurityConfig.class.getName());

    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Spring's built-in CSRF protection is disabled ON PURPOSE: it requires a
            // session-bound token no client ever sends, so it 403s every POST/PUT/DELETE
            // before it reaches a controller. The app's own CSRF defense is CsrfFilter
            // (double-submit token bound to the session) plus the origin allow-list in
            // CorsConfig — do NOT re-enable Spring's CSRF without removing those.
            .csrf(AbstractHttpConfigurer::disable)
            // Use the injected CorsConfig bean (allowed origins actually populated via
            // @Value). Never `new CorsConfig()` here — @Value never injects on plain
            // instances, allowedOrigins stays null and every request with an Origin
            // header is rejected with 403 "Invalid CORS request".
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/health").permitAll()
                // Public status/landing page (no sensitive data).
                .requestMatchers("/").permitAll()
                // Only the health probe is public; env/info/etc. require authentication.
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .contentTypeOptions(cto -> {})
                .frameOptions(FrameOptionsConfig::deny)
                .xssProtection(xss -> xss
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)
                )
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                    .preload(true)
                )
                .referrerPolicy(referrer -> referrer
                    .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=(), payment=()")
                )
            );
        // NOTE: RequestLoggingFilter and SecurityHeadersFilter are @Component @Order(1)/(2)
        // and auto-registered by Boot as servlet filters. Do NOT add them to this chain
        // as well — that registers each of them twice.

        log.info("Security configuration initialized");
        return http.build();
    }
}
