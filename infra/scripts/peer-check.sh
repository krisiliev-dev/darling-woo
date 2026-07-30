#!/usr/bin/env bash
# Watch the OTHER box, because a box cannot credibly report its own death.
# Covers the likely failure (one box down). Does NOT cover both down —
# that needs a monitor outside both, which is why this is not the whole answer.
set -uo pipefail
APP=/srv/darling/prod
STATE="$APP/.peer-state"
LOG="$APP/logs/peer-check.log"
mkdir -p "$APP/logs"

PEER_NAME="admin panel"
PEER_URL="https://panel.darlinghome.bg/api/health"
PEER_OK_CODES="200"
FAIL_THRESHOLD=3          # consecutive failures before shouting (avoids flapping)

# Optional push notification. Set NOTIFY_URL in $APP/.notify to enable, e.g.
#   echo 'NOTIFY_URL=https://ntfy.sh/<random-topic>' > /srv/darling/prod/.notify
NOTIFY_URL=""
[ -r "$APP/.notify" ] && . "$APP/.notify"

ts() { date -u +%FT%TZ; }
notify() {
  local msg="$1"
  echo "$(ts) NOTIFY: $msg" >> "$LOG"
  [ -n "$NOTIFY_URL" ] && curl -s --max-time 10 -d "$msg" "$NOTIFY_URL" >/dev/null 2>&1 || true
}

CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$PEER_URL" 2>/dev/null) || CODE=000
FAILS=$(cat "$STATE" 2>/dev/null || echo 0)
case " $PEER_OK_CODES " in
  *" $CODE "*)
      if [ "$FAILS" -ge "$FAIL_THRESHOLD" ]; then
        notify "✅ RECOVERED: $PEER_NAME is responding again ($CODE)"
      fi
      echo 0 > "$STATE"
      echo "$(ts) ok $CODE" >> "$LOG"
      ;;
  *)
      FAILS=$((FAILS + 1)); echo "$FAILS" > "$STATE"
      echo "$(ts) FAIL $CODE (consecutive: $FAILS)" >> "$LOG"
      # notify exactly on crossing the threshold, not every run afterwards
      [ "$FAILS" -eq "$FAIL_THRESHOLD" ] && \
        notify "🔴 $PEER_NAME DOWN — $PEER_URL returned $CODE, $FAILS checks in a row"
      ;;
esac
