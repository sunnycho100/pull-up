#!/usr/bin/env bash
# Start the UKC Social dev server and open it in Chrome.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

if [ ! -f .env.local ]; then
  echo "⚠️  .env.local missing — copy .env.example and fill in your Supabase keys first."
  exit 1
fi

[ -d node_modules ] || npm install

# Reuse a server already on the port; otherwise start one.
if curl -s -o /dev/null "$URL"; then
  echo "✓ Dev server already running at $URL"
else
  echo "Starting dev server…"
  npm run dev >/tmp/ukc-dev.log 2>&1 &
  until curl -s -o /dev/null "$URL"; do sleep 1; done
  echo "✓ Dev server up at $URL"
fi

open -a "Google Chrome" "$URL"
