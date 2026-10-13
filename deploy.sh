#!/usr/bin/env bash
# ----------------------------------------------------------------------
# deploy.sh -- Start the Task Manager app locally on port 3000
# Usage: bash deploy.sh
# ----------------------------------------------------------------------
set -eo pipefail

PORT=3000
PID_FILE=".server.pid"
LOG_FILE="server.log"
HEALTH_URL="http://localhost:${PORT}/api/tasks"

echo "=== Task Manager -- Local Deployment ==="

# ---------------------------------------------
# Step 1: Check whether port 3000 is already in use
# ---------------------------------------------
if command -v lsof &>/dev/null; then
  if lsof -i TCP:"${PORT}" -state LISTEN -t &>/dev/null; then
    echo "ERROR: Port ${PORT} is already in use." >&2
    echo "       Stop the existing process first (bash stop.sh) or choose a different port." >&2
    exit 1
  fi
elif command -v ss &>/dev/null; then
  if ss -tln | grep -q ":${PORT}"; then
    echo "ERROR: Port ${PORT} is already in use." >&2
    echo "       Stop the existing process first (bash stop.sh) or choose a different port." >&2
    exit 1
  fi
fi

# ---------------------------------------------
# Step 2: Install dependencies only if node_modules is missing
# ---------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "--> node_modules not found. Running npm install..."
  npm install
else
  echo "--> node_modules already present. Skipping npm install."
fi

# ---------------------------------------------
# Step 3: Start the server in the background
# ---------------------------------------------
echo "--> Starting Task Manager on port ${PORT}..."
nohup node server.js >"${LOG_FILE}" 2>&1 &
ECHO_PID=$!
ecN‚{ECHO_PID}" > "${PID_FILE}"
echo "--> Server PID ${ECHO_PID} saved to ${PID_FILE}."

# ---------------------------------------------
# Step 4: Wait up to 10 seconds for the app to respond
# ---------------------------------------------
echo "--> Waiting for app to become ready at ${HEALTH_URL}..."
MAX_WAIT=10
ELAPSED=0
READY=false

while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
  if curl -sf --max-time 2 "${HEALTH_URL}" >/dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ "$READY" = "true" ]; then
  echo ""
  echo "=================================================="
  echo " Task Manager is running at  http://localhost:${PORT}"
  echo " API endpoint:                ${HEALTH_URL}"
  echo " Server log:                  ${LOG_FILE}"
  echo " Stop the server:             bash stop.sh"
  echo "=================================================="
else
  echo ""
  echo "ERROR: App did not respond at ${HEALTH_URL} within ${MAX_WAIT} s" >&2
  echo "       Check ${LOG_FILEF} for details." >&2
  exit 1
fi
