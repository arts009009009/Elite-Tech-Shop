package com.eliteshop.controller;

import com.eliteshop.config.CsrfFilter;
import com.eliteshop.model.AuthRequest;
import com.eliteshop.model.PendingPasswordDocument;
import com.eliteshop.model.RegisterRequest;
import com.eliteshop.model.SessionDocument;
import com.eliteshop.model.UserDocument;
import com.eliteshop.repository.PendingPasswordRepository;
import com.eliteshop.repository.SessionRepository;
import com.eliteshop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private PendingPasswordRepository pendingPasswordRepository;

    private CsrfFilter csrfFilter;
    private AuthController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse httpResponse;

    @BeforeEach
    void setUp() {
        csrfFilter = new CsrfFilter();
        controller = new AuthController(userRepository, sessionRepository,
                pendingPasswordRepository, csrfFilter);
        request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");
        httpResponse = new MockHttpServletResponse();
    }

    // --- sendPassword tests ---

    @Test
    @SuppressWarnings("null")
    void sendPassword_withRegisteredEmail_savesOtpAndReturnsSuccess() {
        when(userRepository.findByEmail("test@example.com"))
                .thenReturn(Optional.of(new UserDocument("test@example.com", "hash", "test")));
        when(pendingPasswordRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        Map<String, String> body = Map.of("email", "test@example.com");
        ResponseEntity<Map<String, Object>> result = controller.sendPassword(body, request);

        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
        assertEquals("test@example.com", responseBody.get("email"));
        verify(pendingPasswordRepository).save(any());
    }

    @Test
    @SuppressWarnings("null")
    void sendPassword_withUnknownEmail_returnsGenericSuccessWithoutOtp() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        Map<String, String> body = Map.of("email", "ghost@example.com");
        ResponseEntity<Map<String, Object>> result = controller.sendPassword(body, request);

        // Response shape is identical to a registered email so callers cannot
        // probe which accounts exist — but no OTP is minted or persisted.
        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
        assertEquals("If the email is registered, an OTP has been sent", responseBody.get("message"));
        verify(pendingPasswordRepository, never()).save(any());
    }

    @Test
    void sendPassword_withBlankEmail_returnsError() {
        Map<String, String> body = Map.of("email", "   ");
        ResponseEntity<Map<String, Object>> result = controller.sendPassword(body, request);

        assertEquals(400, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("email_required", responseBody.get("error"));
    }

    @Test
    void sendPassword_withNullEmail_returnsError() {
        Map<String, String> body = Map.of();
        ResponseEntity<Map<String, Object>> result = controller.sendPassword(body, request);

        assertEquals(400, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("email_required", responseBody.get("error"));
    }

    @Test
    @SuppressWarnings("null")
    void sendPassword_rateLimited_afterFiveAttempts_perIpAndEmail() {
        when(userRepository.findByEmail("flood@example.com"))
                .thenReturn(Optional.of(new UserDocument("flood@example.com", "hash", "flood")));
        when(pendingPasswordRepository.findByEmail("flood@example.com")).thenReturn(Optional.empty());

        Map<String, String> body = Map.of("email", "flood@example.com");
        for (int i = 0; i < 5; i++) {
            assertEquals(200, controller.sendPassword(body, request).getStatusCode().value());
        }

        ResponseEntity<Map<String, Object>> sixth = controller.sendPassword(body, request);
        assertEquals(429, sixth.getStatusCode().value());
        Map<String, Object> responseBody = sixth.getBody();
        assertNotNull(responseBody);
        assertEquals("rate_limit_exceeded", responseBody.get("error"));

        // Keys are ip+email: a different IP for the same email is not blocked.
        MockHttpServletRequest otherIp = new MockHttpServletRequest();
        otherIp.setRemoteAddr("192.0.2.11");
        assertEquals(200, controller.sendPassword(body, otherIp).getStatusCode().value());
    }

    // --- register tests ---

    @Test
    @SuppressWarnings("null")
    void register_withValidData_returnsSuccess() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> result = controller.register(req);

        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
        assertNotNull(responseBody.get("token"));
        // atLeastOnce: the startup admin seed also saves a user document.
        verify(userRepository, atLeastOnce()).save(any());
        verify(sessionRepository).save(any());
    }

    @Test
    void register_withShortPassword_returnsError() {
        RegisterRequest req = new RegisterRequest("bob@example.com", "123", "bob");
        ResponseEntity<Map<String, Object>> result = controller.register(req);

        assertEquals(400, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("password_too_short", responseBody.get("error"));
    }

    @Test
    void register_withBlankUsername_returnsError() {
        RegisterRequest req = new RegisterRequest("bob@example.com", "password123", "  ");
        ResponseEntity<Map<String, Object>> result = controller.register(req);

        assertEquals(400, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertEquals("username_required", responseBody.get("error"));
    }

    @Test
    void register_withExistingUsername_returns409() {
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> result = controller.register(req);

        assertEquals(409, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("username_exists", responseBody.get("error"));
    }

    @Test
    void register_withDuplicateEmail_returns409Not500() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> result = controller.register(req);

        assertEquals(409, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("email_exists", responseBody.get("error"));
        // The admin seed may save its own document; the rejected user must not be saved.
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.argThat(
            user -> user != null && "alice@example.com".equals(user.getEmail())));
    }

    @Test
    @SuppressWarnings("null")
    void register_withNullEmail_usesDefaultEmail() {
        when(userRepository.existsByUsername("charlie")).thenReturn(false);
        when(userRepository.existsByEmail("charlie@elite.shop")).thenReturn(false);

        RegisterRequest req = new RegisterRequest(null, "password123", "charlie");
        ResponseEntity<Map<String, Object>> result = controller.register(req);

        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
    }

    @Test
    @SuppressWarnings("null")
    void register_withMongoDown_returns503AndNoSession() {
        when(pendingPasswordRepository.count()).thenThrow(new RuntimeException("mongo down"));
        AuthController offline = new AuthController(userRepository, sessionRepository,
                pendingPasswordRepository, csrfFilter);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> result = offline.register(req);

        // No phantom session for a user that would only exist in memory.
        assertEquals(503, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("storage_unavailable", responseBody.get("error"));
        verify(sessionRepository, never()).save(any());
    }

    // --- login tests ---

    @Test
    @SuppressWarnings("null")
    void login_withValidOtp_returnsSessionAndConsumesOtp() {
        PendingPasswordDocument pending = new PendingPasswordDocument("otp@example.com", "123456");
        when(pendingPasswordRepository.findByEmail("otp@example.com"))
                .thenReturn(Optional.of(pending), Optional.empty());

        ResponseEntity<Map<String, Object>> first = controller.login(
                new AuthRequest("otp@example.com", "123456"), request, httpResponse);

        assertEquals(200, first.getStatusCode().value());
        Map<String, Object> firstBody = first.getBody();
        assertNotNull(firstBody);
        assertTrue((Boolean) firstBody.get("success"));
        assertNotNull(firstBody.get("token"));
        assertNotNull(httpResponse.getCookie("admin_session"));
        // Single-use: the pending OTP is deleted on read.
        verify(pendingPasswordRepository).delete(pending);

        ResponseEntity<Map<String, Object>> second = controller.login(
                new AuthRequest("otp@example.com", "123456"), request, httpResponse);
        assertEquals(401, second.getStatusCode().value());
    }

    @Test
    void login_withNonOtpShapedPassword_neverTouchesPendingOtp() {
        // "not-a-otp" is not a valid 6-digit OTP shape, so the OTP path must be
        // skipped entirely: nothing is consumed or compared, we fall through to
        // password auth and end up with invalid credentials.
        ResponseEntity<Map<String, Object>> result = controller.login(
                new AuthRequest("otp@example.com", "not-a-otp"), request, httpResponse);

        assertEquals(401, result.getStatusCode().value());
        verify(pendingPasswordRepository, never()).delete(any());
        verify(pendingPasswordRepository, never()).save(any());
    }

    @Test
    void login_withUnknownCredentials_returns401() {
        ResponseEntity<Map<String, Object>> result = controller.login(
                new AuthRequest("nobody@example.com", "hunter22"), request, httpResponse);

        assertEquals(401, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("invalid_credentials", responseBody.get("error"));
    }

    @Test
    @SuppressWarnings("null")
    void login_withMongoDown_seededAdminCanStillLogIn() {
        when(pendingPasswordRepository.count()).thenThrow(new RuntimeException("mongo down"));
        AuthController offline = new AuthController(userRepository, sessionRepository,
                pendingPasswordRepository, csrfFilter);

        ResponseEntity<Map<String, Object>> result = offline.login(
                new AuthRequest("admin@elite.shop", "admin"), request, httpResponse);

        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
        assertNotNull(responseBody.get("token"));
        assertNotNull(httpResponse.getCookie("admin_session"));
        // No Mongo session was written.
        verify(sessionRepository, never()).save(any());
    }

    // --- logout tests ---

    @Test
    void logout_withEmptyToken_clearsCookie() {
        ResponseEntity<Map<String, Object>> result = controller.logout("", request, httpResponse);

        assertEquals(200, result.getStatusCode().value());
        jakarta.servlet.http.Cookie cookie = httpResponse.getCookie("admin_session");
        assertNotNull(cookie);
        assertEquals(0, cookie.getMaxAge());
    }

    @Test
    @SuppressWarnings("null")
    void logout_resetsRateLimitKeysForSessionEmail() {
        when(pendingPasswordRepository.count()).thenThrow(new RuntimeException("mongo down"));
        AuthController offline = new AuthController(userRepository, sessionRepository,
                pendingPasswordRepository, csrfFilter);

        ResponseEntity<Map<String, Object>> loginResult = offline.login(
                new AuthRequest("admin@elite.shop", "admin"), request, httpResponse);
        assertEquals(200, loginResult.getStatusCode().value());
        String token = (String) loginResult.getBody().get("token");

        Map<String, String> body = Map.of("email", "admin@elite.shop");
        // login consumed one attempt, so only four sends fit under the limit of five.
        for (int i = 0; i < 4; i++) {
            assertEquals(200, offline.sendPassword(body, request).getStatusCode().value());
        }
        assertEquals(429, offline.sendPassword(body, request).getStatusCode().value());

        // Logout must clear the ip+email keyed entries for the session's email
        // (the old cleanup removed by session token, which was dead code).
        offline.logout(token, request, httpResponse);

        assertEquals(200, offline.sendPassword(body, request).getStatusCode().value());
    }

    // --- /me tests ---

    @Test
    void me_withEmptyToken_returns401() {
        ResponseEntity<Map<String, Object>> result = controller.me("");

        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void me_withSessionButNoUserDocument_returns401NotFabricatedRole() {
        SessionDocument session = new SessionDocument("tok-1", "ghost@example.com");
        when(sessionRepository.findByToken("tok-1")).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> result = controller.me("tok-1");

        assertEquals(401, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("not_authenticated", responseBody.get("error"));
        // Must not fabricate an authenticated user with a made-up role.
        assertFalse(responseBody.containsKey("user"));
    }

    @Test
    @SuppressWarnings("null")
    void me_withValidSessionAndUser_returnsUser() {
        SessionDocument session = new SessionDocument("tok-2", "user@example.com");
        when(sessionRepository.findByToken("tok-2")).thenReturn(Optional.of(session));
        when(userRepository.findByEmail("user@example.com"))
                .thenReturn(Optional.of(new UserDocument("user@example.com", "hash", "user")));

        ResponseEntity<Map<String, Object>> result = controller.me("tok-2");

        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = result.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("authenticated"));
        @SuppressWarnings("unchecked")
        Map<String, Object> user = (Map<String, Object>) responseBody.get("user");
        assertEquals("user@example.com", user.get("email"));
        assertEquals("user", user.get("role"));
    }
}
