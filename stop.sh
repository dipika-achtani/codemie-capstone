#!/usr/bin/env bash
# stop.sh -- Stop the Task Manager server

if [ -f ".server.pid" ]; then
  PID=$(cat .server.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm .server.pid
    echo "Server (PID $PID) stopped."
  else
    echo "PID $PID not running. Cleaning up."
    rm .server.pid
  fi
else
  echo "No .server.pid found. Checking port 3000..."
  PID=$(lsof -t -i:3000 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill "$PID"
    echo "Killed process on port 3000 (PID $PID)."
  else
    echo "No process on port 3000. Nothing to stop."
  fi
fi
