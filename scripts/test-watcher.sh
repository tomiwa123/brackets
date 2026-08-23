#!/bin/bash
STATE_FILE="/tmp/openclaw_test_state"
if [ -f "$STATE_FILE" ]; then
  echo "NO_REPLY"
  rm "$STATE_FILE"
else
  echo "test"
  touch "$STATE_FILE"
fi
