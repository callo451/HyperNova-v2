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

# Start both the server and client using concurrently
echo "Starting development servers..."
npm run dev

# No need for cleanup function as npm run dev will handle it
echo "Servers are running. Press Ctrl+C to stop." 