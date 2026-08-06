<?php
/**
 * BORICA APGW (e-Commerce gateway) payment method.
 *
 * Built in-house because there is no maintained official WooCommerce plugin for
 * APGW — the third-party ones are unmaintained and several sign with MD5 or skip
 * response verification entirely, which is exactly the part that must not be got
 * wrong.
 *
 * CREDENTIALS ARE NOT IN THE DATABASE. The signing key is a file on the server,
 * referenced by path from the environment, and the gateway simply does not appear
 * at checkout until it is present and loadable. A half-configured card gateway
 * that shows up and then fails mid-payment is worse than one that is absent.
 *
 * The MAC field-order warning that used to live here is SETTLED as of 2026-08-06,
 * from a front-to-back read of P-OM-41 v7.0. The scheme is MAC_GENERAL; the exact
 * field lists, and the trailing-RFU trap that would have made every response fail
 * verification, are documented in class-borica-protocol.php and proved by
 * tests/borica-protocol-gate.php against BORICA's own published signatures.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Borica {

	public static function init(): void {
		add_filter( 'woocommerce_payment_gateways', array( __CLASS__, 'register' ) );
		add_action( 'woocommerce_api_darling_borica', array( __CLASS__, 'callback' ) );
		// A transaction that came back non-final is re-checked with TRTYPE=90 once
		// GUARDTIME has passed. Registered unconditionally: the event is scheduled
		// from the callback, and a scheduled event with no listener is an order
		// left on hold forever.
		add_action( 'darling_borica_recheck', array( __CLASS__, 'recheck' ), 10, 1 );
	}

	/**
	 * The gateway class is defined HERE, not at plugins_loaded.
	 *
	 * `WC_Payment_Gateway` is the parent class, and extending a class that does not
	 * exist yet is a fatal error, not a warning — it would white-screen the whole
	 * shop. This filter runs when WooCommerce initialises its gateways, which is
	 * the first moment the parent is guaranteed to exist.
	 */
	public static function register( array $gws ): array {
		require_once __DIR__ . '/class-borica-gateway.php';
		$gws[] = 'Darling_Borica_Gateway';
		return $gws;
	}

	public static function callback(): void {
		require_once __DIR__ . '/class-borica-gateway.php';
		Darling_Borica_Gateway::handle_callback();
	}

	public static function recheck( $order_id ): void {
		require_once __DIR__ . '/class-borica-gateway.php';
		Darling_Borica_Gateway::recheck( $order_id );
	}
}
