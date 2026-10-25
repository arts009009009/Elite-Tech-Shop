package com.eliteshop.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CsrfFilter extends OncePerRequestFilter {

    /** Pre-auth endpoints that run before any session cookie exists. */
    private static final Set<String> PUBLIC_PATHS = Set.of(
        "/api/auth/send-password",
        "/api/auth/login",
        "/api/auth/register"
    );

    private static final class TokenEntry {
        private final String token;
        private final long createdAt;

        TokenEntry(String token, long createdAt) {
            this.token = token;
            this.createdAt = createdAt;
        }
    }

    /** sessionToken -> csrfToken + creation time (creation time enables TTL pruning). */
    private final ConcurrentHashMap<String, TokenEntry> csrfTokens = new ConcurrentHashMap<>();

    public String generateToken(String sessionToken) {
        return generateToken(sessionToken, System.currentTimeMillis());
    }

    /** Package-private overload with explicit creation time, used by tests. */
    String generateToken(String sessionToken, long createdAt) {
        String csrfToken = UUID.randomUUID().toString();
        csrfTokens.put(sessionToken, new TokenEntry(csrfToken, createdAt));
        return csrfToken;
    }

    public void invalidateToken(String sessionToken) {
        csrfTokens.remove(sessionToken);
    }

    /**
     * Drops tokens older than maxAgeMs. Sessions live at most SESSION_TTL_MS, so a
     * CSRF token older than that can never pair with a live session again; without
     * this the map grows forever because tokens are only removed on /logout.
     * Called from AuthController's cleanup thread.
     */
    public void pruneExpiredTokens(long maxAgeMs) {
        long cutoff = System.currentTimeMillis() - maxAgeMs;
        csrfTokens.entrySet().removeIf(entry -> entry.getValue().createdAt < cutoff);
    }

    public boolean validateToken(String sessionToken, String csrfToken) {
        if (sessionToken == null || csrfToken == null) {
            return false;
        }
        TokenEntry stored = csrfTokens.get(sessionToken);
        return stored != null && stored.token.equals(csrfToken);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String method = request.getMethod();
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String requestUri = request.getRequestURI();
        if (requestUri != null && PUBLIC_PATHS.contains(requestUri)) {
            filterChain.doFilter(request, response);
            return;
        }

        String sessionToken = extractSessionToken(request);
        String csrfToken = request.getHeader("X-CSRF-Token");

        if (sessionToken == null || sessionToken.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"error\":\"missing_session\"}");
            return;
        }

        if (!validateToken(sessionToken, csrfToken)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"error\":\"invalid_csrf_token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractSessionToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("admin_session".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
