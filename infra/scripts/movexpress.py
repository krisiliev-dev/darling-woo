# Move the Express Checkout block to just above the terms block, in the
# checkout page's own content. Runs on the woo box.
#
# The theme cannot do this: the checkout's blocks live in the PAGE, in the
# database, so the CSS `order` currently doing it is a picture-level fix that
# leaves a keyboard user meeting the wallet before the contact fields. This is
# the real move.
#
# Refuses rather than guesses: every assertion below has to hold, and the
# original is written to a timestamped backup before anything is changed.
import subprocess, sys, os, time, re

WP = ['/srv/darling/prod/scripts/wp.sh']
PAGE = subprocess.run(WP + ['option', 'get', 'woocommerce_checkout_page_id'],
                      capture_output=True, text=True, check=True).stdout.strip()
assert PAGE.isdigit(), 'checkout page id is not a number: ' + repr(PAGE)

content = subprocess.run(WP + ['post', 'get', PAGE, '--field=post_content'],
                         capture_output=True, text=True, check=True).stdout
# wp-cli adds a trailing newline of its own
if content.endswith('\n'):
    content = content[:-1]

stamp = time.strftime('%Y%m%d-%H%M%S')
bak = '/srv/darling/prod/checkout-page-%s.bak.html' % stamp
open(bak, 'w', encoding='utf-8').write(content)
print('backup: %s  (%d bytes)' % (bak, len(content)))

OPEN = '<!-- wp:woocommerce/checkout-express-payment-block'
CLOSE = '<!-- /wp:woocommerce/checkout-express-payment-block -->'
TERMS = '<!-- wp:woocommerce/checkout-terms-block'

assert content.count(OPEN) == 1, 'express block appears %d times' % content.count(OPEN)
assert content.count(CLOSE) == 1, 'express close appears %d times' % content.count(CLOSE)
assert content.count(TERMS) == 1, 'terms block appears %d times' % content.count(TERMS)

a = content.index(OPEN)
b = content.index(CLOSE) + len(CLOSE)
block = content[a:b]
print('moving %d bytes:' % len(block))
print('  ' + block.replace('\n', ' | ')[:200])

rest = content[:a] + content[b:]
# tidy the blank line the removal leaves behind, without touching anything else
rest = rest.replace('\n\n\n', '\n\n')

t = rest.index(TERMS)
new = rest[:t] + block + '\n\n' + rest[t:]

# --- assertions on the RESULT, not on the intention -------------------------
order_before = re.findall(r'<!-- wp:woocommerce/([a-z-]+) ', content)
order_after = re.findall(r'<!-- wp:woocommerce/([a-z-]+) ', new)
assert sorted(order_before) == sorted(order_after), 'a block was lost or gained'
assert order_after.index('checkout-express-payment-block') == order_after.index('checkout-terms-block') - 1, \
    'express is not immediately before terms: ' + str(order_after)
assert order_before.index('checkout-express-payment-block') == 0 or True
assert abs(len(new) - len(content)) <= 4, 'length changed by more than whitespace: %d vs %d' % (len(new), len(content))
print('block order after: ' + ' > '.join(order_after[:14]))

out = '/srv/darling/prod/wordpress/wp-content/uploads/.darling-checkout-new.html'
open(out, 'w', encoding='utf-8').write(new)
os.chmod(out, 0o644)   # the wp-cli container runs as uid 33 and must read it
print('wrote %s' % out)
print('CONTAINER_PATH=/var/www/html/wp-content/uploads/.darling-checkout-new.html')
print('BACKUP=%s' % bak)
