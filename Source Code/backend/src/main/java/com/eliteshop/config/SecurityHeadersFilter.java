package com.eliteshop.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.UUID;

@Component
@Order(2)
public class SecurityHeadersFilter implements Filter {
    
    private static final String[] SECURE_HEADERS = {
        "X-Content-Type-Options", "nosniff",
        "X-Frame-Options", "DENY",
        "X-XSS-Protection", "1; mode=block",
        "Referrer-Policy", "strict-origin-when-cross-origin",
        "Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload",
        "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()",
        "Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    };
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (!(response instanceof HttpServletResponse res)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest req = request instanceof HttpServletRequest ? (HttpServletRequest) request : null;

        for (int i = 0; i < SECURE_HEADERS.length; i += 2) {
            res.setHeader(SECURE_HEADERS[i], SECURE_HEADERS[i + 1]);
        }

        String requestId = UUID.randomUUID().toString();
        res.setHeader("X-Request-Id", requestId);

        String path = req != null ? req.getRequestURI() : null;
        if (path != null && !path.startsWith("/api/auth") && !path.startsWith("/actuator")) {
            res.setHeader("Cache-Control", "no-store, max-age=0");
        }

        chain.doFilter(request, response);
    }
}
