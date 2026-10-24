"use client";
import { useState, useCallback } from "react";
import { useReviews } from "@/context/ReviewContext";

type Props = { productId: number; author: string; onSubmitted?: () => void };

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 4, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} stars`}
          style={{
            padding: "4px 8px",
            fontSize: 24,
            background: "transparent",
            border: "none",
            color: star <= value ? "#f6e05e" : "#6b7280",
            cursor: "pointer",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {star <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({ productId, author, onSubmitted }: Props) {
  const { addReview } = useReviews();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || pending) return;
    setPending(true);
    setError(null);
    const ok = await addReview(productId, author, rating, comment.trim());
    setPending(false);
    if (!ok) {
      setError("Failed to submit review. Please try again.");
      window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to submit review." }));
      return;
    }
    setSubmitted(true);
    setComment("");
    onSubmitted?.();
    window.dispatchEvent(new CustomEvent("notify", { detail: "Review submitted! Thank you." }));
  }, [productId, author, rating, comment, pending, addReview, onSubmitted]);

  if (submitted) {
    return (
      <div>
        <p style={{ color: "#68d391", textAlign: "center", margin: 0 }}>✓ Review submitted successfully!</p>
        <button
          onClick={() => { setError(null); setSubmitted(false); }}
          style={{
            marginTop: 8,
            padding: "2px 10px",
            fontSize: 12,
            border: "1px solid var(--accent, #00d4ff)",
            background: "transparent",
            color: "var(--accent, #00d4ff)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Write another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
          border: "1px solid #90cdf4",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Rating:</p>
          <StarRating value={rating} onChange={setRating} />
          <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>{rating}/5</p>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={3}
          required
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--border, #2d3748)",
            background: "var(--bg, #0a0a0f)",
            color: "var(--text, #e0e0e0)",
            fontFamily: "inherit",
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p style={{ color: "#fc8181", fontSize: 13, margin: 0 }} role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!comment.trim() || pending}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            border: "1px solid var(--accent, #00d4ff)",
            background: "transparent",
            color: "var(--accent, #00d4ff)",
            borderRadius: 8,
            cursor: comment.trim() && !pending ? "pointer" : "not-allowed",
            opacity: comment.trim() && !pending ? 1 : 0.5,
          }}
        >
          {pending ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </form>
  );
}
