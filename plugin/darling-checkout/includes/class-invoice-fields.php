<?php
/**
 * B2B фактура fields, IN the checkout.
 *
 * This is the reason for the whole migration: on Shopify these fields could
 * only live on the cart page (checkout extensions are Plus-gated at €2,100/mo),
 * which left them bypassable by express checkout. Here they are native.
 *
 * Registered through WooCommerce's Additional Checkout Fields API, which is
 * block-native and needs no React build step.
 *
 * FROZEN CONTRACT: the connector reads exactly these seven order meta keys.
 * The API stores its own values under _wc_other/..., so we MIRROR onto our own
 * keys. A rename here silently breaks invoicing in Barsy - the request simply
 * looks like "no invoice wanted", with no error raised anywhere.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Invoice_Fields {

	private const FIELDS = array(
		'darling/invoice-wanted'  => array( 'label' => 'Искам фактура за фирма', 'type' => 'checkbox', 'meta' => 'darling_invoice' ),
		'darling/invoice-company' => array( 'label' => 'Фирма',                  'type' => 'text',     'meta' => 'darling_invoice_company' ),
		'darling/invoice-eik'     => array( 'label' => 'ЕИК / Булстат',          'type' => 'text',     'meta' => 'darling_invoice_eik' ),
		'darling/invoice-vat'     => array( 'label' => 'ДДС № (по избор)',       'type' => 'text',     'meta' => 'darling_invoice_vat' ),
		'darling/invoice-mol'     => array( 'label' => 'МОЛ (управител)',        'type' => 'text',     'meta' => 'darling_invoice_mol' ),
		'darling/invoice-city'    => array( 'label' => 'Град (по регистрация)',  'type' => 'text',     'meta' => 'darling_invoice_city' ),
		'darling/invoice-address' => array( 'label' => 'Адрес на фирмата',       'type' => 'text',     'meta' => 'darling_invoice_address' ),
	);

	public static function init(): void {
		add_action( 'woocommerce_init', array( __CLASS__, 'register' ) );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( __CLASS__, 'mirror_block' ), 20, 2 );
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'mirror_classic' ), 20, 2 );
		add_filter( 'woocommerce_validate_additional_field', array( __CLASS__, 'validate' ), 10, 3 );
		add_action( 'woocommerce_admin_order_data_after_billing_address', array( __CLASS__, 'admin_panel' ) );
	}

	public static function register(): void {
		if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
			return; // older WooCommerce: mirror hooks simply never fire
		}
		foreach ( self::FIELDS as $id => $f ) {
			woocommerce_register_additional_checkout_field(
				array(
					'id'         => $id,
					'label'      => $f['label'],
					'location'   => 'order',
					'type'       => $f['type'],
					'required'   => false, // conditional requirement lives in validate()
					'attributes' => array( 'autocomplete' => 'off' ),
				)
			);
		}
	}

	/**
	 * ЕИК must be 9 or 13 digits.
	 *
	 * Barsy refuses to issue a фактура without a valid receiver, so an order
	 * accepted with a malformed ЕИК becomes an invoice request that can never
	 * be fulfilled - and a staff chase after the fact.
	 */
	public static function validate( $errors, $field_key, $field_value ) {
		if ( ! $errors instanceof WP_Error ) {
			return $errors;
		}
		if ( 'darling/invoice-eik' === $field_key && $field_value ) {
			$digits = preg_replace( '/\D/', '', (string) $field_value );
			if ( ! in_array( strlen( (string) $digits ), array( 9, 13 ), true ) ) {
				$errors->add( 'darling_eik', 'ЕИК / Булстат трябва да е 9 или 13 цифри.' );
			}
		}
		return $errors;
	}

	/** Block checkout (Store API). */
	public static function mirror_block( $order, $request ): void {
		self::copy( $order );
	}

	/** Classic checkout - safety net if the store ever falls back to it. */
	public static function mirror_classic( $order, $data ): void {
		self::copy( $order );
	}

	private static function copy( $order ): void {
		if ( ! $order instanceof WC_Order || ! function_exists( 'woocommerce_get_order_additional_field_value' ) ) {
			return;
		}
		$raw    = woocommerce_get_order_additional_field_value( $order, 'darling/invoice-wanted' );
		$wanted = in_array( $raw, array( true, 1, '1', 'true', 'yes' ), true );

		foreach ( self::FIELDS as $id => $f ) {
			if ( 'darling_invoice' === $f['meta'] ) {
				$order->update_meta_data( $f['meta'], $wanted ? 'true' : 'false' );
				continue;
			}
			$val = $wanted ? (string) woocommerce_get_order_additional_field_value( $order, $id ) : '';
			$order->update_meta_data( $f['meta'], trim( $val ) );
		}
	}

	/** Surface the invoice request to staff in wp-admin. */
	public static function admin_panel( $order ): void {
		if ( ! $order instanceof WC_Order || 'true' !== $order->get_meta( 'darling_invoice' ) ) {
			return;
		}
		$labels = array(
			'darling_invoice_company' => 'Фирма',
			'darling_invoice_eik'     => 'ЕИК',
			'darling_invoice_vat'     => 'ДДС №',
			'darling_invoice_mol'     => 'МОЛ',
			'darling_invoice_city'    => 'Град',
			'darling_invoice_address' => 'Адрес',
		);
		echo '<div class="address"><p><strong>Фактура за фирма</strong></p><p>';
		foreach ( $labels as $key => $label ) {
			$val = $order->get_meta( $key );
			if ( $val ) {
				printf( '%s: %s<br>', esc_html( $label ), esc_html( $val ) );
			}
		}
		echo '</p></div>';
	}
}
