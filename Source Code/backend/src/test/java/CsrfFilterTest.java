
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@SuppressWarnings("null")
class CsrfFilterTest {

    private CsrfFilter csrfFilter;

    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private FilterChain filterChain;

    private StringWriter responseWriter;

    @BeforeEach
    void setUp() throws IOException {
        csrfFilter = new CsrfFilter();
        responseWriter = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));
    }

    // --- doFilterInternal tests ---

    @Test
    void doGetRequest_passesThrough() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("GET");
        when(request.getCookies()).thenReturn(null);

        csrfFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void doOptionsRequest_passesThrough() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("OPTIONS");
        when(request.getCookies()).thenReturn(null);

        csrfFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void doPostRequest_withoutSessionCookie_returns403() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("POST");
        when(request.getCookies()).thenReturn(null);

        csrfFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(filterChain, never()).doFilter(request, response);
        assertTrue(responseWriter.toString().contains("missing_session"));
    }

    @Test
    void doPostRequest_withSessionButInvalidCsrf_returns403() throws ServletException, IOException {
        String sessionToken = "session-abc";
        csrfFilter.generateToken(sessionToken);

        Cookie[] cookies = new Cookie[]{new Cookie("admin_session", sessionToken)};
        when(request.getMethod()).thenReturn("POST");
        when(request.getCookies()).thenReturn(cookies);
        when(request.getHeader("X-CSRF-Token")).thenReturn("wrong-csrf-token");

        csrfFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(filterChain, never()).doFilter(request, response);
        assertTrue(responseWriter.toString().contains("invalid_csrf_token"));
    }

    @Test
    void doPostRequest_withValidCsrfToken_passesThrough() throws ServletException, IOException {
        String sessionToken = "session-xyz";
        String csrfToken = csrfFilter.generateToken(sessionToken);

        Cookie[] cookies = new Cookie[]{new Cookie("admin_session", sessionToken)};
        when(request.getMethod()).thenReturn("POST");
        when(request.getCookies()).thenReturn(cookies);
        when(request.getHeader("X-CSRF-Token")).thenReturn(csrfToken);

        csrfFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    // --- generateToken / validateToken tests ---

    @Test
    void generateAndValidateToken_returnsTrue() {
        String csrfToken = csrfFilter.generateToken("session-1");
        assertTrue(csrfFilter.validateToken("session-1", csrfToken));
    }

    @Test
    void validateToken_withWrongCsrfToken_returnsFalse() {
        csrfFilter.generateToken("session-2");
        assertFalse(csrfFilter.validateToken("session-2", "totally-wrong"));
    }

    @Test
    void validateToken_withNullSessionToken_returnsFalse() {
        assertFalse(csrfFilter.validateToken(null, "some-csrf"));
    }

    @Test
    void validateToken_withNullCsrfToken_returnsFalse() {
        csrfFilter.generateToken("session-3");
        assertFalse(csrfFilter.validateToken("session-3", null));
    }

    @Test
    void invalidateToken_removesStoredToken() {
        String csrfToken = csrfFilter.generateToken("session-4");
        csrfFilter.invalidateToken("session-4");
        assertFalse(csrfFilter.validateToken("session-4", csrfToken));
    }

    // --- POST with empty session cookie ---

    @Test
    void doPostRequest_withEmptySessionCookie_returns403() throws ServletException, IOException {
        Cookie[] cookies = new Cookie[]{new Cookie("admin_session", "")};
        when(request.getMethod()).thenReturn("POST");
        when(request.getCookies()).thenReturn(cookies);

        csrfFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        assertTrue(responseWriter.toString().contains("missing_session"));
    }
}
