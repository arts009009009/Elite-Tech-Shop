package com.eliteshop.util;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class RateLimiter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int maxRequests;
    private final long windowSizeMs;
    private final long cleanupIntervalMs;
    private volatile long lastCleanup = System.currentTimeMillis();

    public RateLimiter(int maxRequests, long windowSizeMs) {
        this(maxRequests, windowSizeMs, 60000); // Default cleanup every minute
    }

    public RateLimiter(int maxRequests, long windowSizeMs, long cleanupIntervalMs) {
        this.maxRequests = maxRequests;
        this.windowSizeMs = windowSizeMs;
        this.cleanupIntervalMs = cleanupIntervalMs;
        startCleanupThread();
    }

    private void startCleanupThread() {
        Thread cleanup = new Thread(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Thread.sleep(cleanupIntervalMs);
                    cleanup();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "rate-limiter-cleanup");
        cleanup.setDaemon(true);
        cleanup.start();
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        lastCleanup = now;
        buckets.entrySet().removeIf(entry -> {
            Bucket bucket = entry.getValue();
            return bucket.isExpired(now);
        });
    }

    public boolean allowRequest(String key) {
        long now = System.currentTimeMillis();
        
        // Periodic cleanup
        if (now - lastCleanup > cleanupIntervalMs) {
            cleanup();
        }
        
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(now, windowSizeMs));
        
        if (bucket.isExpired(now)) {
            buckets.put(key, new Bucket(now, windowSizeMs));
            bucket = buckets.get(key);
        }
        
        return bucket.incrementAndCheck(now, maxRequests);
    }

    public int getRemainingRequests(String key) {
        long now = System.currentTimeMillis();
        Bucket bucket = buckets.get(key);
        if (bucket == null || bucket.isExpired(now)) {
            return maxRequests;
        }
        return Math.max(0, maxRequests - bucket.getCount());
    }

    public long getResetTime(String key) {
        long now = System.currentTimeMillis();
        Bucket bucket = buckets.get(key);
        if (bucket == null || bucket.isExpired(now)) {
            return now + windowSizeMs;
        }
        return bucket.getResetTime();
    }

    public void reset(String key) {
        buckets.remove(key);
    }

    private class Bucket {
        private final AtomicInteger count;
        private final AtomicLong windowStart;

        Bucket(long windowStart, long windowSizeMs) {
            this.count = new AtomicInteger(0);
            this.windowStart = new AtomicLong(windowStart);
        }

        boolean isExpired(long now) {
            return now - windowStart.get() >= windowSizeMs;
        }

        boolean incrementAndCheck(long now, int maxRequests) {
            long currentStart = windowStart.get();
            
            // Check if window has expired
            if (now - currentStart >= windowSizeMs) {
                if (windowStart.compareAndSet(currentStart, now)) {
                    count.set(0);
                } else {
                    // Someone else updated it, try again
                    currentStart = windowStart.get();
                    if (now - currentStart >= windowSizeMs) {
                        windowStart.set(now);
                        count.set(0);
                    }
                }
            }
            
            return count.incrementAndGet() <= maxRequests;
        }

        int getCount() {
            return count.get();
        }

        long getResetTime() {
            return windowStart.get() + windowSizeMs;
        }
    }
}
