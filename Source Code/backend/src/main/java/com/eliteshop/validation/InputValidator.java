package com.eliteshop.validation;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class InputValidator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"
    );
    
    private static final Pattern USERNAME_PATTERN = Pattern.compile(
        "^[A-Za-z0-9_]{3,30}$"
    );
    
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,128}$"
    );

    public static boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email).matches();
    }

    public static boolean isValidUsername(String username) {
        if (username == null || username.isBlank()) {
            return false;
        }
        return USERNAME_PATTERN.matcher(username).matches();
    }

    public static boolean isValidPassword(String password) {
        if (password == null || password.isBlank()) {
            return false;
        }
        return password.length() >= 6 && password.length() <= 128;
    }

    public static boolean isStrongPassword(String password) {
        if (password == null || password.isBlank()) {
            return false;
        }
        return PASSWORD_PATTERN.matcher(password).matches();
    }

    public static boolean isValidSessionToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return token.length() >= 36 && token.length() <= 64;
    }

    public static boolean isValidCsrfToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return token.length() >= 36 && token.length() <= 64;
    }

    public static boolean isValidOTP(String otp) {
        if (otp == null || otp.isBlank()) {
            return false;
        }
        return otp.length() == 6 && otp.chars().allMatch(Character::isDigit);
    }

    public static String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        return input.trim();
    }

    public static String sanitizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.toLowerCase().trim();
    }
}
