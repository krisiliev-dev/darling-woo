#!/usr/bin/env bash
# The whole suite, in the order that makes a failure easiest to read: the cheap
# static checks first, the pixels last.
set -euo pipefail
cd "$(dirname "$0")"

echo "== mirror"   ; node mirror.js
echo "== capture"  ; node capture.js
echo "== assert"   ; node assert.js
echo "== shots"    ; node shots.js
