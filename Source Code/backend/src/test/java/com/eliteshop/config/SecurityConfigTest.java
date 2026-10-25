package com.eliteshop.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the security-chain regressions:
 * 1. Spring's built-in CSRF must stay disabled (every POST used to403 before
 *    reaching a controller — the app relies on its own CsrfFilter).
 * 2. CORS must be registered from the injected CorsConfig bean (a plain
 *    {@code new CorsConfig()} never injects @Value and rejected every request
 *    with an Origin header).
 * 3. RequestLoggingFilter/SecurityHeadersFilter must not be registered twice.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private SecurityFilterChain securityFilterChain;

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Autowired
    private CsrfFilter appCsrfFilter;

    @Autowired
    private MockMvc mockMvc;

    private List<String> chainFilterNames() {
        return securityFilterChain.getFilters().stream()
            .map(filter -> filter.getClass().getName())
            .toList();
    }

    @Test
    void springCsrfIsDisabledWhileAppCsrfFilterIsKept() {
        List<String> filters = chainFilterNames();

        // Spring's own CSRF filter must NOT be in the chain...
        assertFalse(filters.contains("org.springframework.security.web.csrf.CsrfFilter"),
            "Spring's built-in CSRF protection is enabled again — POST/PUT/DELETE will 403: " + filters);
        // ...while the app's double-submit CsrfFilter bean still exists as the
        // actual CSRF defense.
        assertNotNull(appCsrfFilter);
    }

    @Test
    void postWithoutSpringCsrfToken_reachesControllerInsteadOf403() throws Exception {
        int status = mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@example.com\",\"password\":\"wrongpass\"}"))
            .andReturn().getResponse().getStatus();

        // With Spring CSRF on, this is rejected with 403 before the controller;
        // with it off, the request reaches AuthController (401 invalid credentials).
        assertNotEquals(403, status,
            "Spring CSRF rejected an anonymous POST — protection appears re-enabled");
    }

    @Test
    void corsIsRegisteredFromInjectedBeanAndAllowsConfiguredOrigins() {
        // The bean must have its @Value-injected origins (an unmanaged
        // `new CorsConfig()` would have null allowedOrigins).
        assertNotNull(corsConfigurationSource);
        CorsConfiguration config =
            corsConfigurationSource.getCorsConfiguration(new MockHttpServletRequest());
        assertNotNull(config);
        assertNotNull(config.getAllowedOrigins());
        assertFalse(config.getAllowedOrigins().isEmpty(),
            "cors.allowed-origins was not injected into the CorsConfig bean");
        assertTrue(config.getAllowedOrigins().contains("http://localhost:3000"));

        // ...and the security chain must actually use it.
        assertTrue(chainFilterNames().contains("org.springframework.web.filter.CorsFilter"),
            "CorsFilter missing from the security chain: " + chainFilterNames());
    }

    @Test
    void requestFromAllowedOrigin_isNotRejectedAsInvalidCors() throws Exception {
        int status = mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/login")
                .header("Origin", "http://localhost:3000")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@example.com\",\"password\":\"wrongpass\"}"))
            .andReturn().getResponse().getStatus();

        // A broken CORS config rejects every request bearing an Origin with 403.
        assertNotEquals(403, status,
            "Request from an allowed origin was rejected — CORS config not injected");
    }

    @Test
    void loggingAndHeaderFiltersAreNotRegisteredTwiceInSecurityChain() {
        List<String> filters = chainFilterNames();

        // They remain @Component @Order(1)/(2) (auto-registered by Boot as servlet
        // filters); adding them to the chain as well registered each of them twice.
        assertFalse(filters.contains(RequestLoggingFilter.class.getName()),
            "RequestLoggingFilter is registered both as a servlet filter and in the chain");
        assertFalse(filters.contains(SecurityHeadersFilter.class.getName()),
            "SecurityHeadersFilter is registered both as a servlet filter and in the chain");
    }
}
