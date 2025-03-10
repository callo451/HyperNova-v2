#!/bin/bash

# Check if port 3002 is already in use
PORT_CHECK=$(lsof -i :3002 | grep LISTEN)
if [ ! -z "$PORT_CHECK" ]; then
  echo "Port 3002 is already in use. Attempting to free it..."
  PID=$(echo "$PORT_CHECK" | awk '{print $2}')
  kill $PID
  sleep 2
  echo "Port freed."
fi

# Start the server
echo "Starting multiplayer server..."
node server.js 