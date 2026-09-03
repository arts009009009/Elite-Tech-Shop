
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
    void sendPassword_withValidEmail_returnsSuccess() {
        when(pendingPasswordRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(pendingPasswordRepository.save(any())).thenReturn(new PendingPasswordDocument("test@example.com", "123456"));

        Map<String, String> body = Map.of("email", "test@example.com");
        ResponseEntity<Map<String, Object>> response = controller.sendPassword(body);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("success"));
        assertEquals("test@example.com", response.getBody().get("email"));
        assertFalse(response.getBody().containsKey("password"));
        verify(pendingPasswordRepository).save(any());
    }

    @Test
    void sendPassword_withBlankEmail_returnsError() {
        Map<String, String> body = Map.of("email", "   ");
        ResponseEntity<Map<String, Object>> response = controller.sendPassword(body);

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse((Boolean) response.getBody().get("success"));
        assertEquals("email_required", response.getBody().get("error"));
    }

    @Test
    void sendPassword_withNullEmail_returnsError() {
        Map<String, String> body = Map.of();
        ResponseEntity<Map<String, Object>> response = controller.sendPassword(body);

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse((Boolean) response.getBody().get("success"));
        assertEquals("email_required", response.getBody().get("error"));
    }

    // --- register tests ---

    @Test
    void register_withValidData_returnsSuccess() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.save(any())).thenReturn(new UserDocument("alice@example.com", "hashed", "alice"));
        when(sessionRepository.save(any())).thenReturn(new SessionDocument("token", "alice@example.com"));

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("success"));
        assertNotNull(response.getBody().get("token"));
        verify(userRepository).save(any());
        verify(sessionRepository).save(any());
    }

    @Test
    void register_withShortPassword_returnsError() {
        RegisterRequest req = new RegisterRequest("bob@example.com", "123", "bob");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse((Boolean) response.getBody().get("success"));
        assertEquals("password_too_short", response.getBody().get("error"));
    }

    @Test
    void register_withBlankUsername_returnsError() {
        RegisterRequest req = new RegisterRequest("bob@example.com", "password123", "  ");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("username_required", response.getBody().get("error"));
    }

    @Test
    void register_withExistingUsername_returns409() {
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        RegisterRequest req = new RegisterRequest("alice@example.com", "password123", "alice");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(409, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse((Boolean) response.getBody().get("success"));
        assertEquals("username_exists", response.getBody().get("error"));
    }

    @Test
    void register_withNullEmail_usesDefaultEmail() {
        when(userRepository.existsByUsername("charlie")).thenReturn(false);
        when(userRepository.save(any())).thenReturn(new UserDocument("charlie@elite.shop", "hashed", "charlie"));
        when(sessionRepository.save(any())).thenReturn(new SessionDocument("token", "charlie@elite.shop"));

        RegisterRequest req = new RegisterRequest(null, "password123", "charlie");
        ResponseEntity<Map<String, Object>> response = controller.register(req);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("success"));
    }
}
