package com.eliteshop.controller;

import com.eliteshop.config.CsrfFilter;
import com.eliteshop.model.RegisterRequest;
import com.eliteshop.repository.PendingPasswordRepository;
import com.eliteshop.repository.SessionRepository;
import com.eliteshop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

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

    @BeforeEach
    void setUp() {
        csrfFilter = new CsrfFilter();
        controller = new AuthController(userRepository, sessionRepository,
                pendingPasswordRepository, csrfFilter);
    }

    // --- sendPassword tests ---

    @Test
    @SuppressWarnings("null")
    void sendPassword_withValidEmail_returnsSuccess() {
        when(pendingPasswordRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        Map<String, String> body = Map.of("email", "test@example.com");
        ResponseEntity<Map<String, Object>> response = controller.sendPassword(body);

        assertEquals(200, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
        assertEquals("test@example.com", responseBody.get("email"));
        verify(pendingPasswordRepository).save(any());
    }

    @Test
    void sendPassword_withBlankEmail_returnsError() {
        Map<String, String> body = Map.of("email", "   ");
        ResponseEntity<Map<String, Object>> response = controller.sendPassword(body);

        assertEquals(400, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("email_required", responseBody.get("error"));
    }

    @Test
    void sendPassword_withNullEmail_returnsError() {
        Map<String, String> body = Map.of();
        ResponseEntity<Map<String, Object>> response = controller.sendPassword(body);

        assertEquals(400, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("email_required", responseBody.get("error"));
    }

    // --- register tests ---

    @Test
    @SuppressWarnings("null")
    void register_withValidData_returnsSuccess() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(200, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
        assertNotNull(responseBody.get("token"));
        verify(userRepository).save(any());
        verify(sessionRepository).save(any());
    }

    @Test
    void register_withShortPassword_returnsError() {
        RegisterRequest req = new RegisterRequest("bob@example.com", "123", "bob");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(400, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("password_too_short", responseBody.get("error"));
    }

    @Test
    void register_withBlankUsername_returnsError() {
        RegisterRequest req = new RegisterRequest("bob@example.com", "password123", "  ");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(400, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertEquals("username_required", responseBody.get("error"));
    }

    @Test
    void register_withExistingUsername_returns409() {
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(409, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertFalse((Boolean) responseBody.get("success"));
        assertEquals("username_exists", responseBody.get("error"));
    }

    @Test
    void register_withNullEmail_usesDefaultEmail() {
        when(userRepository.existsByUsername("charlie")).thenReturn(false);

        RegisterRequest req = new RegisterRequest(null, "password123", "charlie");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(200, response.getStatusCode().value());
        Map<String, Object> responseBody = response.getBody();
        assertNotNull(responseBody);
        assertTrue((Boolean) responseBody.get("success"));
    }
}
