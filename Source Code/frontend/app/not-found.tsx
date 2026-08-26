import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 72, margin: 0, color: "#ff0040", textShadow: "0 0 20px #ff0040" }}>
        404
      </h1>
      <p style={{ fontSize: 18, color: "#888", margin: "16px 0" }}>
        This page does not exist.
      </p>
      <Link
        href="/"
        style={{
          padding: "12px 32px",
          fontSize: 14,
          border: "2px solid #00d4ff",
          color: "#00d4ff",
          textDecoration: "none",
          borderRadius: 4,
        }}
      >
        GO HOME
      </Link>
    </div>
  );
}
