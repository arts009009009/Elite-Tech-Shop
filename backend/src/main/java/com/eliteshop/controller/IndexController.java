package com.eliteshop.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class IndexController {

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "service", "elite-shop-java", "version", "1.7 Feature Freeze");
    }

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String index() {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Elite Shop Backend</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                           background: #0a0a0a; color: #e0e0e0; display: flex;
                           justify-content: center; align-items: center; min-height: 100vh; }
                    .card { background: #141414; border: 1px solid #2a2a2a;
                            border-radius: 12px; padding: 40px; text-align: center;
                            max-width: 400px; width: 90%; }
                    h1 { font-size: 24px; margin-bottom: 16px; color: #fff; }
                    .version { font-size: 48px; font-weight: 700; color: #4ade80; margin: 16px 0; }
                    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
                             color: #666; margin-top: 12px; }
                    .status { display: inline-block; margin-top: 20px; padding: 6px 16px;
                              background: #0f2a1a; color: #4ade80; border-radius: 20px;
                              font-size: 13px; }
                    .info { margin-top: 24px; font-size: 13px; color: #555; line-height: 1.8; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Elite Shop Backend</h1>
                    <div class="label">Version</div>
                    <div class="version">1.7 Feature Freeze</div>
                    <div class="status">&#x25cf; Running</div>
                    <div class="info">
                        Spring Boot 3.4.2<br>
                        Java 21 &middot; Port 3001
                    </div>
                </div>
            </body>
            </html>
            """;
    }
}
