"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

type Mode = "evaluate" | "derivative" | "graph";

interface CalcPoint {
  x: number;
  y: number | null;
}

interface HistoryEntry {
  expression: string;
  result: string;
  timeUs: number;
}

interface EvaluateResponse {
  expression: string;
  result: number;
  time_us: number;
  unit: string;
}

interface DifferentiateResponse {
  expression: string;
  derivative: string;
  variable: string;
  time_us: number;
  unit: string;
}

const MODES: { id: Mode; label: string }[] = [
  { id: "evaluate", label: "Evaluate" },
  { id: "derivative", label: "Derivative" },
  { id: "graph", label: "Graph" },
];

const KEY_ROWS: string[][] = [
  ["sin(", "cos(", "tan(", "ln(", "⌫"],
  ["sqrt(", "log(", "^", "(", ")"],
  ["pi", "e", "x", "/", "C"],
  ["7", "8", "9", "*", "-"],
  ["4", "5", "6", "+", "="],
  ["1", "2", "3", "0", "."],
];

const BACKEND_HINT =
  "Calculator backend unreachable — start it with ./build/calc_server (port 8084).";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return value.toString();
  return String(Number(value.toPrecision(12)));
}

async function calcApi<T>(
  endpoint: "evaluate" | "differentiate" | "plot",
  payload: Record<string, unknown>
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/calc/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(BACKEND_HINT);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "";
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return body as T;
}

function parseFinite(raw: string, label: string): number {
  const value = Number(raw.trim());
  if (raw.trim() === "" || !Number.isFinite(value)) {
    throw new Error(`"${label}" must be a finite number`);
  }
  return value;
}

function GraphView({ points }: { points: CalcPoint[] }) {
  const graph = useMemo(() => {
    const width = 640;
    const height = 320;
    const left = 52;
    const right = 14;
    const top = 14;
    const bottom = 30;

    const runs: { x: number; y: number }[][] = [];
    let current: { x: number; y: number }[] = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      if (point.y === null || !Number.isFinite(point.y)) {
        if (current.length > 0) runs.push(current);
        current = [];
        continue;
      }
      current.push({ x: point.x, y: point.y });
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
    if (current.length > 0) runs.push(current);

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    if (minX === maxX) {
      minX -= 1;
      maxX += 1;
    }
    if (minY === maxY) {
      const spread = Math.max(1, Math.abs(minY) * 0.1);
      minY -= spread;
      maxY += spread;
    }
    const pad = (maxY - minY) * 0.08;
    minY -= pad;
    maxY += pad;

    const scaleX = (x: number) =>
      left + ((x - minX) / (maxX - minX)) * (width - left - right);
    const scaleY = (y: number) =>
      top + ((maxY - y) / (maxY - minY)) * (height - top - bottom);

    const polylines = runs
      .map((run) =>
        run
          .map((point) => `${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`)
          .join(" ")
      )
      .filter((value) => value.length > 0);

    return {
      width,
      height,
      polylines,
      zeroX: minX <= 0 && maxX >= 0 ? scaleX(0) : null,
      zeroY: minY <= 0 && maxY >= 0 ? scaleY(0) : null,
      labels: {
        minX: formatNumber(minX),
        maxX: formatNumber(maxX),
        minY: formatNumber(minY),
        maxY: formatNumber(maxY),
      },
      yLeft: left,
      yRight: width - right,
      xTop: top,
      xBottom: height - bottom,
    };
  }, [points]);

  if (!graph) {
    return (
      <div style={{ color: "#e06c75", fontSize: 13, padding: "12px 0" }}>
        No plottable points in this range.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      width="100%"
      data-testid="calc-graph"
      role="img"
      aria-label="Function graph"
      style={{
        display: "block",
        background: "var(--card-bg, #111)",
        border: "1px solid var(--border, #333)",
        borderRadius: 8,
        marginTop: 12,
      }}
    >
      <line
        x1={graph.yLeft}
        y1={graph.xTop}
        x2={graph.yLeft}
        y2={graph.xBottom}
        stroke="#333"
        strokeWidth="1"
      />
      <line
        x1={graph.yLeft}
        y1={graph.xBottom}
        x2={graph.yRight}
        y2={graph.xBottom}
        stroke="#333"
        strokeWidth="1"
      />
      {graph.zeroX !== null && (
        <line
          x1={graph.zeroX}
          y1={graph.xTop}
          x2={graph.zeroX}
          y2={graph.xBottom}
          stroke="#444"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
      )}
      {graph.zeroY !== null && (
        <line
          x1={graph.yLeft}
          y1={graph.zeroY}
          x2={graph.yRight}
          y2={graph.zeroY}
          stroke="#444"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
      )}
      {graph.polylines.map((pointsAttr, index) => (
        <polyline
          key={index}
          points={pointsAttr}
          fill="none"
          stroke="var(--accent, #00d4ff)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <text x={4} y={graph.xTop + 10} fill="#888" fontSize="11" fontFamily="monospace">
        {graph.labels.maxY}
      </text>
      <text x={4} y={graph.xBottom} fill="#888" fontSize="11" fontFamily="monospace">
        {graph.labels.minY}
      </text>
      <text x={graph.yLeft} y={graph.height - 10} fill="#888" fontSize="11" fontFamily="monospace">
        {graph.labels.minX}
      </text>
      <text
        x={graph.yRight}
        y={graph.height - 10}
        fill="#888"
        fontSize="11"
        fontFamily="monospace"
        textAnchor="end"
      >
        {graph.labels.maxX}
      </text>
    </svg>
  );
}

export default function CalculatorPage() {
  const [mode, setMode] = useState<Mode>("evaluate");
  const [expression, setExpression] = useState("2 + 3 * 4");
  const [variable, setVariable] = useState("x");
  const [xValue, setXValue] = useState("");
  const [minX, setMinX] = useState("-10");
  const [maxX, setMaxX] = useState("10");
  const [steps, setSteps] = useState("500");

  const [result, setResult] = useState<string | null>(null);
  const [evalTime, setEvalTime] = useState<number | null>(null);
  const [derivative, setDerivative] = useState<string | null>(null);
  const [diffTime, setDiffTime] = useState<number | null>(null);
  const [points, setPoints] = useState<CalcPoint[] | null>(null);
  const [graphInfo, setGraphInfo] = useState<{ count: number; timeUs: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    const trimmed = expression.trim();
    if (!trimmed) {
      setError("Enter an expression first.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "evaluate") {
        const payload: Record<string, unknown> = { expression: trimmed };
        if (xValue.trim() !== "") payload.x = parseFinite(xValue, "x");
        const data = await calcApi<EvaluateResponse>("evaluate", payload);
        const text = formatNumber(data.result);
        setResult(text);
        setEvalTime(data.time_us);
        setHistory((entries) =>
          [{ expression: trimmed, result: text, timeUs: data.time_us }, ...entries].slice(0, 8)
        );
      } else if (mode === "derivative") {
        const data = await calcApi<DifferentiateResponse>("differentiate", {
          expression: trimmed,
          variable: variable.trim() || "x",
        });
        setDerivative(data.derivative);
        setDiffTime(data.time_us);
      } else {
        const lo = parseFinite(minX, "min_x");
        const hi = parseFinite(maxX, "max_x");
        if (lo >= hi) throw new Error("min_x must be smaller than max_x");
        const count = Number(steps);
        if (!Number.isInteger(count) || count < 1 || count > 20000) {
          throw new Error("steps must be an integer between 1 and 20000");
        }
        const started = performance.now();
        const data = await calcApi<CalcPoint[]>("plot", {
          expression: trimmed,
          min_x: lo,
          max_x: hi,
          steps: count,
        });
        setPoints(data);
        setGraphInfo({
          count: data.length,
          timeUs: Math.round(performance.now() - started),
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [expression, maxX, minX, mode, steps, variable, xValue]);

  const pressKey = useCallback(
    (key: string) => {
      if (key === "=") {
        void run();
        return;
      }
      if (key === "C") {
        setExpression("");
        setError(null);
        return;
      }
      if (key === "⌫") {
        setExpression((value) => value.slice(0, -1));
        return;
      }
      setExpression((value) => value + key);
    },
    [run]
  );

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    fontSize: 15,
    fontFamily: "monospace",
    color: "var(--text, #e0e0e0)",
    background: "var(--bg, #0a0a0f)",
    border: "1px solid var(--border, #333)",
    borderRadius: 6,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    color: "#888",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };

  return (
    <FrostbiteOSLayout title="Calculator">
      <div
        style={{
          height: "100%",
          overflow: "auto",
          padding: 16,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMode(item.id);
                setError(null);
              }}
              style={{
                padding: "7px 14px",
                fontSize: 13,
                borderRadius: 6,
                cursor: "pointer",
                border: "1px solid var(--border, #333)",
                background: mode === item.id ? "var(--accent, #00d4ff)" : "var(--card-bg, #111)",
                color: mode === item.id ? "#000" : "var(--text, #e0e0e0)",
                fontWeight: mode === item.id ? 700 : 400,
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ alignSelf: "center", color: "#666", fontSize: 11, fontFamily: "monospace" }}>
            C++ backend
          </span>
        </div>

        <div
          style={{
            background: "var(--card-bg, #111)",
            border: "1px solid var(--border, #333)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <label style={labelStyle} htmlFor="calc-expression">
            {mode === "derivative" ? "f(x)" : "expression"}
          </label>
          <input
            id="calc-expression"
            style={inputStyle}
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void run();
            }}
            spellCheck={false}
            autoComplete="off"
          />

          {mode === "evaluate" && (
            <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "flex-end" }}>
              <div style={{ width: 120 }}>
                <label style={labelStyle} htmlFor="calc-x">
                  x =
                </label>
                <input
                  id="calc-x"
                  style={inputStyle}
                  value={xValue}
                  placeholder="optional"
                  onChange={(event) => setXValue(event.target.value)}
                  spellCheck={false}
                />
              </div>
              <div style={{ flex: 1, color: "#666", fontSize: 12, paddingBottom: 9 }}>
                Leave blank unless the expression contains x.
              </div>
            </div>
          )}

          {mode === "derivative" && (
            <div style={{ marginTop: 10, width: 160 }}>
              <label style={labelStyle} htmlFor="calc-variable">
                variable
              </label>
              <input
                id="calc-variable"
                style={inputStyle}
                value={variable}
                onChange={(event) => setVariable(event.target.value)}
                spellCheck={false}
              />
            </div>
          )}

          {mode === "graph" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 10,
                marginTop: 10,
              }}
            >
              <div>
                <label style={labelStyle} htmlFor="calc-min">
                  min x
                </label>
                <input id="calc-min" style={inputStyle} value={minX} onChange={(e) => setMinX(e.target.value)} spellCheck={false} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="calc-max">
                  max x
                </label>
                <input id="calc-max" style={inputStyle} value={maxX} onChange={(e) => setMaxX(e.target.value)} spellCheck={false} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="calc-steps">
                  points
                </label>
                <input id="calc-steps" style={inputStyle} value={steps} onChange={(e) => setSteps(e.target.value)} spellCheck={false} />
              </div>
            </div>
          )}

          {error && (
            <div
              data-testid="calc-error"
              style={{
                marginTop: 10,
                color: "#e06c75",
                fontSize: 13,
                fontFamily: "monospace",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {mode === "evaluate" && result !== null && (
            <div data-testid="calc-result" style={{ marginTop: 12, textAlign: "right" }}>
              <div style={{ color: "#666", fontSize: 11, fontFamily: "monospace" }}>
                {expression} = {evalTime} µs
              </div>
              <div
                style={{
                  color: "var(--text, #e0e0e0)",
                  fontSize: 30,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {result}
              </div>
            </div>
          )}

          {mode === "derivative" && derivative !== null && (
            <div data-testid="calc-derivative" style={{ marginTop: 12 }}>
              <div style={{ color: "#666", fontSize: 11, fontFamily: "monospace" }}>
                d/d{variable.trim() || "x"} in {diffTime} µs
              </div>
              <div
                style={{
                  color: "var(--text, #e0e0e0)",
                  fontSize: 20,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {derivative}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {KEY_ROWS.flat().map((key, index) => {
            const isEquals = key === "=";
            const isClear = key === "C" || key === "⌫";
            const isOperator = ["+", "-", "*", "/", "^"].includes(key);
            return (
              <button
                key={`${key}-${index}`}
                onClick={() => pressKey(key)}
                disabled={busy && isEquals}
                style={{
                  padding: "11px 0",
                  fontSize: 15,
                  fontFamily: "monospace",
                  border: "1px solid var(--border, #333)",
                  borderRadius: 6,
                  cursor: busy && isEquals ? "wait" : "pointer",
                  background: isEquals
                    ? "var(--accent, #00d4ff)"
                    : isClear
                      ? "#2a2a35"
                      : "var(--card-bg, #111)",
                  color: isEquals ? "#000" : isOperator ? "#82d8ff" : "var(--text, #e0e0e0)",
                  fontWeight: isEquals || isOperator ? 700 : 400,
                  opacity: busy && isEquals ? 0.6 : 1,
                }}
              >
                {key}
              </button>
            );
          })}
        </div>

        {mode === "graph" && points && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 2 }}>
              Graph{graphInfo ? ` · ${graphInfo.count} points · ${graphInfo.timeUs} ms` : ""}
            </div>
            <GraphView points={points} />
          </div>
        )}

        {mode === "evaluate" && history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>History</div>
            {history.map((entry, index) => (
              <div
                key={`${entry.expression}-${index}`}
                style={{
                  color: "#666",
                  fontSize: 13,
                  fontFamily: "monospace",
                  padding: "2px 0",
                  cursor: "pointer",
                }}
                onClick={() => setExpression(entry.expression)}
                title="Reuse this expression"
              >
                {entry.expression} = {entry.result}
              </div>
            ))}
          </div>
        )}
      </div>
    </FrostbiteOSLayout>
  );
}
