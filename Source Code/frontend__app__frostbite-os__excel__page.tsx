"use client";

import { useRef, useState, useCallback } from "react";
import { openFile, saveFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

const COLS = 26;
const ROWS = 20;

function colLabel(i: number) {
  return String.fromCharCode(65 + i);
}

function buildEmptyGrid(): string[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ""));
}

function parseCSV(text: string): string[][] {
  const rows = text.split(/\r?\n/).filter((r) => r.length > 0);
  return rows.map((row) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (inQuotes) {
        if (ch === '"' && row[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") { cells.push(current); current = ""; }
        else current += ch;
      }
    }
    cells.push(current);
    return cells;
  });
}

function toCSV(grid: string[][]): string {
  return grid
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return '"' + cell.replace(/"/g, '""') + '"';
          }
          return cell;
        })
        .join(",")
    )
    .join("\n");
}

export default function ExcelPage() {
  const [grid, setGrid] = useState<string[][]>(buildEmptyGrid);
  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [filename, setFilename] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
  );

  const setCell = useCallback((row: number, col: number, value: string) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = value;
      return next;
    });
  }, []);

  const focusCell = useCallback((row: number, col: number) => {
    const r = Math.max(0, Math.min(ROWS - 1, row));
    const c = Math.max(0, Math.min(COLS - 1, col));
    setSelected({ row: r, col: c });
    inputRefs.current[r]?.[c]?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (e.key === "ArrowUp") { e.preventDefault(); focusCell(row - 1, col); }
    else if (e.key === "ArrowDown") { e.preventDefault(); focusCell(row + 1, col); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); focusCell(row, col - 1); }
    else if (e.key === "ArrowRight" || e.key === "Tab") { e.preventDefault(); focusCell(row, col + 1); }
    else if (e.key === "Enter") { e.preventDefault(); focusCell(row + 1, col); }
  }, [focusCell]);

  const handleOpen = async () => {
    const result = await openFile(".csv");
    if (result) {
      const parsed = parseCSV(result.content);
      const padded: string[][] = Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => parsed[r]?.[c] ?? "")
      );
      setGrid(padded);
      setFilename(result.name);
    }
  };

  const handleSave = () => {
    const csv = toCSV(grid);
    saveFile(filename || "spreadsheet.csv", csv, "text/csv");
  };

  const selectedValue = grid[selected.row]?.[selected.col] ?? "";
  const cellAddress = `${colLabel(selected.col)}${selected.row + 1}`;
  const title = filename ? `${filename} - Excel` : "Untitled - Excel";

  return (
    <FrostbiteOSLayout title="Excel">
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "var(--card-bg, #111)", borderBottom: "1px solid var(--border, #333)" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleOpen} style={btnStyle}>Open</button>
            <button onClick={handleSave} style={btnStyle}>Save</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "var(--card-bg, #111)", borderBottom: "1px solid var(--border, #333)", fontSize: 12 }}>
          <span style={{ fontWeight: 600, minWidth: 40 }}>{cellAddress}</span>
          <input
            value={selectedValue}
            onChange={(e) => setCell(selected.row, selected.col, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusCell(selected.row + 1, selected.col); } }}
            style={{ flex: 1, background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)", border: "1px solid var(--border, #333)", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}
          />
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={cornerCell} />
                {Array.from({ length: COLS }, (_, c) => (
                  <th key={c} style={headerCell}>{colLabel(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <td style={{ ...headerCell, background: "var(--card-bg, #111)" }}>{r + 1}</td>
                  {Array.from({ length: COLS }, (_, c) => {
                    const isSelected = selected.row === r && selected.col === c;
                    return (
                      <td key={`${r}-${c}`} style={{ padding: 0 }}>
                        <input
                          ref={(el) => { inputRefs.current[r][c] = el; }}
                          value={grid[r]?.[c] ?? ""}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          onFocus={() => focusCell(r, c)}
                          onKeyDown={(e) => handleKeyDown(e, r, c)}
                          style={{
                            width: 80,
                            height: 24,
                            background: isSelected ? "rgba(0,212,255,0.15)" : "#0d0d12",
                            color: "var(--text, #e0e0e0)",
                            border: isSelected ? "1px solid var(--accent, #00d4ff)" : "1px solid #2a2a35",
                            outline: "none",
                            padding: "0 4px",
                            fontSize: 12,
                            boxSizing: "border-box",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const cornerCell: React.CSSProperties = {
  width: 40,
  height: 24,
  background: "var(--card-bg, #111)",
  borderRight: "1px solid var(--border, #333)",
  borderBottom: "1px solid var(--border, #333)",
};

const headerCell: React.CSSProperties = {
  width: 80,
  height: 24,
  background: "var(--card-bg, #111)",
  borderRight: "1px solid var(--border, #333)",
  borderBottom: "1px solid var(--border, #333)",
  fontSize: 11,
  fontWeight: 600,
  color: "#888",
  userSelect: "none",
  textAlign: "center",
};

const btnStyle: React.CSSProperties = {
  background: "var(--bg, #0a0a0f)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  borderRadius: 4,
  padding: "3px 12px",
  fontSize: 12,
  cursor: "pointer",
};
