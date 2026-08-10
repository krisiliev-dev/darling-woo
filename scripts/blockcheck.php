<?php
/**
 * Does WORDPRESS agree that our block templates are valid?
 *
 * scripts/b1shell.js checks that each block comment's className appears in the
 * element beside it. That is our reading of the rule. This is WordPress's:
 * parse_blocks() then serialize_blocks(), and a template that does not come back
 * byte-identical is one the site editor would REWRITE the moment somebody opened
 * and saved it - which is how a hand-edited template quietly stops matching the
 * repo.
 *
 * It cannot run in the cloud sandbox and it cannot run on the laptop: it needs a
 * booted WordPress. So it runs on the woo box, in the wp-cli container.
 *
 *   # from the laptop
 *   scp -i ~/.ssh/id_ed25519 theme/darling/templates/*.html \
 *       darling@169.58.89.40:/tmp/b1tpl/
 *   scp -i ~/.ssh/id_ed25519 scripts/blockcheck.php darling@169.58.89.40:/tmp/
 *
 *   # on the box - NOT scripts/wp.sh, which mounts only $APP_DIR/wordpress and
 *   # cannot see /tmp/b1tpl. Mirror it with the two extra read-only mounts:
 *   NET=$(docker compose ps --format '{{.Name}}' wordpress | head -1)
 *   docker run --rm --network "container:$NET" $ENV_ARGS \
 *     -v /srv/darling/prod/wordpress:/var/www/html \
 *     -v /tmp/b1tpl:/tmp/b1tpl:ro -v /tmp/blockcheck.php:/tmp/blockcheck.php:ro \
 *     -u 33:33 wordpress:cli wp --path=/var/www/html eval-file /tmp/blockcheck.php
 *
 * *** THE `<?php` AT THE TOP IS LOAD-BEARING. *** `wp eval-file` INCLUDES the
 * file, so without it PHP treats the whole thing as literal output and wp-cli
 * cheerfully prints the source instead of running it - which looks like a
 * successful run producing strange output rather than like a mistake.
 *
 * Result 2026-08-10, after B1: the seven templates B1 touched all came back
 * ROUNDTRIP-IDENTICAL with zero className mismatches. order-confirmation.html
 * and page-checkout.html - NOT touched by B1 - each round-trip two bytes
 * shorter. Pre-existing, cause unidentified, and it means WordPress would
 * rewrite those two on save.
 */

foreach (glob('/tmp/b1tpl/*.html') as $f) {
	$src = file_get_contents($f);
	$blocks = parse_blocks($src);
	$named = 0;
	$free = 0;
	$cls = 0;
	$bad = array();

	$walk = function ($bs) use (&$walk, &$named, &$free, &$cls, &$bad) {
		foreach ($bs as $b) {
			if ($b['blockName'] === null) {
				// free HTML between blocks is legitimate in these templates
				if (trim($b['innerHTML']) !== '') {
					$free++;
				}
			} else {
				$named++;
				if (isset($b['attrs']['className'])) {
					$cls++;
					$inner = $b['innerHTML'];
					// a DYNAMIC block saves no HTML - WordPress applies the
					// className in PHP, so there is nothing here to disagree with
					if (trim($inner) !== '') {
						foreach (preg_split('/\s+/', trim($b['attrs']['className'])) as $c) {
							if ($c === '') {
								continue;
							}
							if (strpos($inner, $c) === false) {
								$bad[] = $b['blockName'] . ' -> "' . $c . '" is in the comment but not in its saved HTML';
							}
						}
					}
				}
			}
			if (!empty($b['innerBlocks'])) {
				$walk($b['innerBlocks']);
			}
		}
	};
	$walk($blocks);

	$round = serialize_blocks($blocks);
	$ok = ($round === $src)
		? 'ROUNDTRIP-IDENTICAL'
		: ('ROUNDTRIP-DIFFERS ' . strlen($round) . ' vs ' . strlen($src));

	printf("%-30s named=%-3d free=%-2d className=%-3d %s\n", basename($f), $named, $free, $cls, $ok);
	foreach (array_unique($bad) as $b2) {
		echo "      MISMATCH: $b2\n";
	}
}
