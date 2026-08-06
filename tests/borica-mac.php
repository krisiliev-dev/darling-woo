<?php
/**
 * Self-test for the BORICA signing plumbing.
 *
 * Run:  scripts/wp.sh eval-file /var/www/html/wp-content/plugins/darling-checkout/../../../tests/borica-mac.php
 * There is no wrapper script - that path was never created. This file needs WordPress
 * loaded, so it is NOT in CI; the standalone gate that is, and that covers the protocol
 * itself, is tests/borica-protocol-gate.php.
 *
 * What this CAN prove without a contract: the MAC string is built to the
 * documented length-prefix rule, empty fields collapse to "-", signing and
 * verification round-trip through the hex encoding, and a tampered field breaks
 * the signature.
 *
 * What it CANNOT prove: that our MAC FIELD ORDER matches the one BORICA's
 * terminal expects. That needs the doc pack and the test terminal — it is called
 * out here so a green run is not mistaken for "BORICA is ready".
 */

require_once ABSPATH . 'wp-content/plugins/darling-checkout/includes/class-borica-gateway.php';

$fail = 0;
function check( string $what, bool $ok ): void {
	global $fail;
	if ( ! $ok ) { $fail++; }
	printf( "%-58s %s\n", $what, $ok ? 'ok' : 'FAIL' );
}

// ── the length-prefix rule ────────────────────────────────────────────────────
$mac = Darling_Borica_Gateway::mac(
	array( 'A', 'B', 'C' ),
	array( 'A' => 'V1234567', 'B' => '', 'C' => '13.50' )
);
check( 'length-prefixed concatenation', '8V1234567' === substr( $mac, 0, 9 ) );
check( 'empty field collapses to "-"',  '8V1234567-513.50' === $mac );

// A missing key and an empty string must behave identically — otherwise the MAC
// depends on whether a field was set to '' or never set, which is invisible.
$mac2 = Darling_Borica_Gateway::mac( array( 'A', 'B', 'C' ), array( 'A' => 'V1234567', 'C' => '13.50' ) );
check( 'missing key == empty value', $mac === $mac2 );

// Multibyte safety: strlen must count BYTES, because that is what the gateway
// counts. Using mb_strlen here would produce a length nobody else agrees with.
$mb = Darling_Borica_Gateway::mac( array( 'D' ), array( 'D' => 'Дарлинг' ) );
check( 'byte length, not character length', str_starts_with( $mb, '14Дарлинг' ) );

// ── sign / verify round trip, with a throwaway key ────────────────────────────
$res = openssl_pkey_new( array( 'private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA ) );
openssl_pkey_export( $res, $priv );
$pub = openssl_pkey_get_details( $res )['key'];

$payload = '8V1234567-513.50';
openssl_sign( $payload, $raw, $priv, OPENSSL_ALGO_SHA256 );
$hex = strtoupper( bin2hex( $raw ) );

check( 'signature is uppercase hex', (bool) preg_match( '/^[0-9A-F]+$/', $hex ) );
check( 'round-trips through hex',    1 === openssl_verify( $payload, hex2bin( $hex ), $pub, OPENSSL_ALGO_SHA256 ) );
check( 'tampered payload is rejected', 1 !== openssl_verify( '8V1234567-599.99', hex2bin( $hex ), $pub, OPENSSL_ALGO_SHA256 ) );

// ── the 6-digit ORDER truncation ──────────────────────────────────────────────
$m = new ReflectionMethod( 'Darling_Borica_Gateway', 'short_order' );
$m->setAccessible( true );
check( 'small order id is zero-padded to 6', '000042'  === $m->invoke( null, 42 ) );
check( 'large order id keeps LAST 6 digits', '234567'  === $m->invoke( null, 1234567 ) );

echo "\n";
echo 0 === $fail
	? "PASS - signing plumbing is correct.\n"
	: "FAILURES: $fail\n";
echo "NOTE: MAC field ORDER is still unverified - needs BORICA's doc pack + test terminal.\n";
