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
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ BEFORE GO-LIVE, CONFIRM AGAINST BORICA'S OWN DOC PACK (arrives with the
 *   contract): the MAC field ORDER below. APGW has had several MAC variants
 *   (MAC_GENERAL / MAC_EXTENDED / MAC_ADVANCED) and a wrong order produces a
 *   signature that is well-formed but rejected — which looks like a key problem
 *   and is not. Both lists are isolated as constants for exactly that reason.
 *   Verify with the test terminal before trusting them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

defined( 'ABSPATH' ) || exit;

class Darling_Borica {

	public static function init(): void {
		add_filter( 'woocommerce_payment_gateways', array( __CLASS__, 'register' ) );
		add_action( 'woocommerce_api_darling_borica', array( __CLASS__, 'callback' ) );
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
}
