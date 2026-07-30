<?php
/**
 * EUR/BGN dual price display.
 *
 * Bulgaria adopted the euro on 2026-01-01. During the transition, prices must
 * be shown in BOTH currencies at the official fixed rate — this is a legal
 * requirement (Наредба), not a nicety, so it is implemented as a hard-coded
 * constant rather than a configurable option: the rate is fixed by law and an
 * editable field could only ever be wrong.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Currency {

	/** Official irrevocable BGN/EUR conversion rate. */
	public const RATE = 1.95583;

	/**
	 * Dual display is a TRANSITIONAL obligation, not a permanent one.
	 *
	 * Наредба Н-18 (amended ДВ 12.07.2025): fiscal receipts show both BGN and EUR
	 * plus the rate through 2026-08-08 inclusive, then euro only. The shop-window
	 * price rule sits under the euro-introduction law and may end on a different
	 * date - so this is a dated constant with a filter, NOT a permanent hard-code.
	 * Leaving it on forever would be its own compliance defect.
	 *
	 * TODO(owner + accountant): confirm the end date for DISPLAYED PRICES, which
	 * is not necessarily the receipt date below.
	 */
	public const DUAL_DISPLAY_UNTIL = '2026-08-08';

	public static function init(): void {
		add_filter( 'wc_price', array( __CLASS__, 'append_bgn' ), 10, 5 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
	}

	/**
	 * The block cart/checkout render prices client-side from Store API values and
	 * never pass through `wc_price`, so dual display was missing on exactly the two
	 * pages where it matters most. The server still owns the RATE and the on/off
	 * switch; the browser only formats.
	 */
	public static function assets(): void {
		if ( ! function_exists( 'is_cart' ) || ! ( is_cart() || is_checkout() ) ) {
			return;
		}
		$f = DARLING_CHECKOUT_PATH . 'assets/dual-currency.js';
		wp_enqueue_script(
			'darling-dual-currency',
			plugins_url( 'assets/dual-currency.js', DARLING_CHECKOUT_PATH . 'darling-checkout.php' ),
			array(),
			file_exists( $f ) ? (string) filemtime( $f ) : DARLING_CHECKOUT_VERSION,
			true
		);
		wp_localize_script( 'darling-dual-currency', 'DarlingDual', array(
			'rate'   => self::RATE,
			'active' => self::dual_display_active() && 'EUR' === get_woocommerce_currency(),
		) );
	}

	public static function dual_display_active(): bool {
		$until = (string) apply_filters( 'darling_dual_display_until', self::DUAL_DISPLAY_UNTIL );
		return current_time( 'Y-m-d' ) <= $until;
	}

	public static function to_bgn( float $eur ): float {
		// Round half-up to the stotinka, as the conversion regulation requires.
		return round( $eur * self::RATE, 2 );
	}

	/**
	 * @param string $html   Formatted price HTML.
	 * @param string $price  Raw formatted price.
	 * @param array  $args   Formatting args.
	 * @param float  $unformatted_price Numeric price.
	 */
	public static function append_bgn( $html, $price, $args, $unformatted_price = null, $original = null ) {
		if ( get_woocommerce_currency() !== 'EUR' ) {
			return $html; // only meaningful while the store prices in EUR
		}
		if ( ! self::dual_display_active() ) {
			return $html; // transition window has closed
		}
		if ( ! is_numeric( $unformatted_price ) ) {
			return $html;
		}
		// Don't double-append if this price has already been through the filter.
		if ( str_contains( (string) $html, 'darling-bgn' ) ) {
			return $html;
		}
		$bgn = number_format( self::to_bgn( (float) $unformatted_price ), 2, ',', ' ' );
		return $html . '<span class="darling-bgn"> / ' . $bgn . '&nbsp;лв.</span>';
	}
}
