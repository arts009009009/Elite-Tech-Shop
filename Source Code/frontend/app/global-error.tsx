"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#050508",
            color: "#e0e0e0",
            fontFamily: "'Courier New', monospace",
            textAlign: "center",
            padding: 24,
          }}
        >
          <h1 style={{ color: "#ff0040", fontSize: 48, margin: "0 0 16px", textShadow: "0 0 20px #ff0040" }}>
            SYSTEM CRASH
          </h1>
          <p style={{ color: "#888", fontSize: 14, margin: "0 0 8px" }}>
            A critical error occurred. The application needs to restart.
          </p>
          {error.digest && (
            <p style={{ color: "#555", fontSize: 12, margin: "0 0 24px" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 32px",
              fontSize: 14,
              fontFamily: "'Courier New', monospace",
              border: "2px solid #00d4ff",
              background: "transparent",
              color: "#00d4ff",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            RESTART APPLICATION
          </button>
        </div>
      </body>
    </html>
  );
}
