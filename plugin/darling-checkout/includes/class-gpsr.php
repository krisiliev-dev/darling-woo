<?php
/**
 * GPSR (EU Reg. 2023/988) - manufacturer, EU responsible person, warnings.
 *
 * Дарлинг is a DISTRIBUTOR, not the importer: the supplier is the responsible
 * person. These fields are therefore populated from Barsy supplier data by the
 * connector, never typed by hand here.
 */

defined( 'ABSPATH' ) || exit;

class Darling_GPSR {

	private const META = array(
		'_darling_gpsr_manufacturer'       => 'Производител',
		'_darling_gpsr_responsible_person' => 'Отговорно лице в ЕС',
		'_darling_gpsr_warnings'           => 'Предупреждения за безопасност',
	);

	public static function init(): void {
		add_filter( 'woocommerce_product_tabs', array( __CLASS__, 'tab' ) );
	}

	public static function tab( $tabs ) {
		global $product;
		if ( ! $product instanceof WC_Product || ! self::has_data( $product ) ) {
			return $tabs;
		}
		$tabs['darling_gpsr'] = array(
			'title'    => 'Безопасност и производител',
			'priority' => 35,
			'callback' => array( __CLASS__, 'render' ),
		);
		return $tabs;
	}

	private static function has_data( WC_Product $product ): bool {
		foreach ( array_keys( self::META ) as $key ) {
			if ( $product->get_meta( $key ) ) {
				return true;
			}
		}
		return false;
	}

	public static function render(): void {
		global $product;
		if ( ! $product instanceof WC_Product ) {
			return;
		}
		echo '<div class="darling-gpsr">';
		foreach ( self::META as $key => $label ) {
			$val = $product->get_meta( $key );
			if ( ! $val ) {
				continue;
			}
			printf( '<p><strong>%s:</strong><br>%s</p>', esc_html( $label ), nl2br( esc_html( $val ) ) );
		}
		echo '</div>';
	}
}
