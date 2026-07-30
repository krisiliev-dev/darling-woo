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
# Delivery must NEVER fail silently: a notifier that swallows its own errors is
# the one thing in the system that cannot afford to.
# EMAIL_TO uses ntfy email forwarding, which REQUIRES an ntfy account —
# anonymous email sending returns HTTP 400 and the message is not delivered at
# all. So email is attempted first and ALWAYS falls back to a plain push.
notify() {
  local msg="$1" code sent=0
  echo "$(ts) NOTIFY: $msg" >> "$LOG"

  # --- private channel: email relayed through an authenticated SMTP (msmtp) ---
  # Not a local mail server: a VPS IP would be spam-filtered SILENTLY, and an
  # alert channel that fails quietly is worse than none.
  if [ -n "${EMAIL_TO:-}" ] && command -v msmtp >/dev/null 2>&1 && [ -r "$HOME/.msmtprc" ]; then
    if printf 'To: %s
Subject: [Darling] infrastructure alert
Content-Type: text/plain; charset=UTF-8

%s

Host: %s
Time: %s
'          "$EMAIL_TO" "$msg" "$(hostname)" "$(ts)" | msmtp "$EMAIL_TO" 2>>"$LOG"; then
      sent=1
    else
      echo "$(ts) ERROR: EMAIL DELIVERY FAILED" >> "$LOG"
    fi
  fi

  [ -n "$NOTIFY_URL" ] || { [ "$sent" = 1 ] || echo "$(ts) ERROR: no channel delivered" >> "$LOG"; return 0; }


  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -d "$msg" "$NOTIFY_URL") || code=000
  case "$code" in
    2*) ;;
    *) echo "$(ts) ERROR: NOTIFY DELIVERY FAILED (http=$code)" >> "$LOG" ;;
  esac
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
