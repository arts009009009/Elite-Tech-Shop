package com.eliteshop.util;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window rate limiter keyed by an arbitrary string (e.g. "ip|email").
 *
 * <p>Thread-safety: window reset and increment happen under the bucket lock, so
 * there is no lost-increment or check-then-act race between threads, and the
 * bucket swap in {@link #allowRequest} is atomic per key via
 * {@link ConcurrentHashMap#compute} (no TOCTOU between expiry check and insert).
 *
 * <p>Memory: expired buckets are pruned lazily on access plus periodically by a
 * daemon cleanup thread, so the map stays bounded even when keys are unbounded
 * (e.g. arbitrary user-supplied emails).
 */
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
        buckets.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
    }

    public boolean allowRequest(String key) {
        long now = System.currentTimeMillis();

        // Periodic cleanup
        if (now - lastCleanup > cleanupIntervalMs) {
            cleanup();
        }

        // compute() is atomic per key: the expired bucket is swapped out and the
        // fresh one incremented without another thread slipping in between.
        Bucket bucket = buckets.compute(key,
            (k, existing) -> (existing == null || existing.isExpired(now)) ? new Bucket(now, windowSizeMs) : existing);

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

    /** Package-private: number of live buckets, for tests. */
    int bucketCount() {
        return buckets.size();
    }

    private static final class Bucket {
        private final long windowSizeMs;
        private long windowStart;
        private int count;

        Bucket(long windowStart, long windowSizeMs) {
            this.windowStart = windowStart;
            this.windowSizeMs = windowSizeMs;
        }

        synchronized boolean isExpired(long now) {
            return now - windowStart >= windowSizeMs;
        }

        synchronized boolean incrementAndCheck(long now, int maxRequests) {
            if (now - windowStart >= windowSizeMs) {
                windowStart = now;
                count = 0;
            }
            return ++count <= maxRequests;
        }

        synchronized int getCount() {
            return count;
        }

        synchronized long getResetTime() {
            return windowStart + windowSizeMs;
        }
    }
}
