"""RE-KEY THE DUPLICATION LEDGER AFTER A SELECTOR LIST MOVES - AND ONLY THEN.

scripts/dupes.allow.json keys every recorded pair by the FULL TEXT of both
rules' selectors:

    adopted/field.css|.woocommerce form .form-row input.input-text,...  ==  patterns/field.css|.d-field__control,...

That is the right key - it is specific and it cannot be confused with a
different pair. It has one consequence nobody thought about until a merge pass
ran: widening a component's selector list changes the key of EVERY pair that
component is in, so the ledger reports them as NEW DEBT when the debt is the same
debt it was recording yesterday.

It happened three times in one night. Adding two price-filter selectors to
patterns/field.css restaled three entries; joining the review consent row to
.d-check restaled three more; adding `.woocommerce .button` to .d-btn restaled
five and FAILED THE DEPLOY, which is where it was finally worth automating.

    python scripts/dupes-rekey.py            report only
    python scripts/dupes-rekey.py --write    apply

WHAT IT WILL DO
  match a new pair to a stale entry when BOTH SIDES agree on (file, first
  selector). A widened list keeps its first selector, so that is a strong
  signal; it carries the old entry's `why` and `shared` forward and stamps
  `rekeyed` so a re-key can never be read as a fix.
  drop stale entries with no counterpart - that duplicate is GONE, and the
  ledger going down is the only direction it is allowed to move on its own.

WHAT IT WILL NOT DO
  invent an entry for a pair it cannot match. Those are printed and left to
  fail the gate, because a genuinely new near-duplicate is the thing the gate
  exists for and this script must never be a way around it. If it prints
  anything under GENUINELY NEW, --write still refuses.

*** THIS IS NOT --seed. *** scripts/dupes.js has a --seed that writes every
current pair into the ledger, and its own comment says re-running it after adding
duplication would launder it. This does the opposite: it preserves the debt and
only rewrites the address it is filed under.
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOW = os.path.join(ROOT, 'scripts', 'dupes.allow.json')
WRITE = '--write' in sys.argv


def sig(key):
    """(file, first selector) for each side, order-independent."""
    out = []
    for half in key.split('  ==  '):
        f, sel = half.split('|', 1)
        out.append((f, sel.split(',')[0].strip()))
    return tuple(sorted(out))


def main():
    dump = subprocess.run(['node', os.path.join(ROOT, 'scripts', 'dupes.js'), '--dump'],
                          capture_output=True, text=True, cwd=ROOT)
    if dump.returncode != 0 or not dump.stdout.strip().startswith('{'):
        sys.stderr.write('dupes.js --dump did not return JSON:\n' + (dump.stderr or dump.stdout)[:600] + '\n')
        return 2
    current = set(json.loads(dump.stdout)['keys'])

    led = json.load(io.open(ALLOW, encoding='utf-8'))
    known = {e['pair'] for e in led['allow']}
    stale = sorted(known - current)
    fresh = sorted(current - known)

    by_sig = {}
    for k in stale:
        by_sig.setdefault(sig(k), []).append(k)

    rekey, brand_new = {}, []
    for k in fresh:
        s = sig(k)
        if by_sig.get(s):
            rekey[by_sig[s].pop(0)] = k
        else:
            brand_new.append(k)
    gone = [k for v in by_sig.values() for k in v]

    print('ledger %d entries, %d pairs today' % (len(known), len(current)))
    print('  re-keyable  %d   (same two rules, a selector list moved)' % len(rekey))
    print('  resolved    %d   (the duplicate is gone)' % len(gone))
    print('  GENUINELY NEW %d' % len(brand_new))
    for k in brand_new:
        a, b = sig(k)
        print('     %s  %s' % (a[0], a[1][:60]))
        print('     %s  %s' % (b[0], b[1][:60]))
    for k in gone:
        a, b = sig(k)
        print('  -  resolved: %s %s  ==  %s %s' % (a[0], a[1][:34], b[0], b[1][:34]))

    if brand_new:
        print('\nREFUSING to write: %d pair(s) are new debt, not a moved key.' % len(brand_new))
        print('Merge them, or add them to the ledger by hand with a reason. This')
        print('script exists to preserve debt through a rename, never to absorb it.')
        return 1
    if not WRITE:
        print('\n(report only - pass --write to apply)')
        return 0

    out = []
    for e in led['allow']:
        if e['pair'] in gone:
            continue
        if e['pair'] in rekey:
            e['pair'] = rekey[e['pair']]
            e['rekeyed'] = 'selector list widened; same two rules, same debt'
        out.append(e)
    led['allow'] = out
    led['seeded'] = len(out)
    io.open(ALLOW, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(led, ensure_ascii=False, indent=1) + '\n')
    print('\nwrote %d entries (%d re-keyed, %d dropped)' % (len(out), len(rekey), len(gone)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
