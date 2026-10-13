#!/usr/bin/env bash
# ----------------------------------------------------------------------
# stop.sh -- Stop the Task Manager app
# Usage: bash stop.sh
# ----------------------------------------------------------------------
set -eo pipefail

PORT=3000
PID_FILE=".server.pid"

echo "=== Task Manager -- Stop ==="

# ---------------------------------------------
# Strategy 1: use the PID file if it exists
# ---------------------------------------------
if [ -f "${PID_FILE}" ]; then
  PID=$(cat "${PID_FILE}" | tr -d '[:space:]')
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "--> Stopping server (PID ${PID})..."
    kill "$PID"
    WAIT=0
    while kill -0 "$PID" 2>/dev/null && [ $WAIT -lt 5 ]; do
      sleep 1
      WAIT=$((WAIT + 1))
    done
    if kill -0 "$PID" 2>/dev/null; then
      echo "--> Process did not exit gracefully; sending SIGKILL..."
      kill -9 "$PID"
    fi
    echo "--> Server stopped."
  else
    echo "--> PID file exists but process is not running. Nothing to stop."
  fi
  rm -f "${PID_FILE}"
  echo "--> ${PID_FILE} removed."
  exit 0
fi;

# ---------------------------------------------
# Strategy 2: fall back to finding the process on port 3000
# ---------------------------------------------
echo "--> No PID file found. Looking for a process listening on port ${PORT}..."

PID=""
if command -v lsof &>/dev/null; then
  PID=$(lsof -i TCP:"${PORT}" -state LISTEN -t 2>/dev/null || true)
elif command -v ss &>/dev/null; then
  PID=$(ss -tlnp 2>/dev/null | grep ":${PORT}" | grep -o 'pid=[0-9]*' | grep -o '[0-9]*' || true)
fi

if [ -n "$PID" ]; then
  echo "--> Killing process ${PID} listening on port ${PORT}..."
  kill "$PID" &>/dev/null || kill -9 "$PID" &>/dev/null || true
  echo "--> Server stopped."
else
  echo "--> No server running on port ${PORT}. Nothing to stop."
fi
