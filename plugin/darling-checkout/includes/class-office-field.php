<?php
/**
 * Courier office selection, IN the checkout.
 *
 * On Shopify this had to live on the cart page, which express checkout bypassed.
 * Here it is a native checkout field.
 *
 * FROZEN CONTRACT — the connector reads these order meta keys, carried over from
 * the Shopify build so Hermes's mapping does not change:
 *   darling_dest · darling_carrier · darling_city · darling_office_id
 *   darling_office_name · darling_validated
 * Most are derived SERVER-SIDE from the chosen shipping rate rather than trusted
 * from the browser — a client-supplied carrier could disagree with what was
 * actually paid for.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Office_Field {

	private const FIELD = 'darling/office-id';

	public static function init(): void {
		add_action( 'woocommerce_init', array( __CLASS__, 'register' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'rest_routes' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( __CLASS__, 'mirror' ), 20, 2 );
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'mirror_classic' ), 20, 2 );
		add_action( 'woocommerce_admin_order_data_after_shipping_address', array( __CLASS__, 'admin_panel' ) );
	}

	public static function register(): void {
		if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
			return;
		}
		woocommerce_register_additional_checkout_field( array(
			'id'         => self::FIELD,
			'label'      => 'Офис на куриера',
			'location'   => 'order',
			'type'       => 'text',
			'required'   => false, // conditional: only when an office rate is chosen
			'attributes' => array( 'autocomplete' => 'off', 'data-darling-office' => '1' ),
		) );
	}

	/**
	 * Browser-facing proxy. Exists so the panel token stays server-side —
	 * the shop must never ship a courier credential to a customer's browser.
	 */
	public static function rest_routes(): void {
		register_rest_route( 'darling/v1', '/offices', array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true', // office lists are public information
			'args'                => array(
				'carrier' => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
				'city'    => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
			),
			'callback'            => function ( WP_REST_Request $r ) {
				$offices = Darling_Panel_API::offices( (string) $r['carrier'], (string) $r['city'] );
				return rest_ensure_response( array(
					'count'   => count( $offices ),
					'offices' => array_map(
						fn( $o ) => array(
							'id'      => (string) ( $o['id'] ?? '' ),
							'name'    => (string) ( $o['name'] ?? '' ),
							'address' => trim( (string) ( $o['address'] ?? '' ) ),
						),
						$offices
					),
				) );
			},
		) );
	}

	public static function assets(): void {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}
		$f = DARLING_CHECKOUT_PATH . 'assets/office-picker.js';
		// Resolve against the PLUGIN ROOT. `dirname(__FILE__)` from inside includes/
		// resolved to includes/assets/... and 404'd - and the script tag still
		// rendered, so a test that only checked for the tag reported success.
		wp_enqueue_script(
			'darling-office-picker',
			plugins_url( 'assets/office-picker.js', DARLING_CHECKOUT_PATH . 'darling-checkout.php' ),
			array(),
			file_exists( $f ) ? (string) filemtime( $f ) : DARLING_CHECKOUT_VERSION,
			true
		);
		$labels = array();
		foreach ( Darling_Carriers::all() as $id => $cfg ) {
			$labels[ $id ] = $cfg['office_label'];
		}

		wp_localize_script( 'darling-office-picker', 'DarlingOffice', array(
			'endpoint' => esc_url_raw( rest_url( 'darling/v1/offices' ) ),
			// The carrier list is handed to the browser rather than hard-coded in the
			// JS, so adding a courier cannot leave the picker silently not recognising
			// its shipping rate - which would look exactly like "the picker is broken".
			'carriers' => array_keys( Darling_Carriers::all() ),
			'labels'   => $labels,
			'i18n'     => array(
				'choose'  => '— избери офис —',
				'loading' => 'зареждане…',
				'none'    => 'няма офиси в това населено място',
				'error'   => 'грешка при зареждане',
			),
		) );
	}

	/** Block checkout. */
	public static function mirror( $order, $request ): void {
		self::copy( $order );
	}

	/** Classic checkout fallback. */
	public static function mirror_classic( $order, $data ): void {
		self::copy( $order );
	}

	private static function copy( $order ): void {
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		// Derive carrier/mode from what was actually PAID FOR, not from the browser.
		$carrier = '';
		$mode    = '';
		foreach ( $order->get_items( 'shipping' ) as $item ) {
			$carrier = (string) $item->get_meta( 'darling_carrier' );
			$mode    = (string) $item->get_meta( 'darling_mode' );
			if ( $carrier ) {
				break;
			}
		}

		$city      = (string) $order->get_shipping_city();
		$office_id = '';
		if ( function_exists( 'woocommerce_get_order_additional_field_value' ) ) {
			$office_id = trim( (string) woocommerce_get_order_additional_field_value( $order, self::FIELD ) );
		}

		// Validate the office against the city server-side. A stale or hand-typed id
		// that does not exist in the destination settlement must not be recorded as
		// validated - the connector uses this to build the waybill.
		$name      = '';
		$validated = false;
		if ( 'office' === $mode && $office_id && $city ) {
			foreach ( Darling_Panel_API::offices( $carrier, $city ) as $o ) {
				if ( (string) ( $o['id'] ?? '' ) === $office_id ) {
					$name      = (string) ( $o['name'] ?? '' );
					$validated = true;
					break;
				}
			}
			if ( ! $validated ) {
				wc_get_logger()->warning(
					sprintf( 'order %d: office %s not found in %s (%s) - recorded unvalidated',
						$order->get_id(), $office_id, $city, $carrier ),
					array( 'source' => 'darling-office' )
				);
			}
		}

		$order->update_meta_data( 'darling_dest',        'office' === $mode ? 'office' : ( $mode ? 'door' : '' ) );
		$order->update_meta_data( 'darling_carrier',     $carrier );
		$order->update_meta_data( 'darling_city',        $city );
		$order->update_meta_data( 'darling_office_id',   'office' === $mode ? $office_id : '' );
		$order->update_meta_data( 'darling_office_name', $name );
		$order->update_meta_data( 'darling_validated',   $validated ? 'true' : '' );
	}

	public static function admin_panel( $order ): void {
		if ( ! $order instanceof WC_Order || ! $order->get_meta( 'darling_dest' ) ) {
			return;
		}
		$carrier = (string) $order->get_meta( 'darling_carrier' );
		$rows = array(
			'Куриер'  => Darling_Carriers::label( $carrier ),
			'Доставка' => 'office' === $order->get_meta( 'darling_dest' )
				? Darling_Carriers::office_label( $carrier )
				: 'до адрес',
			'Офис'    => trim( $order->get_meta( 'darling_office_name' ) . ' (' . $order->get_meta( 'darling_office_id' ) . ')', ' ()' ),
		);
		echo '<div class="address"><p><strong>Куриер</strong></p><p>';
		foreach ( $rows as $k => $v ) {
			if ( $v ) {
				printf( '%s: %s<br>', esc_html( $k ), esc_html( $v ) );
			}
		}
		if ( 'true' !== $order->get_meta( 'darling_validated' ) && 'office' === $order->get_meta( 'darling_dest' ) ) {
			echo '<span style="color:#b01f30"><strong>⚠ офисът не е потвърден</strong></span>';
		}
		echo '</p></div>';
	}
}
