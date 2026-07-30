<?php
/**
 * Base shipping method: asks the panel for the real courier fee.
 *
 * Loaded on woocommerce_shipping_init, which is why it is a separate file —
 * WC_Shipping_Method does not exist before then.
 */

defined( 'ABSPATH' ) || exit;

abstract class Darling_Shipping_Base extends WC_Shipping_Method {

	protected string $carrier = '';
	protected string $carrier_label = '';

	public function __construct( $instance_id = 0 ) {
		$this->instance_id        = absint( $instance_id );
		$this->supports           = array( 'shipping-zones', 'instance-settings', 'settings' );
		$this->method_title       = $this->carrier_label;
		$this->method_description = 'Живи цени за доставка от ' . $this->carrier_label . ', изчислени по тегло и получател.';
		$this->enabled            = 'yes';
		$this->title              = $this->carrier_label;
		$this->init_form_fields();
		$this->init_settings();
		add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields(): void {
		$this->instance_form_fields = array(
			'enabled' => array(
				'title'   => 'Активна',
				'type'    => 'checkbox',
				'label'   => 'Включи ' . $this->carrier_label,
				'default' => 'yes',
			),
			'office' => array(
				'title'   => 'До офис',
				'type'    => 'checkbox',
				'label'   => 'Предлагай доставка до офис',
				'default' => 'yes',
			),
			'door' => array(
				'title'   => 'До адрес',
				'type'    => 'checkbox',
				'label'   => 'Предлагай доставка до адрес',
				'default' => 'yes',
			),
			'free_over' => array(
				'title'       => 'Безплатна доставка над (EUR)',
				'type'        => 'text',
				'description' => 'Остави празно, за да няма безплатна доставка.',
				'default'     => '',
			),
		);
	}

	public function calculate_shipping( $package = array() ) {
		if ( 'yes' !== $this->get_option( 'enabled', 'yes' ) ) {
			return;
		}
		$city     = trim( (string) ( $package['destination']['city'] ?? '' ) );
		$postcode = (string) ( $package['destination']['postcode'] ?? '' );

		// No destination yet (empty cart page, before the address is filled in).
		// Offer NO rate rather than the fallback: "we don't know where you live" is
		// not "the courier API is down", and conflating them would both show an
		// invented price as if it were real AND fill the log with false warnings —
		// which is how genuine panel outages end up ignored.
		if ( '' === $city ) {
			return;
		}
		$weight_g = Darling_Shipping::cart_weight_g();
		$cod      = Darling_Shipping::is_cod();
		$subtotal = (float) WC()->cart->get_displayed_subtotal();

		$free_over = trim( (string) $this->get_option( 'free_over', '' ) );
		$is_free   = ( '' !== $free_over && is_numeric( $free_over ) && $subtotal >= (float) $free_over );

		if ( 'yes' === $this->get_option( 'office', 'yes' ) ) {
			$this->add_rate_for( 'office', $city, $postcode, $weight_g, $cod, $subtotal, $is_free );
		}
		if ( 'yes' === $this->get_option( 'door', 'yes' ) ) {
			$this->add_rate_for( 'door', $city, $postcode, $weight_g, $cod, $subtotal, $is_free );
		}
	}

	private function add_rate_for( string $mode, string $city, string $postcode, int $weight_g, bool $cod, float $subtotal, bool $is_free ): void {
		$label = 'office' === $mode
			? $this->carrier_label . ' — до офис'
			: $this->carrier_label . ' — до адрес';

		if ( $is_free ) {
			$this->add_rate( array(
				'id'    => $this->id . ':' . $mode,
				'label' => $label . ' (безплатна)',
				'cost'  => 0,
				'meta_data' => array( 'darling_carrier' => $this->carrier, 'darling_mode' => $mode ),
			) );
			return;
		}

		$dest = array();
		if ( 'office' === $mode ) {
			// The quote endpoint prices an office by id. At rate-calculation time the
			// customer has not picked one yet, so we price the first office in their
			// city — office pricing within a settlement is uniform in both networks.
			// If that assumption ever breaks, the fee changes after selection, which
			// would be visible and wrong; revisit rather than paper over.
			$offices = Darling_Panel_API::offices( $this->carrier, $city );
			if ( empty( $offices ) ) {
				return; // no office in this settlement -> do not offer office delivery
			}
			$dest['office_id'] = (string) ( $offices[0]['id'] ?? '' );
		} else {
			$dest['city'] = $city;
			if ( $postcode ) {
				$dest['postcode'] = $postcode;
			}
		}

		$quote = Darling_Panel_API::quote( $this->carrier, $mode, $dest, $weight_g, $cod, $subtotal );

		if ( null === $quote ) {
			// FAIL-OPEN, loudly. See Darling_Shipping::FALLBACK_RATE_EUR for why.
			wc_get_logger()->warning(
				sprintf( 'panel quote unavailable (%s/%s, city=%s) - charging fallback %.2f',
					$this->carrier, $mode, $city, Darling_Shipping::FALLBACK_RATE_EUR ),
				array( 'source' => 'darling-shipping' )
			);
			$this->add_rate( array(
				'id'        => $this->id . ':' . $mode,
				'label'     => $label,
				'cost'      => Darling_Shipping::FALLBACK_RATE_EUR,
				'meta_data' => array(
					'darling_carrier'  => $this->carrier,
					'darling_mode'     => $mode,
					'darling_fallback' => 'yes',
				),
			) );
			return;
		}

		$this->add_rate( array(
			'id'        => $this->id . ':' . $mode,
			'label'     => $label,
			'cost'      => $quote['total'],
			'meta_data' => array(
				'darling_carrier'      => $this->carrier,
				'darling_mode'         => $mode,
				'darling_fee_shipping' => $quote['shipping'],
				'darling_fee_cod'      => $quote['cod'],
			),
		) );
	}
}

class Darling_Shipping_Econt extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id            = 'darling_econt';
		$this->carrier       = 'econt';
		$this->carrier_label = 'Еконт';
		parent::__construct( $instance_id );
	}
}

class Darling_Shipping_Speedy extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id            = 'darling_speedy';
		$this->carrier       = 'speedy';
		$this->carrier_label = 'Спиди';
		parent::__construct( $instance_id );
	}
}
