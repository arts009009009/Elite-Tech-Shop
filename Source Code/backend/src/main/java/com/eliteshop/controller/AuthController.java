package com.eliteshop.controller;

import com.eliteshop.config.CsrfFilter;
import com.eliteshop.model.*;
import com.eliteshop.repository.PendingPasswordRepository;
import com.eliteshop.repository.SessionRepository;
import com.eliteshop.repository.UserRepository;
import com.eliteshop.service.NotificationService;
import com.eliteshop.validation.InputValidator;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = Logger.getLogger(AuthController.class.getName());
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PendingPasswordRepository pendingPasswordRepository;
    private final CsrfFilter csrfFilter;

    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARS = "0123456789";
    private static final long SESSION_TTL_MS = 24 * 60 * 60 * 1000L;
    private static final long PASSWORD_TTL_MS = 10 * 60 * 1000L;

    private static final ConcurrentHashMap<String, String> inMemoryPending = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, Long> inMemoryPendingTime = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, String> inMemorySessions = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, Long> inMemorySessionTime = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, AtomicInteger> rateLimitTrackers = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, Long> rateLimitTimestamps = new ConcurrentHashMap<>();
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long RATE_LIMIT_WINDOW_MS = 60 * 1000;
    private static final long PASSWORD_TTL_MS = 10 * 60 * 1000L;
    private volatile boolean mongoAvailable = true;
    
    private static final Map<String, String> SENSITIVE_ERROR_MESSAGES = Map.of(
        "email_required", "Email is required",
        "password_too_short", "Password must be at least 6 characters",
        "username_required", "Username is required",
        "username_exists", "Username already exists",
        "invalid_credentials", "Invalid email or password",
        "password_required", "Password is required",
        "invalid_otp", "Invalid or expired OTP",
        "rate_limit_exceeded", "Too many attempts. Please try again later.",
        "invalid_email_format", "Invalid email format",
        "invalid_username_format", "Username must be 3-30 characters (letters, numbers, underscore)"
    );

    public AuthController(UserRepository userRepository, SessionRepository sessionRepository,
                          PendingPasswordRepository pendingPasswordRepository, CsrfFilter csrfFilter) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.pendingPasswordRepository = pendingPasswordRepository;
        this.csrfFilter = csrfFilter;
        startCleanupThread();
        warmUpBCrypt();
        checkMongo();
    }

    private void checkMongo() {
        try {
            pendingPasswordRepository.count();
            mongoAvailable = true;
            log.info("MongoDB available — using persistent storage");
        } catch (Exception e) {
            mongoAvailable = false;
            log.warning("MongoDB unavailable — using in-memory storage for admin auth");
        }
    }

    private void warmUpBCrypt() {
        Thread.startVirtualThread(() -> {
            long start = System.nanoTime();
            passwordEncoder.encode("warmup");
            log.info("BCrypt warm-up done in " + (System.nanoTime() - start) / 1_000_000 + "ms");
        });
    }

    private void startCleanupThread() {
        Thread cleanup = new Thread(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Thread.sleep(60_000);
                    if (mongoAvailable) {
                        try {
                            Date cutoff = new Date(System.currentTimeMillis() - SESSION_TTL_MS);
                            sessionRepository.deleteByCreatedAtBefore(cutoff);
                            Date passwordCutoff = new Date(System.currentTimeMillis() - PASSWORD_TTL_MS);
                            pendingPasswordRepository.deleteByCreatedAtBefore(passwordCutoff);
                        } catch (Exception e) {
                            log.warning("MongoDB cleanup failed: " + e.getMessage());
                        }
                    }
                    long now = System.currentTimeMillis();
                    inMemoryPendingTime.entrySet().removeIf(e -> now - e.getValue() > PASSWORD_TTL_MS);
                    inMemoryPending.keySet().removeIf(e -> !inMemoryPendingTime.containsKey(e));
                    inMemorySessionTime.entrySet().removeIf(e -> now - e.getValue() > SESSION_TTL_MS);
                    inMemorySessions.keySet().removeIf(e -> !inMemorySessionTime.containsKey(e));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "session-cleanup");
        cleanup.setDaemon(true);
        cleanup.start();
    }

    private String generatePassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    private void createSession(String token, String email) {
        if (mongoAvailable) {
            try {
                sessionRepository.save(new SessionDocument(token, email));
                return;
            } catch (Exception e) {
                log.warning("MongoDB session save failed, using in-memory: " + e.getMessage());
            }
        }
        inMemorySessions.put(token, email);
        inMemorySessionTime.put(token, System.currentTimeMillis());
    }

    private Optional<String> findSessionEmail(String token) {
        if (mongoAvailable) {
            try {
                Optional<SessionDocument> sessionOpt = sessionRepository.findByToken(token);
                if (sessionOpt.isPresent()) {
                    SessionDocument session = sessionOpt.get();
                    if (System.currentTimeMillis() - session.getCreatedAt().getTime() > SESSION_TTL_MS) {
                        sessionRepository.delete(session);
                        return Optional.empty();
                    }
                    return Optional.of(session.getEmail());
                }
            } catch (Exception e) {
                log.warning("MongoDB session lookup failed: " + e.getMessage());
            }
        }
        Long created = inMemorySessionTime.get(token);
        if (created != null) {
            if (System.currentTimeMillis() - created > SESSION_TTL_MS) {
                inMemorySessions.remove(token);
                inMemorySessionTime.remove(token);
                return Optional.empty();
            }
            return Optional.ofNullable(inMemorySessions.get(token));
        }
        return Optional.empty();
    }

    private void setCookieAdminSession(String token, HttpServletResponse response) {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("admin_session", token);
        cookie.setPath("/");
        cookie.setMaxAge(86400);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setSameSite("Lax");
        response.addCookie(cookie);
    }

    @PostMapping("/send-password")
    public ResponseEntity<Map<String, Object>> sendPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(createErrorResponse("email_required"));
        }
        
        String normalizedEmail = InputValidator.sanitizeEmail(email);
        if (!InputValidator.isValidEmail(normalizedEmail)) {
            return ResponseEntity.badRequest().body(createErrorResponse("invalid_email_format"));
        }
        
        if (isRateLimited(normalizedEmail)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(createErrorResponse("rate_limit_exceeded"));
        }

        String password = generatePassword(6);

        if (mongoAvailable) {
            try {
                pendingPasswordRepository.findByEmail(normalizedEmail).ifPresent(pendingPasswordRepository::delete);
                pendingPasswordRepository.save(new PendingPasswordDocument(normalizedEmail, password));
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB save failed for send-password, using in-memory: " + e.getMessage(), e);
                inMemoryPending.put(normalizedEmail, password);
                inMemoryPendingTime.put(normalizedEmail, System.currentTimeMillis());
            }
        } else {
            inMemoryPending.put(normalizedEmail, password);
            inMemoryPendingTime.put(normalizedEmail, System.currentTimeMillis());
        }

        try {
            NotificationService.notifyAsync("Admin OTP", "Your OTP is " + password);
        } catch (Exception e) {
            log.log(Level.WARNING, "Failed to send notification: " + e.getMessage(), e);
        }

        return ResponseEntity.ok(createSuccessResponse(Map.of(
            "email", normalizedEmail,
            "message", "If the email is registered, an OTP has been sent"
        )));
    }
    
    private boolean isRateLimited(String key) {
        long now = System.currentTimeMillis();
        AtomicInteger counter = rateLimitTrackers.computeIfAbsent(key, k -> new AtomicInteger(0));
        Long lastTimestamp = rateLimitTimestamps.get(key);
        
        if (lastTimestamp == null || (now - lastTimestamp) > RATE_LIMIT_WINDOW_MS) {
            counter.set(0);
            rateLimitTimestamps.put(key, now);
        }
        
        return counter.incrementAndGet() > MAX_LOGIN_ATTEMPTS;
    }
    
    private Map<String, Object> createErrorResponse(String errorCode) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", errorCode);
        response.put("message", SENSITIVE_ERROR_MESSAGES.getOrDefault(errorCode, "Authentication failed"));
        return response;
    }
    
    private Map<String, Object> createSuccessResponse(Map<String, Object> additionalData) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.putAll(additionalData);
        return response;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest req) {
        String username = InputValidator.sanitizeInput(req.username());
        String password = req.password();
        String emailInput = InputValidator.sanitizeInput(req.email());
        
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(createErrorResponse("username_required"));
        }
        
        if (!InputValidator.isValidUsername(username)) {
            return ResponseEntity.badRequest().body(createErrorResponse("invalid_username_format"));
        }
        
        if (password == null || password.isBlank() || !InputValidator.isValidPassword(password)) {
            return ResponseEntity.badRequest().body(createErrorResponse("password_too_short"));
        }

        String email = emailInput != null && InputValidator.isValidEmail(emailInput) 
            ? InputValidator.sanitizeEmail(emailInput) 
            : username + "@elite.shop";

        if (mongoAvailable) {
            try {
                if (userRepository.existsByUsername(username)) {
                    return ResponseEntity.status(409).body(createErrorResponse("username_exists"));
                }
                String hashedPassword = passwordEncoder.encode(password);
                UserDocument user = new UserDocument(email, hashedPassword, username);
                user.setRole("user");
                userRepository.save(user);
                log.info("User registered: " + username);
            } catch (Exception e) {
                log.log(Level.SEVERE, "MongoDB register failed: " + e.getMessage(), e);
                return ResponseEntity.internalServerError().body(createErrorResponse("registration_failed"));
            }
        } else {
            log.warning("MongoDB unavailable, registration may not persist");
        }

        String token = UUID.randomUUID().toString();
        createSession(token, email);

        String csrfToken = csrfFilter.generateToken(token);

        return ResponseEntity.ok()
            .header("X-CSRF-Token", csrfToken)
            .body(createSuccessResponse(Map.of(
                "token", token,
                "user", Map.of("email", email, "username", username)
            )));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest req, HttpServletResponse response) {
        String email = InputValidator.sanitizeEmail(req.email());
        String password = req.password();
        
        if (email == null || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(createErrorResponse("credentials_required"));
        }
        
        if (!InputValidator.isValidEmail(email)) {
            return ResponseEntity.badRequest().body(createErrorResponse("invalid_email_format"));
        }
        
        if (isRateLimited(email)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(createErrorResponse("rate_limit_exceeded"));
        }

        String pendingPw = null;
        String normalizedEmail = email;
        
        if (mongoAvailable) {
            try {
                Optional<PendingPasswordDocument> pendingOpt = pendingPasswordRepository.findByEmail(normalizedEmail);
                if (pendingOpt.isPresent()) {
                    PendingPasswordDocument pendingDoc = pendingOpt.get();
                    if (System.currentTimeMillis() - pendingDoc.getCreatedAt().getTime() > PASSWORD_TTL_MS) {
                        pendingPasswordRepository.delete(pendingDoc);
                    } else {
                        pendingPw = pendingDoc.getPassword();
                        pendingPasswordRepository.delete(pendingDoc);
                    }
                }
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB pending lookup failed: " + e.getMessage(), e);
            }
        }
        
        if (pendingPw == null) {
            pendingPw = inMemoryPending.remove(normalizedEmail);
            inMemoryPendingTime.remove(normalizedEmail);
            if (pendingPw != null) {
                Long createdTime = inMemoryPendingTime.get(normalizedEmail);
                if (createdTime != null && (System.currentTimeMillis() - createdTime) > PASSWORD_TTL_MS) {
                    pendingPw = null;
                }
            }
        }

        if (pendingPw != null && pendingPw.equals(password)) {
            String username = normalizedEmail.contains("@") 
                ? normalizedEmail.split("@")[0] 
                : normalizedEmail;
            String token = UUID.randomUUID().toString();
            createSession(token, normalizedEmail);
            setCookieAdminSession(token, response);

            String csrfToken = csrfFilter.generateToken(token);

            log.info("User logged in with OTP: " + username);

            return ResponseEntity.ok()
                .header("X-CSRF-Token", csrfToken)
                .body(createSuccessResponse(Map.of(
                    "token", token,
                    "redirect", "/admin/dashboard",
                    "user", Map.of("email", normalizedEmail, "username", username)
                )));
        }

        if (mongoAvailable) {
            try {
                Optional<UserDocument> userOpt = userRepository.findByEmail(normalizedEmail);
                if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPassword())) {
                    UserDocument user = userOpt.get();
                    String token = UUID.randomUUID().toString();
                    createSession(token, normalizedEmail);
                    setCookieAdminSession(token, response);

                    String csrfToken = csrfFilter.generateToken(token);

                    log.info("User logged in with password: " + user.getUsername());

                    return ResponseEntity.ok()
                        .header("X-CSRF-Token", csrfToken)
                        .body(createSuccessResponse(Map.of(
                            "token", token,
                            "redirect", "/admin/dashboard",
                            "user", Map.of("email", user.getEmail(), "username", user.getUsername())
                        )));
                }
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB user lookup failed: " + e.getMessage(), e);
            }
        }

        log.warning("Failed login attempt for: " + normalizedEmail);
        return ResponseEntity.status(401).body(createErrorResponse("invalid_credentials"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@CookieValue(value = "admin_session", defaultValue = "") String token, HttpServletResponse response) {
        if (!token.isEmpty()) {
            if (mongoAvailable) {
                try {
                    sessionRepository.findByToken(token).ifPresent(sessionRepository::delete);
                } catch (Exception e) {
                    log.log(Level.WARNING, "MongoDB session delete failed: " + e.getMessage(), e);
                }
            }
            inMemorySessions.remove(token);
            inMemorySessionTime.remove(token);
            csrfFilter.invalidateToken(token);
            rateLimitTrackers.remove(token);
            rateLimitTimestamps.remove(token);
            log.info("User logged out: session=" + token);
        }
        
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("admin_session", "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setSameSite("Lax");
        response.addCookie(cookie);
        
        return ResponseEntity.ok(createSuccessResponse(Map.of("message", "Logged out successfully")));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@CookieValue(value = "admin_session", defaultValue = "") String token) {
        if (token.isEmpty()) {
            return ResponseEntity.status(401).body(createErrorResponse("not_authenticated"));
        }

        Optional<String> emailOpt = findSessionEmail(token);
        if (emailOpt.isEmpty()) {
            log.warning("Invalid session token in /me: " + token);
            return ResponseEntity.status(401).body(createErrorResponse("not_authenticated"));
        }

        String email = emailOpt.get();

        if (mongoAvailable) {
            try {
                Optional<UserDocument> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    UserDocument user = userOpt.get();
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("email", user.getEmail());
                    userInfo.put("username", user.getUsername());
                    userInfo.put("role", user.getRole());
                    
                    return ResponseEntity.ok(createSuccessResponse(Map.of(
                        "authenticated", true,
                        "user", userInfo
                    )));
                }
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB user lookup failed in /me: " + e.getMessage(), e);
            }
        }

        String username = email.contains("@") ? email.split("@")[0] : email;
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("email", email);
        userInfo.put("username", username);
        userInfo.put("role", "user");
        
        return ResponseEntity.ok(createSuccessResponse(Map.of(
            "authenticated", true,
            "user", userInfo
        )));
    }
}
