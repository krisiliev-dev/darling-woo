"""THE GUARD ON THE place-*.py SCRIPTS, BECAUSE THEY ARE LOADED GUNS.

Each place-*.py carries a whole component as a string literal and writes it over
the live file with io.open(path,'w'). That was right on the day it was written -
it IS the revision, prose and all, and running it applied the owner's review.
It stopped being right the moment the component moved on, and every one of them
has:

    place-card.py     patterns/card.css       snapshot 10412 -> live  7364
    place-field.py    patterns/field.css      snapshot 22768 -> live 18325
    place-notice.py   patterns/notice.css     snapshot 16396 -> live 14072
    place-rating.py   patterns/rating.css     snapshot 12753 -> live 12683
    place-table.py    patterns/table.css      snapshot 14235 -> live 10539
    place-focus.py    patterns/quantity.css   snapshot   607 -> live  5756

Measured 2026-08-11. Read the last line twice: running place-focus.py today
replaces a 5.7 KB quantity stepper with 607 bytes and prints `wrote`. There is no
prompt, no diff, no check and no backup. Six days of review would go, silently,
with a success message.

So the write goes through here instead:

    from _place import guard
    guard(path)                      # before io.open(path,'w')

and it REFUSES when the file on disk is not the snapshot the script carries,
because that means somebody edited the component afterwards and the script's
copy is history rather than intent. --force is there for the case where
re-placing really is what you want, and it has to be typed.

*** WHY NOT JUST DELETE THE SCRIPTS. *** Because the prose in them is the record
of what the owner asked for and why, revision by revision, and that is the part
of this repository that is hardest to reconstruct. The hazard is the write, not
the document. So the write is guarded and the document stays.
"""
import io
import os
import sys


def guard(path, snapshot=None):
    """Refuse to overwrite a file that has moved on from the snapshot."""
    force = '--force' in sys.argv
    if not os.path.exists(path):
        return                                   # a genuinely new file: place it
    live = io.open(path, encoding='utf-8').read()
    if snapshot is not None and live.strip() == snapshot.strip():
        return                                   # already exactly this: a no-op
    if force:
        sys.stderr.write('  --force: overwriting %s (%d bytes on disk)\n'
                         % (os.path.basename(path), len(live)))
        return
    sys.stderr.write(
        '\nREFUSING TO WRITE %s\n'
        '  on disk: %d bytes\n'
        '  this script carries: %s\n'
        '\n'
        'These place-*.py scripts each hold ONE revision of ONE component as a\n'
        'string and write it over the live file with no check. The file on disk\n'
        'is not that revision any more, so writing would delete whatever has\n'
        'happened to the component since - silently, with a success message.\n'
        'That is what this guard exists to stop.\n'
        '\n'
        'If re-placing the snapshot really is what you want, say so:\n'
        '    python %s --force\n'
        % (path, len(live),
           ('%d bytes' % len(snapshot)) if snapshot is not None else 'a snapshot',
           ' '.join(sys.argv)))
    raise SystemExit(2)
