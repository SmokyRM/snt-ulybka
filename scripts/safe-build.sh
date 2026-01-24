#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE=".next/lock"
LOG_PREFIX="[safe-build]"

log() { echo "$LOG_PREFIX $1"; }

# Находим next бинарь (чтобы не зависеть от глобального next)
NEXT_BIN="./node_modules/.bin/next"
if [[ ! -x "$NEXT_BIN" ]]; then
  log "ERROR: $NEXT_BIN not found. Run 'npm ci' first."
  exit 1
fi

if [[ -f "$LOCK_FILE" ]]; then
  log "Lock file exists: $LOCK_FILE"

  # Широкий поиск next-процессов (и dev, и build), чтобы не снести lock при живом процессе
  NEXT_PIDS="$(pgrep -f "(next|node).*(next|next-server)" 2>/dev/null || true)"

  # Отдельно подсветим именно build
  BUILD_PIDS="$(pgrep -f "(next|node).*next.*build" 2>/dev/null || true)"

  if [[ -n "$BUILD_PIDS" ]]; then
    log "ERROR: Active 'next build' process found (PIDs: $BUILD_PIDS)"
    exit 1
  fi

  # Возраст lock (если молодой — не трогаем, пусть человек разберётся)
  if [[ "$(uname)" == "Darwin" ]]; then
    LOCK_MTIME=$(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0)
  else
    LOCK_MTIME=$(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)
  fi

  NOW=$(date +%s)
  AGE_SEC=$((NOW - LOCK_MTIME))
  AGE_MIN=$((AGE_SEC / 60))
  log "Lock file age: ${AGE_MIN} minutes"

  if [[ $AGE_MIN -lt 30 && -n "$NEXT_PIDS" ]]; then
    log "ERROR: Lock is recent and next processes exist (PIDs: $NEXT_PIDS)."
    log "Refusing to remove lock. Investigate: ps aux | grep next"
    exit 1
  fi

  log "No active 'next build' found. Removing stale lock..."
  rm -f "$LOCK_FILE"
  log "Lock removed."
fi

log "Starting next build..."
exec "$NEXT_BIN" build "$@"
