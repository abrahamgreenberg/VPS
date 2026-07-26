#!/usr/bin/env bash
# Runs all 5 services as plain python processes on localhost - no Docker.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export ORDERS_URL=http://localhost:5001
export INVENTORY_URL=http://localhost:5002
export PAYMENTS_URL=http://localhost:5003
export GATEWAY_URL=http://localhost:5000

pids=()
cleanup() {
  echo "Stopping services..."
  kill "${pids[@]}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

python inventory/app.py & pids+=($!)
python payments/app.py & pids+=($!)
sleep 1
python orders/app.py & pids+=($!)
sleep 1
python gateway/app.py & pids+=($!)
sleep 1
python load_generator/generate.py & pids+=($!)

echo "All services started. Ctrl+C to stop."
wait
