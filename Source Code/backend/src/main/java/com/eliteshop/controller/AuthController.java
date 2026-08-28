package com.eliteshop.controller;

import com.eliteshop.config.CsrfFilter;
import com.eliteshop.model.*;
import com.eliteshop.repository.PendingPasswordRepository;
import com.eliteshop.repository.SessionRepository;
import com.eliteshop.repository.UserRepository;
import com.eliteshop.service.NotificationService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
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
    private volatile boolean mongoAvailable = true;

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
        response.addCookie(cookie);
    }

    @PostMapping("/send-password")
    public ResponseEntity<Map<String, Object>> sendPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "email_required"));
        }

        String password = generatePassword(6);
        String normalizedEmail = email.toLowerCase().trim();

        if (mongoAvailable) {
            try {
                pendingPasswordRepository.findByEmail(normalizedEmail).ifPresent(pendingPasswordRepository::delete);
                pendingPasswordRepository.save(new PendingPasswordDocument(normalizedEmail, password));
            } catch (Exception e) {
                log.warning("MongoDB save failed, using in-memory: " + e.getMessage());
                inMemoryPending.put(normalizedEmail, password);
                inMemoryPendingTime.put(normalizedEmail, System.currentTimeMillis());
            }
        } else {
            inMemoryPending.put(normalizedEmail, password);
            inMemoryPendingTime.put(normalizedEmail, System.currentTimeMillis());
        }

        NotificationService.notifyAsync("Admin Password", "Your OTP is " + password);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "email", email,
            "password", password
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest req) {
        if (req.username() == null || req.username().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "username_required"));
        }
        if (req.password() == null || req.password().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "password_too_short"));
        }

        String email = req.email() != null ? req.email().toLowerCase().trim() : req.username() + "@elite.shop";

        if (mongoAvailable) {
            try {
                if (userRepository.existsByUsername(req.username())) {
                    return ResponseEntity.status(409).body(Map.of("success", false, "error", "username_exists"));
                }
                String hashedPassword = passwordEncoder.encode(req.password());
                userRepository.save(new UserDocument(email, hashedPassword, req.username()));
            } catch (Exception e) {
                log.warning("MongoDB register failed: " + e.getMessage());
            }
        }

        String token = UUID.randomUUID().toString();
        createSession(token, email);

        String csrfToken = csrfFilter.generateToken(token);

        return ResponseEntity.ok()
            .header("X-CSRF-Token", csrfToken)
            .body(Map.of(
                "success", true,
                "token", token,
                "user", Map.of("email", email, "username", req.username())
            ));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest req, HttpServletResponse response) {
        if (req.email() == null || req.password() == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "credentials_required"));
        }

        String email = req.email().toLowerCase().trim();

        String pendingPw = null;
        if (mongoAvailable) {
            try {
                Optional<PendingPasswordDocument> pendingOpt = pendingPasswordRepository.findByEmail(email);
                if (pendingOpt.isPresent()) {
                    pendingPw = pendingOpt.get().getPassword();
                    pendingPasswordRepository.delete(pendingOpt.get());
                }
            } catch (Exception e) {
                log.warning("MongoDB pending lookup failed: " + e.getMessage());
            }
        }
        if (pendingPw == null) {
            pendingPw = inMemoryPending.remove(email);
            inMemoryPendingTime.remove(email);
        }

        if (pendingPw != null && pendingPw.equals(req.password())) {
            String username = email.contains("@") ? email.split("@")[0] : email;
            String token = UUID.randomUUID().toString();
            createSession(token, email);
            setCookieAdminSession(token, response);

            String csrfToken = csrfFilter.generateToken(token);

            return ResponseEntity.ok()
                .header("X-CSRF-Token", csrfToken)
                .body(Map.of(
                    "success", true,
                    "token", token,
                    "redirect", "/admin/dashboard",
                    "user", Map.of("email", email, "username", username)
                ));
        }

        if (mongoAvailable) {
            try {
                Optional<UserDocument> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent() && passwordEncoder.matches(req.password(), userOpt.get().getPassword())) {
                    UserDocument user = userOpt.get();
                    String token = UUID.randomUUID().toString();
                    createSession(token, email);
                    setCookieAdminSession(token, response);

                    String csrfToken = csrfFilter.generateToken(token);

                    return ResponseEntity.ok()
                        .header("X-CSRF-Token", csrfToken)
                        .body(Map.of(
                            "success", true,
                            "token", token,
                            "redirect", "/admin/dashboard",
                            "user", Map.of("email", user.getEmail(), "username", user.getUsername())
                        ));
                }
            } catch (Exception e) {
                log.warning("MongoDB user lookup failed: " + e.getMessage());
            }
        }

        return ResponseEntity.status(401).body(Map.of("success", false, "error", "invalid_credentials"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@CookieValue(value = "admin_session", defaultValue = "") String token, HttpServletResponse response) {
        if (!token.isEmpty()) {
            if (mongoAvailable) {
                try {
                    sessionRepository.findByToken(token).ifPresent(sessionRepository::delete);
                } catch (Exception e) {
                    log.warning("MongoDB session delete failed: " + e.getMessage());
                }
            }
            inMemorySessions.remove(token);
            inMemorySessionTime.remove(token);
            csrfFilter.invalidateToken(token);
        }
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("admin_session", "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@CookieValue(value = "admin_session", defaultValue = "") String token) {
        if (token.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        Optional<String> emailOpt = findSessionEmail(token);
        if (emailOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        String email = emailOpt.get();

        if (mongoAvailable) {
            try {
                Optional<UserDocument> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    UserDocument user = userOpt.get();
                    return ResponseEntity.ok(Map.of(
                        "authenticated", true,
                        "user", Map.of("email", user.getEmail(), "username", user.getUsername())
                    ));
                }
            } catch (Exception e) {
                log.warning("MongoDB user lookup failed: " + e.getMessage());
            }
        }

        String username = email.contains("@") ? email.split("@")[0] : email;
        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "user", Map.of("email", email, "username", username)
        ));
    }
}
