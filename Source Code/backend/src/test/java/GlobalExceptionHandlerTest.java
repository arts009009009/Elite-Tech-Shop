
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("null")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handleAll_returns500WithErrorMessage() {
        Exception exception = new RuntimeException("something broke");

        ResponseEntity<Map<String, Object>> response = handler.handleAll(exception);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("error", response.getBody().get("status"));
        assertEquals("Internal server error", response.getBody().get("message"));
    }

    @Test
    void handleAll_withNullPointerException_returns500() {
        ResponseEntity<Map<String, Object>> response = handler.handleAll(new NullPointerException());

        assertEquals(500, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().containsKey("exception"));
        assertEquals("Internal server error", response.getBody().get("message"));
    }

    @Test
    void handleAll_doesNotExposeInternalDetails() {
        ResponseEntity<Map<String, Object>> response = handler.handleAll(
                new RuntimeException("DB connection failed at localhost:27017"));

        assertNotNull(response.getBody());
        assertFalse(response.getBody().containsValue("DB connection failed at localhost:27017"));
        assertEquals("Internal server error", response.getBody().get("message"));
    }
}
