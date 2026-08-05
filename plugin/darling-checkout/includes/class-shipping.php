<?php
/**
 * Courier shipping via the panel's pre-computed rates table — flat national
 * tariffs per (weight bracket, cod), served by /api/public/shipping-rates.
 *
 * History: v1 asked the panel for a live per-destination quote on every
 * calculation. The delivery-fee decision (Kris, 2026-08-05) replaced live
 * quotes with courier-specific rates = exact tariff + small buffer, refreshed
 * panel-side and served as one table. Tariffs are distance-flat nationally, so
 * destination no longer affects the PRICE — only availability (a city with no
 * office gets no office rate).
 *
 * Money posture (panel contract, 2026-08-05): an empty or unavailable rates
 * table means HIDE the affected options — never invent a price. The old
 * FALLBACK_RATE_EUR (€5.99 fail-open) is retired: PLAN.md's own audit called
 * out that an invented price is internally consistent but externally false.
 * The outage buffer is now LAST-KNOWN-GOOD real prices (see
 * Darling_Panel_API::shipping_rates), which are stale-but-true, logged loudly
 * when served.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Shipping {

	/** Used when a product has no weight. Real weights arrive with the Barsy push. */
	public const FALLBACK_WEIGHT_G = 1000;

	/**
	 * RETIRED as a charged rate (kept only so old references fail loudly in
	 * review rather than silently). Nothing may charge this. See file header.
	 */
	public const FALLBACK_RATE_EUR = 5.99;

	/**
	 * Payment method carried by the CURRENT Store API request, if any.
	 * Null means "no such request in flight", which is different from "not COD".
	 */
	private static ?string $request_payment_method = null;

	public static function init(): void {
		add_filter( 'rest_request_before_callbacks', array( __CLASS__, 'capture_payment_method' ), 10, 3 );
		add_filter( 'woocommerce_shipping_methods', array( __CLASS__, 'register' ) );
		add_action( 'woocommerce_shipping_init', array( __CLASS__, 'load' ) );
		add_filter( 'woocommerce_cart_shipping_packages', array( __CLASS__, 'tag_package_with_cod' ) );
		add_action( 'woocommerce_cart_loaded_from_session', array( __CLASS__, 'sync_captured_pm_to_session' ) );
	}

	/**
	 * End-to-end trace for the payment-method → shipping-price path.
	 *
	 * PLAN.md rule: no further re-pricing fixes without instrumenting the
	 * calc-totals request end to end. This is that instrumentation, and it is
	 * PERMANENT — the bug class here (three views of "which payment method")
	 * has burned three attempts, and the trace is what makes the fourth
	 * attempt verifiable. Source: darling-repricing-trace.
	 */
	public static function trace( string $msg ): void {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->debug( $msg, array( 'source' => 'darling-repricing-trace' ) );
		}
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
	/**
	 * Persist the captured payment method once the session actually EXISTS.
	 *
	 * Trace evidence (2026-08-05): at rest_request_before_callbacks time
	 * WC()->session is NULL on Store API POSTs, so writing it there never fired
	 * ("no-session" in the trace). Blocks persisted cod to the session by its own
	 * path but NOT the switch back to stripe â€” which is exactly the asymmetry the
	 * customer sees. This hook runs after the cart+session are loaded in the SAME
	 * request, so the write is guaranteed a session to write to.
	 */
	public static function sync_captured_pm_to_session(): void {
		if ( null !== self::$request_payment_method && WC()->session ) {
			$cur = (string) WC()->session->get( 'chosen_payment_method' );
			if ( $cur !== self::$request_payment_method ) {
				WC()->session->set( 'chosen_payment_method', self::$request_payment_method );
				self::trace( 'sync_captured_pm_to_session: ' . $cur . ' -> ' . self::$request_payment_method );
			}
		}
	}

	public static function tag_package_with_cod( array $packages ): array {

		$flag = self::is_cod() ? 'cod' : 'prepaid';
		foreach ( $packages as $i => $package ) {
			$packages[ $i ]['darling_cod'] = $flag;
		}
		self::trace( sprintf(
			'tag_package_with_cod: flag=%s packages=%d request_pm=%s session_pm=%s uri=%s',
			$flag,
			count( $packages ),
			self::$request_payment_method ?? '(null)',
			WC()->session ? (string) WC()->session->get( 'chosen_payment_method' ) : '(no session)',
			(string) ( $_SERVER['REQUEST_URI'] ?? '?' )
		) );
		return $packages;
	}

	public static function load(): void {
		require_once __DIR__ . '/class-shipping-method.php';
	}

	/**
	 * Register every carrier in the registry, including ones the panel cannot serve
	 * yet. They are registered but produce no rates (see calculate_shipping), so a
	 * courier can be added to the shipping zone in advance and simply starts working
	 * the moment the panel starts serving rates for it — no deploy, no code change.
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

	/**
	 * Capture the payment method out of the Store API request body — and now also
	 * WRITE IT TO THE SESSION immediately.
	 *
	 * When a customer switches payment method, the block checkout sends
	 *   POST /wc/store/v1/checkout?__experimental_calc_totals=true
	 *   {"payment_method":"stripe"}
	 * and expects the totals back with shipping re-priced. That request does NOT
	 * write chosen_payment_method to the session before shipping is recalculated.
	 * v1 captured the value into a static for is_cod() to read — correct, but the
	 * DISPLAYED price still did not move (three documented attempts; see PLAN.md).
	 *
	 * 4th attempt, WITH the trace armed: the static only helps code that asks
	 * is_cod() during THIS request; anything WooCommerce reads from the session
	 * (or computes before our filter's package pass) still sees the previous
	 * method. So the session is now updated the moment the choice arrives — it is
	 * the customer's explicit choice, there is nothing more authoritative — and
	 * the trace records both values on every package pass so the log shows
	 * exactly which view each recalculation used. Verified by
	 * tests/cod-repricing.spec.js reading the rendered totals, not by reasoning.
	 */
	public static function capture_payment_method( $response, $handler, $request ) {
		if ( $request instanceof WP_REST_Request
			&& false !== strpos( (string) $request->get_route(), '/wc/store/' ) ) {
			$pm = $request->get_param( 'payment_method' );
			if ( is_string( $pm ) && '' !== $pm ) {
				self::$request_payment_method = $pm;
				$wrote = 'no-session';
				if ( WC()->session ) {
					WC()->session->set( 'chosen_payment_method', $pm );
					$wrote = 'session-updated';
				}
				self::trace( sprintf(
					'capture_payment_method: route=%s pm=%s %s',
					(string) $request->get_route(), $pm, $wrote
				) );
			}
		}
		return $response;
	}

	/**
	 * Is the order going to be paid cash-on-delivery? Affects the courier fee.
	 *
	 * Order of truth: the in-flight request (the choice arriving), then the
	 * session. The reverted pre-selected-gateway fallback stays reverted — see
	 * git history: it made the fee permanently COD because recalc requests do
	 * not always carry the method.
	 *
	 * KNOWN GAP, measured 2026-07-31: on a FRESH session the checkout pre-selects
	 * Наложен платеж while the session is still empty, so the first render shows
	 * the prepaid price until the customer touches the payment step. The ORDER is
	 * priced correctly either way — submission recalculates with the flag in the
	 * package hash — so it is a display gap, not an undercharge.
	 */
	public static function is_cod(): bool {
		if ( null !== self::$request_payment_method ) {
			return 'cod' === self::$request_payment_method;
		}
		$chosen = WC()->session ? WC()->session->get( 'chosen_payment_method' ) : '';
		return 'cod' === $chosen;
	}
}
