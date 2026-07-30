<?php
/**
 * Live courier shipping rates — the thing Shopify would not let us do.
 *
 * On Shopify, carrier-calculated rates need the Carrier Service API, which Basic
 * cannot have at any price; the workaround was a flat rate plus a cart-page
 * estimate that express checkout bypassed. Here the real Econt/Speedy fee is a
 * native shipping rate, applied on every checkout route.
 *
 * One method per carrier, each offering up to two rates: to office, to address.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Shipping {

	/** Used when a product has no weight. Real weights arrive with the Barsy push. */
	public const FALLBACK_WEIGHT_G = 1000;

	/**
	 * Charged when the panel cannot be reached.
	 *
	 * Deliberately FAIL-OPEN. The alternative — offering no shipping method — makes
	 * checkout impossible and loses the order outright. Charging a fallback risks a
	 * little margin on a rare failure, which is the cheaper mistake. Every fallback
	 * is logged so it can never be silent.
	 */
	public const FALLBACK_RATE_EUR = 5.99;

	public static function init(): void {
		add_filter( 'woocommerce_shipping_methods', array( __CLASS__, 'register' ) );
		add_action( 'woocommerce_shipping_init', array( __CLASS__, 'load' ) );
		add_filter( 'woocommerce_cart_shipping_packages', array( __CLASS__, 'tag_package_with_cod' ) );
	}

	/**
	 * Put the COD flag INTO the shipping package, so it lands in the package hash.
	 *
	 * WooCommerce caches calculated rates against a hash of the package — cart
	 * contents and destination. The payment method is not in it. But our rates
	 * depend on it, because the courier charges a наложен платеж surcharge.
	 *
	 * Without this the price depends on the ORDER THE CUSTOMER DOES THINGS:
	 *   picks COD, then enters address  -> 4.88  (correct)
	 *   enters address, then picks COD  -> 4.48  (stale, 0.40 short)
	 * and the second is the normal path, because the address comes first. So the
	 * surcharge was effectively never charged — while the panel books the shipment
	 * WITH cash-on-delivery attached and we pay the courier for it. A silent loss on
	 * every COD order, and COD is most of them.
	 *
	 * Adding a key to the package changes the hash, which is exactly the point:
	 * switching payment method now invalidates the cached rates.
	 */
	public static function tag_package_with_cod( array $packages ): array {
		foreach ( $packages as $i => $package ) {
			$packages[ $i ]['darling_cod'] = self::is_cod() ? 'cod' : 'prepaid';
		}
		return $packages;
	}

	public static function load(): void {
		require_once __DIR__ . '/class-shipping-method.php';
	}

	/**
	 * Register every carrier in the registry, including ones the panel cannot serve
	 * yet. They are registered but produce no rates (see calculate_shipping), so a
	 * courier can be added to the shipping zone in advance and simply starts working
	 * the moment its credentials land on the panel — no deploy, no code change.
	 */
	public static function register( array $methods ): array {
		foreach ( array_keys( Darling_Carriers::all() ) as $id ) {
			$class = 'Darling_Shipping_' . ucfirst( $id );
			if ( class_exists( $class ) ) {
				$methods[ 'darling_' . $id ] = $class;
			}
		}
		return $methods;
	}

	/** Cart weight in grams, with a logged fallback when weights are missing. */
	public static function cart_weight_g(): int {
		$kg = (float) WC()->cart->get_cart_contents_weight();
		if ( $kg > 0 ) {
			return (int) round( $kg * 1000 );
		}
		$items = max( 1, WC()->cart->get_cart_contents_count() );
		$g     = $items * self::FALLBACK_WEIGHT_G;
		wc_get_logger()->info(
			"cart has no product weights - using fallback {$g}g for {$items} item(s)",
			array( 'source' => 'darling-shipping' )
		);
		return $g;
	}

	/** Is the order going to be paid cash-on-delivery? Affects the courier fee. */
	public static function is_cod(): bool {
		$chosen = WC()->session ? WC()->session->get( 'chosen_payment_method' ) : '';
		return 'cod' === $chosen;
	}
}
