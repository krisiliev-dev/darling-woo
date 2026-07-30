<?php
/**
 * Report the Stripe configuration WITHOUT printing any credential.
 *
 * Redaction walks VALUES, recursively, and matches on the credential prefixes
 * themselves. An earlier version matched on field NAMES — so `webhook_data`,
 * which contains a secret key but is not called one, printed in full and leaked
 * a live key. A field name is somebody's description of a value; only the value
 * knows what it actually is. Match the value.
 */

function darling_scrub( $v ) {
	if ( is_array( $v ) ) {
		return array_map( 'darling_scrub', $v );
	}
	$s = (string) $v;

	// Any Stripe credential, wherever it appears and whatever the field is called.
	if ( preg_match( '/^(sk|pk|rk)_(live|test)_|^whsec_/', $s ) ) {
		preg_match( '/^(?:sk|pk|rk)_(?:live|test)_|^whsec_/', $s, $m );
		return $m[0] . '… (' . strlen( $s ) . ' chars)';
	}

	// Credentials also hide inside JSON blobs, which a flat scan walks straight past.
	$j = json_decode( $s, true );
	if ( is_array( $j ) ) {
		return json_encode( darling_scrub( $j ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	}
	return $s;
}

$s = get_option( 'woocommerce_stripe_settings', array() );

$fields = array(
	'enabled', 'testmode', 'connection_type',
	'publishable_key', 'secret_key', 'webhook_secret',
	'test_publishable_key', 'test_secret_key', 'test_webhook_secret',
	'webhook_data',
);
foreach ( $fields as $k ) {
	$v = $s[ $k ] ?? '';
	if ( '' === $v || null === $v ) {
		printf( "  %-24s (EMPTY)\n", $k );
		continue;
	}
	$scrubbed = darling_scrub( $v );
	// webhook_data is an ARRAY, and printf("%s") on it yields the string "Array" —
	// which reads like successful redaction while proving nothing. Render it fully
	// so the output actually demonstrates the nested value was caught.
	printf( "  %-24s %s\n", $k, is_scalar( $scrubbed ) ? $scrubbed : json_encode( $scrubbed, JSON_UNESCAPED_SLASHES ) );
}

echo "\n  --- consistency ---\n";
$test  = 'yes' === ( $s['testmode'] ?? 'no' );
$tpk   = (string) ( $s['test_publishable_key'] ?? '' );
$tsk   = (string) ( $s['test_secret_key'] ?? '' );
$twh   = (string) ( $s['test_webhook_secret'] ?? '' );

printf( "  test mode active:            %s\n", $test ? 'YES' : 'no' );
printf( "  test keys present:           %s\n", ( $tpk && $tsk ) ? 'YES' : 'NO' );
printf( "  test keys are TEST keys:     %s\n",
	( str_starts_with( $tpk, 'pk_test_' ) && str_starts_with( $tsk, 'sk_test_' ) ) ? 'YES' : 'NO  <-- wrong key type' );
printf( "  test webhook secret present: %s\n", $twh ? 'YES' : 'NO  <-- Stripe events will be rejected' );

// The failure that actually costs money: test mode on, but live keys still being
// used because the test pair is incomplete.
if ( $test && ! ( $tpk && $tsk ) ) {
	echo "  ⚠ TEST MODE WITH NO TEST KEYS — checkout will fail.\n";
}
if ( ! $test && $tpk && $tsk ) {
	echo "  ⚠ test keys stored but LIVE mode active — a checkout here charges real money.\n";
}

echo "\n  --- gateways the customer will see ---\n";
$gw = WC()->payment_gateways()->payment_gateways();
foreach ( array( 'stripe', 'cod', 'darling_borica' ) as $id ) {
	if ( isset( $gw[ $id ] ) ) {
		printf( "  %-16s enabled=%-4s available=%s\n", $id, $gw[ $id ]->enabled, $gw[ $id ]->is_available() ? 'YES' : 'no' );
	}
}
