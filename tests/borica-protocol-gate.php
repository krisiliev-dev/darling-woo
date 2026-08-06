<?php
/**
 * Vector gate for Darling_Borica_Protocol.
 *
 * Runs standalone (no WordPress, no PHPUnit):
 *     php test-borica-protocol.php
 *
 * It loads the SAME borica-vectors.json the Python core is gated with, so the
 * two implementations cannot drift. Five of the response vectors carry real
 * signatures from BORICA's test terminal V1800001.
 *
 * Exit code 0 = every assertion passed. Anything else = do not deploy.
 */

define( 'DARLING_BORICA_CLI', true );
require __DIR__ . '/class-borica-protocol.php';

$P      = 'Darling_Borica_Protocol';
$passed = 0;
$failed = array();

function check( $label, $condition, $detail = '' ) {
	global $passed, $failed;
	if ( $condition ) {
		$passed++;
	} else {
		$failed[] = $label . ( '' !== $detail ? ' :: ' . $detail : '' );
	}
}

function throws( $label, callable $fn ) {
	try {
		$fn();
		check( $label, false, 'expected an exception, got none' );
	} catch ( Exception $e ) {
		check( $label, true );
	}
}

$vectors = json_decode( file_get_contents( __DIR__ . '/borica-vectors.json' ), true );
if ( ! $vectors ) {
	fwrite( STDERR, "cannot read borica-vectors.json\n" );
	exit( 2 );
}
$apgw_pem = "-----BEGIN PUBLIC KEY-----\n"
	. chunk_split( $vectors['apgw_test_pubkey_b64'], 64, "\n" )
	. "-----END PUBLIC KEY-----\n";

/* ------------------------------------------------- MAC string, requests */
foreach ( $vectors['requests'] as $vec ) {
	$fields = $vec['fields'];
	$got    = $P::mac_source( $P::request_sign_fields( $fields['TRTYPE'] ), $fields );
	check( 'request mac: ' . $vec['label'], $got === $vec['mac_source'],
		"want {$vec['mac_source']}\n      got  {$got}" );
}

/* ------------------------------------------------ MAC string, responses */
foreach ( $vectors['responses'] as $i => $vec ) {
	$got = $P::mac_source( $P::response_sign_fields(), $vec['fields'] );
	check( "response mac #$i", $got === $vec['mac_source'],
		"want {$vec['mac_source']}\n      got  {$got}" );
}

/* -------------------------------------------- real signatures from BORICA */
foreach ( $vectors['responses'] as $i => $vec ) {
	$v = $P::verify_response( $vec['fields'], $apgw_pem );
	check( "real BORICA signature #$i verifies", $v['ok'], 'variant=' . $v['variant'] );
	check( "real BORICA signature #$i is canonical (no RFU)", 'canonical' === $v['variant'],
		'variant=' . $v['variant'] );
}

/* ------------------------------------------------------------ tampering */
$tampered            = $vectors['responses'][0]['fields'];
$tampered['AMOUNT']  = '9999.00';
check( 'edited AMOUNT fails verification', ! $P::verify_response( $tampered, $apgw_pem )['ok'] );

$declined = null;
foreach ( $vectors['responses'] as $vec ) {
	if ( '00' !== $vec['fields']['RC'] ) {
		$declined = $vec['fields'];
		break;
	}
}
$declined['ACTION'] = '0';
$declined['RC']     = '00';
check( 'decline edited to look approved fails verification',
	! $P::verify_response( $declined, $apgw_pem )['ok'] );

foreach ( array( '', '   ', 'ZZZZ', '0000000000', 'ABC' ) as $bad ) {
	$junk           = $vectors['responses'][0]['fields'];
	$junk['P_SIGN'] = $bad;
	check( 'garbage P_SIGN rejected: ' . var_export( $bad, true ),
		! $P::verify_response( $junk, $apgw_pem )['ok'] );
}
$nosig = $vectors['responses'][0]['fields'];
unset( $nosig['P_SIGN'] );
check( 'absent P_SIGN rejected', ! $P::verify_response( $nosig, $apgw_pem )['ok'] );

/* ---------------------------------------- sign with a key we generate here */
$res = openssl_pkey_new( array( 'private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA ) );
openssl_pkey_export( $res, $our_pem );
$our_pub = openssl_pkey_get_details( $res )['key'];

$sale = array(
	'TERMINAL'  => 'V1800001',
	'TRTYPE'    => '1',
	'AMOUNT'    => $P::format_amount( '19.9' ),
	'CURRENCY'  => 'EUR',
	'ORDER'     => $P::format_order( 42 ),
	'TIMESTAMP' => $P::utc_timestamp( 1786000000 ),
	'NONCE'     => $P::new_nonce(),
);
$sign = $P::sign_request( $sale, $our_pem );
check( 'P_SIGN is 512 uppercase hex chars',
	512 === strlen( $sign ) && preg_match( '/^[0-9A-F]+$/', $sign ) );
$src = $P::mac_source( $P::request_sign_fields( '1' ), $sale );
check( 'our own request signature verifies',
	1 === openssl_verify( $src, hex2bin( $sign ), $our_pub, OPENSSL_ALGO_SHA256 ) );
check( 'request signing string ends with the RFU dash', '-' === substr( $src, -1 ) );

$small = openssl_pkey_new( array( 'private_key_bits' => 1024, 'private_key_type' => OPENSSL_KEYTYPE_RSA ) );
openssl_pkey_export( $small, $small_pem );
throws( 'a 1024-bit key is refused', function () use ( $P, $sale, $small_pem ) {
	$P::sign_request( $sale, $small_pem );
} );

/* ---------------------------- PHP <-> Python agreement on the same inputs */
check( 'status check signs exactly four fields',
	array( 'TERMINAL', 'TRTYPE', 'ORDER', 'NONCE' ) === $P::request_sign_fields( '90' ) );
$status_src = $P::mac_source( $P::request_sign_fields( '90' ),
	array( 'TERMINAL' => 'V1800001', 'TRTYPE' => '90', 'ORDER' => '114233', 'NONCE' => str_repeat( 'A', 32 ) ) );
check( 'status check string has no RFU dash', '-' !== substr( $status_src, -1 ) );
throws( 'unsupported TRTYPE refused', function () use ( $P ) {
	$P::request_sign_fields( '99' );
} );

/* ------------------------------------------------------------- helpers */
check( 'empty fields become a single dash', '1x--' === $P::mac_source( array( 'A', 'B', 'C' ), array( 'A' => 'x', 'B' => '' ) ) );
check( 'length prefix counts UTF-8 bytes', '14Дарлинг' === $P::mac_source( array( 'X' ), array( 'X' => 'Дарлинг' ) ) );

check( 'amount 9 -> 9.00', '9.00' === $P::format_amount( '9' ) );
check( 'amount 1234,50 -> 1234.50', '1234.50' === $P::format_amount( '1234,50' ) );
check( 'amount 0.295 rounds half up', '0.30' === $P::format_amount( '0.295' ) );
check( 'amount 19.9 -> 19.90', '19.90' === $P::format_amount( '19.9' ) );
throws( 'float amount refused', function () use ( $P ) {
	$P::format_amount( 19.90 );
} );
throws( 'zero amount refused', function () use ( $P ) {
	$P::format_amount( '0' );
} );
throws( 'non-numeric amount refused', function () use ( $P ) {
	$P::format_amount( 'abc' );
} );

check( 'order 123 -> 000123', '000123' === $P::format_order( 123 ) );
throws( 'order over 6 digits refused', function () use ( $P ) {
	$P::format_order( '1234567' );
} );
throws( 'non-numeric order refused', function () use ( $P ) {
	$P::format_order( '12a' );
} );

$nonces = array();
for ( $i = 0; $i < 500; $i++ ) {
	$nonces[ $P::new_nonce() ] = 1;
}
check( '500 nonces are all distinct', 500 === count( $nonces ) );
check( 'nonce is 32 uppercase hex', preg_match( '/^[0-9A-F]{32}$/', $P::new_nonce() ) );
check( 'timestamp is UTC', '20260806143005' === $P::utc_timestamp( gmmktime( 14, 30, 5, 8, 6, 2026 ) ) );

$ad = $P::bor_order_id( '000007', 'WC;1234-Дарлинг' );
check( 'bor order id starts with ORDER', 0 === strpos( $ad, '000007' ) );
check( 'bor order id has no semicolon', false === strpos( $ad, ';' ) );
check( 'bor order id fits 22 chars', strlen( $ad ) <= 22 );

$minfo = json_decode( base64_decode( $P::m_info( array(
	'name'         => 'Иван Петров',
	'email'        => 'ivan@example.com',
	'phone'        => '0893 361 670',
	'bill_address' => 'Свищов, ул. Дунав 3',
) ) ), true );
check( 'M_INFO transliterates the name', 'Ivan Petrov' === $minfo['cardholderName'], var_export( $minfo, true ) );
check( 'M_INFO splits the phone', array( 'cc' => '359', 'subscriber' => '893361670' ) === $minfo['mobilePhone'] );
check( 'M_INFO address is ASCII', $minfo['billAddrLine1'] === preg_replace( '/[^\x20-\x7E]/', '', $minfo['billAddrLine1'] ) );
check( 'M_INFO does not force SCA by default', ! isset( $minfo['threeDSRequestorChallengeInd'] ) );

foreach ( array( '+359893361670', '00359893361670', '0893361670', '893361670' ) as $p ) {
	$m = json_decode( base64_decode( $P::m_info( array( 'phone' => $p ) ) ), true );
	check( "M_INFO normalises $p", '893361670' === $m['mobilePhone']['subscriber'] );
}
$forced = json_decode( base64_decode( $P::m_info( array( 'name' => 'A B', 'force_challenge' => true ) ) ), true );
check( 'M_INFO can demand SCA', '04' === $forced['threeDSRequestorChallengeInd'] );

/* --------------------------------------------------------- money verdict */
check( 'ACTION 0 + RC 00 is paid', 'paid' === $P::classify( array( 'ACTION' => '0', 'RC' => '00' ) )['state'] );
foreach ( array( array( '0', '05' ), array( '2', '00' ), array( '1', '00' ), array( '2', '05' ), array( '3', '96' ) ) as $pair ) {
	check( "ACTION {$pair[0]} RC {$pair[1]} is not paid",
		'paid' !== $P::classify( array( 'ACTION' => $pair[0], 'RC' => $pair[1] ) )['state'] );
}
foreach ( array( '-1', '-17', '-19', '-25', '-31', '-33', '-40' ) as $rc ) {
	$o = $P::classify( array( 'ACTION' => '3', 'RC' => $rc ) );
	check( "RC $rc is pending, not declined", 'pending' === $o['state'] && false === $o['final'] );
}
$d = $P::classify( array( 'ACTION' => '2', 'RC' => '05' ) );
check( 'positive RC is a final decline', 'declined' === $d['state'] && true === $d['final'] );
check( 'soft decline is pending', 'pending' === $P::classify( array( 'ACTION' => '21', 'RC' => '65' ) )['state'] );
$empty = $P::classify( array() );
check( 'empty response is pending, never paid', 'pending' === $empty['state'] );
check( 'CARDHOLDERINFO is surfaced',
	'Обадете се на банката' === $P::classify( array( 'ACTION' => '2', 'RC' => '05', 'CARDHOLDERINFO' => 'Обадете се на банката' ) )['cardholder_info'] );

foreach ( array( '00', '05', '-17', '-19', '65', '1A', 'zzz' ) as $rc ) {
	check( "rc_text($rc) is not empty", '' !== trim( $P::rc_text( $rc ) ) );
}
check( 'ECI 05 is authenticated', $P::eci_text( '05' )['authenticated'] );
check( 'ECI 02 is authenticated', $P::eci_text( '02' )['authenticated'] );
foreach ( array( '06', '07', '00', '01', '' ) as $weak ) {
	check( "ECI '$weak' is not authenticated", ! $P::eci_text( $weak )['authenticated'] );
}
check( 'PARES_Y is 3DS v1 authenticated',
	1 === $P::auth_step_text( 'PARES_Y' )['version'] && $P::auth_step_text( 'PARES_Y' )['authenticated'] );
check( 'ARES_Y is 3DS v2', 2 === $P::auth_step_text( 'ARES_Y' )['version'] );
check( 'RREQ_N is not authenticated', ! $P::auth_step_text( 'RREQ_N' )['authenticated'] );
check( 'unknown AUTH_STEP_RES is version 0', 0 === $P::auth_step_text( '' )['version'] );

check( 'GUARDTIME is 900s', 900 === $P::GUARDTIME_SECONDS );
check( 'final only after 960s', 960 === $P::FINAL_AFTER_SECONDS );
check( 'production gateway URL', 'https://3dsgate.borica.bg/cgi-bin/cgi_link' === $P::GATEWAY_PROD );

/* ------------------------------------------------------------- verdict */
echo "\n";
if ( $failed ) {
	echo "FAILED " . count( $failed ) . " of " . ( $passed + count( $failed ) ) . ":\n";
	foreach ( $failed as $f ) {
		echo "  - $f\n";
	}
	exit( 1 );
}
echo "OK  $passed assertions passed (incl. " . count( $vectors['responses'] )
	. " real BORICA signatures and " . count( $vectors['requests'] ) . " published request strings)\n";
exit( 0 );
