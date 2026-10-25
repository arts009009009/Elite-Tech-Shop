package com.eliteshop.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS allow-list, registered in the security chain via the injected
 * {@link CorsConfigurationSource} bean. Must always be used as a Spring bean —
 * instantiating it with {@code new} skips @Value injection, leaves
 * allowedOrigins null and makes CorsFilter reject every cross-origin request.
 */
@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000}")
    private String[] allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        if (allowedOrigins != null) {
            List<String> origins = Arrays.stream(allowedOrigins)
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
            
            if (!origins.isEmpty()) {
                config.setAllowedOrigins(origins);
            }
        }
        
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of(
            "Content-Type", 
            "Authorization", 
            "X-Requested-With", 
            "X-CSRF-Token",
            "X-Forwarded-For"
        ));
        config.setExposedHeaders(List.of(
            "X-CSRF-Token",
            "X-Request-Id",
            "X-RateLimit-Remaining"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
