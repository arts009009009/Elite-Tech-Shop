package com.eliteshop.util;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    @Test
    void allowRequest_blocksAfterMaxAttempts() {
        RateLimiter limiter = new RateLimiter(3, 60_000, 60_000);

        assertTrue(limiter.allowRequest("ip|a@b.c"));
        assertTrue(limiter.allowRequest("ip|a@b.c"));
        assertTrue(limiter.allowRequest("ip|a@b.c"));
        assertFalse(limiter.allowRequest("ip|a@b.c"));

        // Different key is unaffected.
        assertTrue(limiter.allowRequest("ip2|a@b.c"));
    }

    @Test
    void allowRequest_windowExpiryResetsCount() throws InterruptedException {
        RateLimiter limiter = new RateLimiter(1, 50, 60_000);

        assertTrue(limiter.allowRequest("k"));
        assertFalse(limiter.allowRequest("k"));

        Thread.sleep(120); // window (50ms) elapses

        assertTrue(limiter.allowRequest("k"), "window expiry must reset the counter");
    }

    @Test
    void reset_clearsTheKey() {
        RateLimiter limiter = new RateLimiter(1, 60_000, 60_000);

        assertTrue(limiter.allowRequest("k"));
        assertFalse(limiter.allowRequest("k"));

        limiter.reset("k");

        assertTrue(limiter.allowRequest("k"));
    }

    @Test
    void expiredBuckets_arePrunedSoMapStaysBounded() throws InterruptedException {
        RateLimiter limiter = new RateLimiter(5, 50, 20);

        assertTrue(limiter.allowRequest("stale"));
        Thread.sleep(120); // bucket expires; cleanup interval (20ms) elapses too

        // Accessing a different key triggers periodic cleanup: the expired bucket
        // for "stale" must be dropped rather than kept forever.
        assertTrue(limiter.allowRequest("fresh"));
        assertEquals(1, limiter.bucketCount(), "expired bucket should have been pruned");
    }

    @Test
    void allowRequest_concurrentCallsLoseNoIncrements() throws InterruptedException {
        // The old implementation could drop increments when two threads raced the
        // window reset (count.set(0) after a CAS on windowStart). With the fix,
        // exactly maxRequests calls fit in the window.
        int threads = 4;
        int perThread = 250;
        int max = threads * perThread;
        RateLimiter limiter = new RateLimiter(max, 60_000, 60_000);

        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger allowed = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            Thread t = new Thread(() -> {
                try {
                    start.await();
                    for (int j = 0; j < perThread; j++) {
                        if (limiter.allowRequest("shared")) {
                            allowed.incrementAndGet();
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            t.start();
        }
        start.countDown();
        assertTrue(done.await(10, java.util.concurrent.TimeUnit.SECONDS));

        assertEquals(max, allowed.get(), "concurrent increments must not be lost");
        assertFalse(limiter.allowRequest("shared"), "the request after the limit must be blocked");
    }

    @Test
    void getRemainingRequests_reflectsUsage() {
        RateLimiter limiter = new RateLimiter(3, 60_000, 60_000);

        assertEquals(3, limiter.getRemainingRequests("k"));
        limiter.allowRequest("k");
        limiter.allowRequest("k");
        assertEquals(1, limiter.getRemainingRequests("k"));
        assertTrue(limiter.getResetTime("k") > System.currentTimeMillis());
    }
}
