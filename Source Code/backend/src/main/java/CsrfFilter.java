
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

    private final ConcurrentHashMap<String, String> csrfTokens = new ConcurrentHashMap<>();

    public String generateToken(String sessionToken) {
        String csrfToken = UUID.randomUUID().toString();
        csrfTokens.put(sessionToken, csrfToken);
        return csrfToken;
    }

    public void invalidateToken(String sessionToken) {
        csrfTokens.remove(sessionToken);
    }

    public boolean validateToken(String sessionToken, String csrfToken) {
        if (sessionToken == null || csrfToken == null) {
            return false;
        }
        String stored = csrfTokens.get(sessionToken);
        return stored != null && stored.equals(csrfToken);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {

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
