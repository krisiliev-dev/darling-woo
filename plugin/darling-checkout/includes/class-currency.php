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

	public static function init(): void {
		add_filter( 'wc_price', array( __CLASS__, 'append_bgn' ), 10, 5 );
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
