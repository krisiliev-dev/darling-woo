#!/usr/bin/env bash
# The whole suite, in the order that makes a failure easiest to read: the cheap
# static checks first, the pixels last.
set -euo pipefail
cd "$(dirname "$0")"

# The design gates come first: they are seconds, they need no baseline, and each
# one has a counterfactual proving it can fail. A pixel diff that follows a
# broken accessible name is a slower way to learn the same thing.
echo "== names"    ; node ../namegate.js
echo "== hidden"   ; DARLING_MIRROR="$PWD/mirror" node ../srgate.js || echo "   (srgate needs a mirror; run after mirror.js)"

echo "== mirror"   ; node mirror.js
echo "== capture"  ; node capture.js
echo "== assert"   ; node assert.js
echo "== shots"    ; node shots.js
