#!/usr/bin/env bash
# deploy.sh -- Task Manager local deployment
set -e

PORT=3000
echo "=== Task Manager Local Deployment ==="
echo "Node.js: $(node --version)"
echo ""

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "ERROR: Port $PORT is already in use. Stop existing server: bash stop.sh"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[1/2] Installing dependencies..."
  npm install
else
  echo "[1/2] Dependencies already present."
fi

echo "[2/2] Starting Task Manager server..."
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > .server.pid
echo "  PID $SERVER_PID saved to .server.pid"

echo "Waiting for server to be ready..."
for i in $(seq 1 10); do
  if curl -sf http://localhost:$PORT/api/tasks >/dev/null 2>&1; then
    echo ""
    echo "=== DEPLOYMENT SUCCESSFUL ==="
    echo "App URL: http://localhost:$PORT"
    echo "Logs:    server.log"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Server did not respond within 10 seconds. Check server.log."
exit 1
