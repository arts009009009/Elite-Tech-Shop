package com.eliteshop.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000}")
    private String[] allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        List<String> origins = Arrays.stream(allowedOrigins)
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();
        
        if (!origins.isEmpty()) {
            config.setAllowedOrigins(origins);
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
        return new CorsFilter(source);
    }
}
