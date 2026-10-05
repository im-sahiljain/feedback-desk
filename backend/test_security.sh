#!/bin/bash

# Start server in background
echo "Starting server..."
PORT=5001 node server.js > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "--- Test 1: Missing Code ---"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5001/api/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}')

if [ "$RESPONSE" == "401" ]; then
  echo "✅ SUCCESS: Got 401 Unauthorized as expected."
else
  echo "❌ FAILURE: Expected 401, got $RESPONSE"
fi

echo "--- Test 2: Wrong Code ---"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5001/api/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "code": 1234}')

if [ "$RESPONSE" == "401" ]; then
  echo "✅ SUCCESS: Got 401 Unauthorized as expected."
else
  echo "❌ FAILURE: Expected 401, got $RESPONSE"
fi

echo "--- Test 3: Correct Code ---"
# We expect 200 (OK)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5001/api/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "code": 1989}')

if [ "$RESPONSE" == "200" ]; then
  echo "✅ SUCCESS: Got 200 OK as expected."
else
  echo "❌ FAILURE: Expected 200, got $RESPONSE"
fi

# Cleanup
kill $SERVER_PID
