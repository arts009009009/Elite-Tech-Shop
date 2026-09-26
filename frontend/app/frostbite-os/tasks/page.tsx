"use client";

import { useState, useCallback } from "react";
import { openFile, saveFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

interface Task {
  id: number;
  text: string;
  done: boolean;
}

type Filter = "all" | "active" | "done";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [nextId, setNextId] = useState(1);
  const [filename, setFilename] = useState("");

  const addTask = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const newTask: Task = { id: nextId, text, done: false };
    setTasks((prev) => [...prev, newTask]);
    setNextId(nextId + 1);
    setInput("");
  }, [input, nextId]);

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpen = useCallback(async () => {
    const result = await openFile(".json");
    if (result) {
      try {
        const parsed: Task[] = JSON.parse(result.content);
        setTasks(parsed);
        setFilename(result.name);
        setNextId(parsed.length ? Math.max(...parsed.map((t) => t.id)) + 1 : 1);
      } catch {
        alert("Invalid JSON file");
      }
    }
  }, []);

  const handleSave = useCallback(() => {
    saveFile(filename || "tasks.json", JSON.stringify(tasks, null, 2));
  }, [filename, tasks]);

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const activeCount = tasks.filter((t) => !t.done).length;

  return (
    <FrostbiteOSLayout title="Tasks">
      <div style={{ padding: 16, maxWidth: 500, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="New task..."
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "var(--bg, #0a0a0f)",
              color: "var(--text, #e0e0e0)",
              border: "1px solid var(--border, #333)",
              borderRadius: 4,
              fontSize: 14,
              outline: "none",
            }}
          />
          <button onClick={addTask} style={btnStyle}>Add</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          {(["all", "active", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...btnStyle,
                background: filter === f ? "var(--accent, #00d4ff)" : "var(--card-bg, #111)",
                color: filter === f ? "#000" : "var(--text, #e0e0e0)",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ marginLeft: "auto", color: "#888", fontSize: 12 }}>
            {activeCount} remaining
          </span>
          <button onClick={handleOpen} style={btnStyle}>Open</button>
          <button onClick={handleSave} style={btnStyle}>Save</button>
          {filename && <span style={{ color: "#888", fontSize: 12 }}>{filename}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.length === 0 && (
            <div style={{ color: "#666", textAlign: "center", padding: 24 }}>No tasks</div>
          )}
          {filtered.map((task) => (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "var(--card-bg, #111)",
                border: "1px solid var(--border, #333)",
                borderRadius: 4,
              }}
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
                style={{ cursor: "pointer" }}
              />
              <span style={{
                flex: 1,
                textDecoration: task.done ? "line-through" : "none",
                color: task.done ? "#666" : "var(--text, #e0e0e0)",
                fontSize: 14,
              }}>
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f44",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "0 4px",
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const btnStyle: React.CSSProperties = {
  background: "var(--card-bg, #111)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  padding: "6px 14px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};
