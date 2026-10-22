package com.eliteshop.controller;

import com.eliteshop.config.CsrfFilter;
import com.eliteshop.model.*;
import com.eliteshop.repository.PendingPasswordRepository;
import com.eliteshop.repository.SessionRepository;
import com.eliteshop.repository.UserRepository;
import com.eliteshop.service.NotificationService;
import com.eliteshop.util.RateLimiter;
import com.eliteshop.validation.InputValidator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DuplicateKeyException;
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

    private static final String ADMIN_EMAIL = "admin@elite.shop";
    private static final String ADMIN_USERNAME = "admin";

    private final ConcurrentHashMap<String, String> inMemoryPending = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> inMemoryPendingTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> inMemorySessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> inMemorySessionTime = new ConcurrentHashMap<>();

    /** Minimal user record used when MongoDB is down (e.g. the seeded admin). */
    private record InMemoryUser(String email, String username, String passwordHash, String role) {}

    private final ConcurrentHashMap<String, InMemoryUser> inMemoryUsers = new ConcurrentHashMap<>();

    // Rate limiting keyed by "ip|email" (per-instance so state dies with the bean).
    // RateLimiter has TTL-based window reset + cleanup, so entries never leak.
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long RATE_LIMIT_WINDOW_MS = 60 * 1000;
    private final RateLimiter authRateLimiter = new RateLimiter(MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_MS);

    /** How often the MongoDB availability circuit breaker re-probes. */
    private static final long MONGO_PROBE_INTERVAL_MS = 10 * 1000;
    private volatile boolean mongoAvailable = true;
    private volatile long lastMongoProbeAt = 0;

    private static final Map<String, String> SENSITIVE_ERROR_MESSAGES = Map.of(
        "email_required", "Email is required",
        "password_too_short", "Password must be at least 6 characters",
        "username_required", "Username is required",
        "username_exists", "Username already exists",
        "email_exists", "Email already registered",
        "account_exists", "Account already exists",
        "storage_unavailable", "Registration is temporarily unavailable. Please try again later.",
        "invalid_credentials", "Invalid email or password",
        "credentials_required", "Email and password are required",
        "password_required", "Password is required",
        "invalid_otp", "Invalid or expired OTP",
        "rate_limit_exceeded", "Too many attempts. Please try again later.",
        "invalid_email_format", "Invalid email format",
        "invalid_username_format", "Username must be 3-30 characters (letters, numbers, underscore)",
        "not_authenticated", "Not authenticated"
    );

    public AuthController(UserRepository userRepository, SessionRepository sessionRepository,
                          PendingPasswordRepository pendingPasswordRepository, CsrfFilter csrfFilter) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.pendingPasswordRepository = pendingPasswordRepository;
        this.csrfFilter = csrfFilter;
        startCleanupThread();
        warmUpBCrypt();
        refreshMongoAvailability();
        seedAdminUser();
    }

    /**
     * Cheap circuit breaker around MongoDB availability: probes at most once per
     * {@link #MONGO_PROBE_INTERVAL_MS}, so requests never block on the driver in
     * the common case, an outage is noticed within seconds and a Mongo restart
     * recovers automatically (previously availability was probed once in the
     * constructor and cached forever).
     */
    private boolean isMongoAvailable() {
        long now = System.currentTimeMillis();
        if (mongoAvailable && now - lastMongoProbeAt < MONGO_PROBE_INTERVAL_MS) {
            return true;
        }
        return refreshMongoAvailability();
    }

    private synchronized boolean refreshMongoAvailability() {
        long now = System.currentTimeMillis();
        if (now - lastMongoProbeAt < MONGO_PROBE_INTERVAL_MS) {
            return mongoAvailable;
        }
        lastMongoProbeAt = now;
        try {
            pendingPasswordRepository.count();
            if (!mongoAvailable) {
                log.info("MongoDB available — using persistent storage");
            }
            mongoAvailable = true;
        } catch (Exception e) {
            if (mongoAvailable) {
                log.warning("MongoDB unavailable — using in-memory storage for admin auth");
            }
            mongoAvailable = false;
        }
        return mongoAvailable;
    }

    /**
     * Ensures an admin account exists at startup: email admin@elite.shop, role
     * admin, password from the ADMIN_PASSWORD env var (falls back to "admin" with
     * a warning). Persisted to MongoDB when available; an in-memory copy is kept
     * either way so the admin can log in while MongoDB is down.
     */
    private void seedAdminUser() {
        String rawPassword = System.getenv("ADMIN_PASSWORD");
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = "admin";
            log.warning("ADMIN_PASSWORD is not set — seeded admin account uses the default password 'admin'. "
                + "Set ADMIN_PASSWORD before exposing this service.");
        }
        String hashedPassword = passwordEncoder.encode(rawPassword);
        inMemoryUsers.put(ADMIN_EMAIL, new InMemoryUser(ADMIN_EMAIL, ADMIN_USERNAME, hashedPassword, "admin"));

        if (!isMongoAvailable()) {
            log.info("Admin user seeded in memory only (MongoDB unavailable)");
            return;
        }
        try {
            UserDocument admin = userRepository.findByEmail(ADMIN_EMAIL)
                .orElseGet(() -> new UserDocument(ADMIN_EMAIL, hashedPassword, ADMIN_USERNAME));
            admin.setUsername(ADMIN_USERNAME);
            admin.setPassword(hashedPassword);
            admin.setRole("admin");
            userRepository.save(admin);
            log.info("Admin user seeded (email=" + ADMIN_EMAIL + ")");
        } catch (Exception e) {
            log.warning("Could not persist admin user to MongoDB (in-memory copy kept): " + e.getMessage());
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
                    // Re-probe MongoDB so a restart is picked up without a reboot.
                    if (isMongoAvailable()) {
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
                    // CSRF tokens are only removed on /logout; prune the ones whose
                    // session can no longer be alive so the map stays bounded.
                    csrfFilter.pruneExpiredTokens(SESSION_TTL_MS);
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
        if (isMongoAvailable()) {
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
        if (isMongoAvailable()) {
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
        response.addCookie(cookie);
    }

    /** Non-reversible short fingerprint for logging — never log raw session tokens. */
    private String shortToken(String token) {
        return token == null ? "null" : String.format("%08x", token.hashCode());
    }

    @PostMapping("/send-password")
    public ResponseEntity<Map<String, Object>> sendPassword(@RequestBody Map<String, String> body,
                                                            HttpServletRequest request) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(createErrorResponse("email_required"));
        }

        String normalizedEmail = InputValidator.sanitizeEmail(email);
        if (!InputValidator.isValidEmail(normalizedEmail)) {
            return ResponseEntity.badRequest().body(createErrorResponse("invalid_email_format"));
        }

        if (isRateLimited(request, normalizedEmail)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(createErrorResponse("rate_limit_exceeded"));
        }

        // Only mint an OTP for addresses that actually have an account — but keep
        // the response byte-identical either way so callers cannot probe which
        // emails are registered.
        if (!userExists(normalizedEmail)) {
            log.warning("send-password requested for unknown email (no OTP issued)");
            return ResponseEntity.ok(otpResponse(normalizedEmail));
        }

        String otp = generatePassword(6);
        storePendingPassword(normalizedEmail, otp);

        try {
            NotificationService.notifyAsync("Admin OTP", "Your OTP is " + otp);
        } catch (Exception e) {
            log.log(Level.WARNING, "Failed to send notification: " + e.getMessage(), e);
        }

        return ResponseEntity.ok(otpResponse(normalizedEmail));
    }

    private Map<String, Object> otpResponse(String normalizedEmail) {
        return createSuccessResponse(Map.of(
            "email", normalizedEmail,
            "message", "If the email is registered, an OTP has been sent"
        ));
    }

    private boolean userExists(String email) {
        if (inMemoryUsers.containsKey(email)) {
            return true;
        }
        if (isMongoAvailable()) {
            try {
                return userRepository.findByEmail(email).isPresent();
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB user lookup failed: " + e.getMessage(), e);
            }
        }
        return false;
    }

    private void storePendingPassword(String email, String password) {
        if (isMongoAvailable()) {
            try {
                pendingPasswordRepository.findByEmail(email).ifPresent(pendingPasswordRepository::delete);
                pendingPasswordRepository.save(new PendingPasswordDocument(email, password));
                return;
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB save failed for send-password, using in-memory: " + e.getMessage(), e);
            }
        }
        inMemoryPending.put(email, password);
        inMemoryPendingTime.put(email, System.currentTimeMillis());
    }

    /**
     * Consumes (single-use) the pending OTP for the email, honoring PASSWORD_TTL_MS.
     * Returns null when there is no OTP or it has expired.
     */
    private String consumePendingOtp(String email) {
        if (isMongoAvailable()) {
            try {
                Optional<PendingPasswordDocument> pendingOpt = pendingPasswordRepository.findByEmail(email);
                if (pendingOpt.isPresent()) {
                    PendingPasswordDocument pendingDoc = pendingOpt.get();
                    // Delete on read: OTPs are single-use.
                    pendingPasswordRepository.delete(pendingDoc);
                    if (System.currentTimeMillis() - pendingDoc.getCreatedAt().getTime() <= PASSWORD_TTL_MS) {
                        return pendingDoc.getPassword();
                    }
                    return null;
                }
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB pending lookup failed: " + e.getMessage(), e);
            }
        }

        // Read the timestamp BEFORE removing it, otherwise the TTL check
        // below always sees null and expired in-memory OTPs never expire.
        Long createdTime = inMemoryPendingTime.get(email);
        String pending = inMemoryPending.remove(email);
        inMemoryPendingTime.remove(email);
        if (pending != null && createdTime != null
            && (System.currentTimeMillis() - createdTime) > PASSWORD_TTL_MS) {
            return null;
        }
        return pending;
    }

    /** Rate limit key includes the client IP AND the email (was email-only). */
    private boolean isRateLimited(HttpServletRequest request, String email) {
        return authRateLimiter.allowRequest(rateLimitKey(request, email));
    }

    private String rateLimitKey(HttpServletRequest request, String email) {
        String ip = request != null && request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        return ip + "|" + email;
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

        // Without persistent storage we refuse instead of minting a session for a
        // user that only phantom-exists in memory until the session TTL lapses.
        if (!isMongoAvailable()) {
            log.warning("Registration rejected: MongoDB unavailable");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(createErrorResponse("storage_unavailable"));
        }

        try {
            if (userRepository.existsByUsername(username)) {
                return ResponseEntity.status(409).body(createErrorResponse("username_exists"));
            }
            if (userRepository.existsByEmail(email)) {
                // Without this check the unique email index turns a duplicate into a 500.
                return ResponseEntity.status(409).body(createErrorResponse("email_exists"));
            }
            String hashedPassword = passwordEncoder.encode(password);
            UserDocument user = new UserDocument(email, hashedPassword, username);
            user.setRole("user");
            userRepository.save(user);
            log.info("User registered: " + username);
        } catch (DuplicateKeyException e) {
            // Unique index race (username or email) — a conflict, not a 500.
            log.warning("Duplicate account rejected on register: " + e.getMessage());
            return ResponseEntity.status(409).body(createErrorResponse("account_exists"));
        } catch (Exception e) {
            log.log(Level.SEVERE, "MongoDB register failed: " + e.getMessage(), e);
            return ResponseEntity.internalServerError().body(createErrorResponse("registration_failed"));
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
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest req,
                                                     HttpServletRequest request,
                                                     HttpServletResponse response) {
        String email = InputValidator.sanitizeEmail(req.email());
        String password = req.password();
        
        if (email == null || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(createErrorResponse("credentials_required"));
        }
        
        if (!InputValidator.isValidEmail(email)) {
            return ResponseEntity.badRequest().body(createErrorResponse("invalid_email_format"));
        }
        
        if (isRateLimited(request, email)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(createErrorResponse("rate_limit_exceeded"));
        }

        // OTP path: only plausible OTP shapes are ever compared against a pending
        // OTP (and consumePendingOtp enforces single-use + TTL).
        if (InputValidator.isValidOTP(password)) {
            String pendingPw = consumePendingOtp(email);
            if (pendingPw != null && pendingPw.equals(password)) {
                String username = email.contains("@") ? email.split("@")[0] : email;
                return loginSuccess(email, username, response, "OTP");
            }
        }

        // Password path: persistent users first, then the in-memory store
        // (seeded admin — works even while MongoDB is down).
        if (isMongoAvailable()) {
            try {
                Optional<UserDocument> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPassword())) {
                    UserDocument user = userOpt.get();
                    return loginSuccess(email, user.getUsername(), response, "password");
                }
            } catch (Exception e) {
                log.log(Level.WARNING, "MongoDB user lookup failed: " + e.getMessage(), e);
            }
        }

        InMemoryUser inMemUser = inMemoryUsers.get(email);
        if (inMemUser != null && passwordEncoder.matches(password, inMemUser.passwordHash())) {
            return loginSuccess(email, inMemUser.username(), response, "password");
        }

        log.warning("Failed login attempt for: " + email);
        return ResponseEntity.status(401).body(createErrorResponse("invalid_credentials"));
    }

    private ResponseEntity<Map<String, Object>> loginSuccess(String email, String username,
                                                             HttpServletResponse response, String method) {
        String token = UUID.randomUUID().toString();
        createSession(token, email);
        setCookieAdminSession(token, response);

        String csrfToken = csrfFilter.generateToken(token);

        log.info("User logged in with " + method + ": " + username);

        return ResponseEntity.ok()
            .header("X-CSRF-Token", csrfToken)
            .body(createSuccessResponse(Map.of(
                "token", token,
                "redirect", "/admin/dashboard",
                "user", Map.of("email", email, "username", username)
            )));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@CookieValue(value = "admin_session", defaultValue = "") String token,
                                                      HttpServletRequest request,
                                                      HttpServletResponse response) {
        if (!token.isEmpty()) {
            // Resolve the session's email BEFORE dropping the session: rate-limit
            // entries are keyed by "ip|email" (not by session token, which made the
            // old cleanup dead code), so clear the keys belonging to this account.
            findSessionEmail(token).ifPresent(email ->
                authRateLimiter.reset(rateLimitKey(request, email)));

            if (isMongoAvailable()) {
                try {
                    sessionRepository.findByToken(token).ifPresent(sessionRepository::delete);
                } catch (Exception e) {
                    log.log(Level.WARNING, "MongoDB session delete failed: " + e.getMessage(), e);
                }
            }
            inMemorySessions.remove(token);
            inMemorySessionTime.remove(token);
            csrfFilter.invalidateToken(token);
            log.info("User logged out: session=" + shortToken(token));
        }
        
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("admin_session", "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
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
            log.warning("Invalid session token in /me: " + shortToken(token));
            return ResponseEntity.status(401).body(createErrorResponse("not_authenticated"));
        }

        String email = emailOpt.get();

        if (isMongoAvailable()) {
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

        // In-memory users (seeded admin) are still valid when MongoDB is down.
        InMemoryUser inMemUser = inMemoryUsers.get(email);
        if (inMemUser != null) {
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("email", inMemUser.email());
            userInfo.put("username", inMemUser.username());
            userInfo.put("role", inMemUser.role());

            return ResponseEntity.ok(createSuccessResponse(Map.of(
                "authenticated", true,
                "user", userInfo
            )));
        }

        // A session whose account does not exist must never be reported as
        // authenticated with a fabricated role.
        log.warning("Session refers to unknown user, rejecting in /me: " + shortToken(token));
        return ResponseEntity.status(401).body(createErrorResponse("not_authenticated"));
    }
}
