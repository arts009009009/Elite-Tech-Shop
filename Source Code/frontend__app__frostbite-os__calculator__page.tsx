"use client";

import { useState, useCallback } from "react";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

function safeEval(expr: string): number {
  const tokens = expr.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens) throw new Error("Invalid expression");
  const numbers: number[] = [];
  const ops: string[] = [];
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  function applyOp() {
    const op = ops.pop()!;
    const b = numbers.pop()!;
    const a = numbers.pop()!;
    if (op === "+") numbers.push(a + b);
    else if (op === "-") numbers.push(a - b);
    else if (op === "*") numbers.push(a * b);
    else if (op === "/") { if (b === 0) throw new Error("Division by zero"); numbers.push(a / b); }
  }
  for (const token of tokens) {
    if (/^\d+\.?\d*$/.test(token)) {
      numbers.push(parseFloat(token));
    } else {
      while (ops.length && precedence[ops[ops.length - 1]] >= precedence[token]) applyOp();
      ops.push(token);
    }
  }
  while (ops.length) applyOp();
  return numbers[0];
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [lastOp, setLastOp] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState(true);

  const handleButton = useCallback((value: string) => {
    if (value === "C") {
      setDisplay("0");
      setLastOp("");
      setNewNumber(true);
      return;
    }
    if (value === "backspace") {
      setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
      return;
    }
    if (value === "=") {
      try {
        const result = String(safeEval(display));
        const entry = `${display} = ${result}`;
        setHistory((h) => [entry, ...h].slice(0, 5));
        setDisplay(result);
        setLastOp("");
        setNewNumber(true);
      } catch {
        setDisplay("Error");
        setNewNumber(true);
      }
      return;
    }
    if (["+", "-", "*", "/"].includes(value)) {
      setLastOp(value);
      setNewNumber(true);
      setDisplay((d) => d + value);
      return;
    }
    if (newNumber) {
      setDisplay(value);
      setNewNumber(false);
    } else {
      setDisplay((d) => (d === "0" ? value : d + value));
    }
  }, [display, newNumber]);

  const buttons = [
    "C", "backspace", "/", "*",
    "7", "8", "9", "-",
    "4", "5", "6", "+",
    "1", "2", "3", "=",
    "0", ".", "", "",
  ];

  return (
    <FrostbiteOSLayout title="Calculator">
      <div style={{ padding: 16, maxWidth: 320, margin: "0 auto" }}>
        <div style={{
          background: "var(--card-bg, #111)",
          border: "1px solid var(--border, #333)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}>
          <div style={{
            color: "#888",
            fontSize: 12,
            minHeight: 16,
            textAlign: "right",
          }}>
            {lastOp ? `Last: ${lastOp}` : ""}
          </div>
          <div style={{
            color: "var(--text, #e0e0e0)",
            fontSize: 28,
            fontFamily: "monospace",
            textAlign: "right",
            wordBreak: "break-all",
            minHeight: 36,
          }}>
            {display}
          </div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
        }}>
          {buttons.map((btn, i) => {
            if (!btn) return <div key={i} />;
            const isOp = ["+", "-", "*", "/", "="].includes(btn);
            const isSpecial = btn === "C" || btn === "backspace";
            return (
              <button
                key={i}
                onClick={() => handleButton(btn)}
                style={{
                  padding: "12px 0",
                  fontSize: 18,
                  fontFamily: "monospace",
                  border: "1px solid var(--border, #333)",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isOp ? "var(--accent, #00d4ff)" : isSpecial ? "#333" : "var(--card-bg, #111)",
                  color: isOp ? "#000" : "var(--text, #e0e0e0)",
                  fontWeight: isOp ? 700 : 400,
                }}
              >
                {btn === "backspace" ? "\u232B" : btn}
              </button>
            );
          })}
        </div>
        {history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>History</div>
            {history.map((h, i) => (
              <div key={i} style={{
                color: "#666",
                fontSize: 13,
                fontFamily: "monospace",
                padding: "2px 0",
              }}>
                {h}
              </div>
            ))}
          </div>
        )}
      </div>
    </FrostbiteOSLayout>
  );
}
