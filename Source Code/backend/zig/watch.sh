#!/usr/bin/env bash
# Auto-build and rerun the Zig backend whenever source files change.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v zig &>/dev/null; then
  echo "error: zig is not installed. Install it (e.g. 'nix develop' or 'brew install zig')." >&2
  exit 1
fi

echo "=== zig-platform auto-build ==="
echo "Watching: src/main.zig"
echo "Press Ctrl+C to stop."
echo

# Function to build and run.
build_and_run() {
  zig build -Doptimize=Debug 2>&1 | tee /tmp/zig-build.log
  local status=${PIPESTATUS[0]}

  if [ "$status" -ne 0 ]; then
    echo "Build failed — waiting for changes..."
    return 1
  fi

  echo "Starting zig-platform on :8090..."
  # Run the freshly built binary.
  ./zig-out/bin/zig-platform &
  local pid=$!
  echo "PID: $pid"
  echo "$pid" > /tmp/zig-platform.pid
  wait "$pid" 2>/dev/null || true
  echo "Process exited."
}

last_hash=""
while true; do
  current_hash=$(find src -type f -exec sha256sum {} + 2>/dev/null | sha256sum | cut -d' ' -f1)

  if [ "$current_hash" != "$last_hash" ]; then
    last_hash="$current_hash"

    # Stop previous instance if running.
    if [ -f /tmp/zig-platform.pid ]; then
      old_pid=$(cat /tmp/zig-platform.pid 2>/dev/null || true)
      if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
        kill "$old_pid" 2>/dev/null || true
        wait "$old_pid" 2>/dev/null || true
      fi
      rm -f /tmp/zig-platform.pid
    fi

    build_and_run
  fi

  sleep 1
done
