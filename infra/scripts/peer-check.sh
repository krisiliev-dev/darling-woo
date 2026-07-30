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
FAIL_THRESHOLD=3          # consecutive failures before shouting (avoids flapping)

# Optional push notification. Set NOTIFY_URL in $APP/.notify to enable, e.g.
#   echo 'NOTIFY_URL=https://ntfy.sh/<random-topic>' > /srv/darling/prod/.notify
NOTIFY_URL=""
[ -r "$APP/.notify" ] && . "$APP/.notify"

ts() { date -u +%FT%TZ; }
# EMAIL_TO (optional) uses ntfy's built-in email forwarding, so there is no SMTP
# credential to store and no local MTA (which would land in spam from a VPS IP).
notify() {
  local msg="$1"
  echo "$(ts) NOTIFY: $msg" >> "$LOG"
  [ -n "$NOTIFY_URL" ] || return 0
  if [ -n "${EMAIL_TO:-}" ]; then
    # Title stays ASCII: non-ASCII in an HTTP header gets mangled.
    curl -s --max-time 15 -H "Title: Darling infrastructure alert"          -H "Email: $EMAIL_TO" -d "$msg" "$NOTIFY_URL" >/dev/null 2>&1 || true
  else
    curl -s --max-time 15 -d "$msg" "$NOTIFY_URL" >/dev/null 2>&1 || true
  fi
}

# Assert the BODY, not just the status. The panel is a SPA: an unknown path —
# or a dead API with the frontend still served — returns 200 with index.html.
# A status-only check would call that healthy. Verified: /definitely-not-real -> 200.
# `|| RESP=` and not `|| echo`: curl prints AND exits non-zero on failure, so the
# echo form concatenates (this is the 000000 bug, found independently on both boxes).
RESP=$(curl -s --max-time 15 -w '
%{http_code}' "$PEER_URL" 2>/dev/null) || RESP=$'
000'
CODE=$(printf '%s' "$RESP" | tail -n1)
BODY=$(printf '%s' "$RESP" | sed '$d')
HEALTHY=no
if [ "$CODE" = "200" ] && printf '%s' "$BODY" | grep -q '"db"[[:space:]]*:[[:space:]]*"ok"'; then
  HEALTHY=yes
fi

FAILS=$(cat "$STATE" 2>/dev/null || echo 0)
case "$HEALTHY" in
  yes)
      if [ "$FAILS" -ge "$FAIL_THRESHOLD" ]; then
        notify "✅ peer RECOVERED"
      fi
      echo 0 > "$STATE"
      echo "$(ts) ok http=$CODE db:ok" >> "$LOG"
      ;;
  *)
      FAILS=$((FAILS + 1)); echo "$FAILS" > "$STATE"
      echo "$(ts) FAIL http=$CODE db_ok=no (consecutive: $FAILS)" >> "$LOG"
      # notify exactly on crossing the threshold, not every run afterwards
      [ "$FAILS" -eq "$FAIL_THRESHOLD" ] && \
        # Alert bodies are deliberately NON-IDENTIFYING: an ntfy.sh public topic is
        # readable by anyone who learns the topic name, so no hostnames, URLs or
        # counts of anything. Detail stays in the local log.
        notify "🔴 peer UNHEALTHY (http=$CODE) — $FAILS checks in a row. See peer-check.log"
      ;;
esac
