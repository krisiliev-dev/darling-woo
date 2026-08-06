<?php
/**
 * Base shipping method: prices from the panel's shipping-rates table.
 *
 * Loaded on woocommerce_shipping_init, which is why it is a separate file —
 * WC_Shipping_Method does not exist before then.
 *
 * Everything carrier-specific comes from Darling_Carriers; the subclasses at the
 * bottom exist only because WooCommerce shipping zones instantiate methods by
 * class name and cannot take a config array.
 *
 * v2 (2026-08-05): live per-destination quotes replaced by the panel's
 * pre-computed table (GET /api/public/shipping-rates — one call per
 * (weight, cod), cached 15 min, shared by every carrier instance in the same
 * calculation). Rate IDS and META are unchanged (`darling_<courier>:<mode>`,
 * darling_carrier / darling_mode) — the office picker and order booking key on
 * them. Panel serves labels (label_bg), prices with the buffer and the COD fee
 * already inside (Kris rule: no separate COD line), and free_over_eur=77.
 *
 * Ordering caveat, recorded: the panel pre-sorts cheapest-first, but with one
 * method instance per carrier the cross-carrier display order follows the
 * shipping-zone configuration, not the payload. Zone is configured
 * Speedy-before-Econt, which matches cheapest-first at every bracket today
 * (Speedy ≪ Econt from 3kg). If a new courier breaks that, either reorder the
 * zone or collapse to a single aggregate method — noted in the status doc.
 */

defined( 'ABSPATH' ) || exit;

abstract class Darling_Shipping_Base extends WC_Shipping_Method {

	protected string $carrier = '';
	protected string $carrier_label = '';

	public function __construct( $instance_id = 0 ) {
		$this->carrier_label      = Darling_Carriers::label( $this->carrier );
		$this->instance_id        = absint( $instance_id );
		$this->supports           = array( 'shipping-zones', 'instance-settings', 'settings' );
		$this->method_title       = $this->carrier_label;
		$this->method_description = 'Цени за доставка от ' . $this->carrier_label . ' по тарифната таблица на панела (тегло + наложен платеж).'
			. ' Куриер без данни в панела не се показва на клиентите.';
		$this->enabled            = 'yes';
		$this->title              = $this->carrier_label;
		$this->init_form_fields();
		$this->init_settings();
		add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields(): void {
		$office_label = Darling_Carriers::office_label( $this->carrier );

		$fields = array(
			'enabled' => array(
				'title'   => 'Активна',
				'type'    => 'checkbox',
				'label'   => 'Включи ' . $this->carrier_label,
				'default' => 'yes',
			),
			'office' => array(
				'title'   => ucfirst( $office_label ),
				'type'    => 'checkbox',
				'label'   => 'Предлагай доставка ' . $office_label,
				'default' => 'yes',
			),
		);

		// BOX NOW has no courier-to-door product at all; offering the switch would
		// invite someone to turn on a service that cannot be booked.
		if ( Darling_Carriers::supports_door( $this->carrier ) ) {
			$fields['door'] = array(
				'title'   => 'До адрес',
				'type'    => 'checkbox',
				'label'   => 'Предлагай доставка до адрес',
				'default' => 'yes',
			);
		}

		$fields['free_over'] = array(
			'title'       => 'Безплатна доставка над (EUR)',
			'type'        => 'text',
			'description' => 'Резервен праг. Панелът е меродавен (free_over_eur в тарифната таблица); това поле важи само ако панелът не подаде праг.',
			'default'     => '',
		);

		$this->instance_form_fields = $fields;
	}

	public function calculate_shipping( $package = array() ) {
		if ( 'yes' !== $this->get_option( 'enabled', 'yes' ) ) {
			return;
		}
		$city     = trim( (string) ( $package['destination']['city'] ?? '' ) );
		$postcode = (string) ( $package['destination']['postcode'] ?? '' );

		// No destination yet (empty cart page, before the address is filled in).
		// Offer NO rate: "we don't know where you live" must not price anything.
		if ( '' === $city ) {
			return;
		}

		$weight_g  = Darling_Shipping::cart_weight_g();
		$weight_kg = max( 0.001, $weight_g / 1000 );
		$cod       = Darling_Shipping::is_cod();
		$subtotal  = (float) WC()->cart->get_displayed_subtotal();

		$payload = Darling_Panel_API::shipping_rates( $weight_kg, $cod );

		Darling_Shipping::trace( sprintf(
			'calculate_shipping: carrier=%s weight_kg=%.3f cod=%s package_flag=%s payload=%s',
			$this->carrier,
			$weight_kg,
			$cod ? '1' : '0',
			(string) ( $package['darling_cod'] ?? '(missing)' ),
			null === $payload ? 'NULL' : ( count( (array) ( $payload['rates'] ?? array() ) ) . ' rates' . ( ! empty( $payload['darling_stale'] ) ? ' (STALE-LKG)' : '' ) )
		) );

		// Panel contract: unavailable table AND no last-known-good => offer no
		// rates (fail closed on money). An empty rates array from a HEALTHY panel
		// is authoritative "nothing to sell" (e.g. first hit after a deploy while
		// the refresh fills) — same outcome, hide.
		if ( null === $payload ) {
			wc_get_logger()->warning(
				sprintf( 'shipping-rates unavailable and no last-known-good (%s) - offering no rates', $this->carrier ),
				array( 'source' => 'darling-shipping' )
			);
			return;
		}

		$mine = array();
		foreach ( (array) ( $payload['rates'] ?? array() ) as $row ) {
			if ( ( $row['courier'] ?? '' ) === $this->carrier && isset( $row['mode'], $row['price_eur'] ) ) {
				$mine[ (string) $row['mode'] ] = $row;
			}
		}
		if ( empty( $mine ) ) {
			return; // panel serves no rates for this carrier -> stays invisible
		}

		// Free-shipping threshold: the panel value is canonical; the instance
		// option is only a fallback for a payload without the field.
		$free_over = isset( $payload['free_over_eur'] ) && is_numeric( $payload['free_over_eur'] )
			? (float) $payload['free_over_eur']
			: (float) ( is_numeric( trim( (string) $this->get_option( 'free_over', '' ) ) ) ? trim( (string) $this->get_option( 'free_over', '' ) ) : 0 );
		$is_free = $free_over > 0 && $subtotal >= $free_over;

		$stale = ! empty( $payload['darling_stale'] );

		// *** EVERY PICKUP MODE THE PANEL SERVES, NOT JUST 'office'. ***
		// This read `$mine['office']` alone, so BoxNow - whose rate row says
		// `locker` - was dropped here without a word. The file's own closing
		// comment promises a courier appears "the moment the panel starts serving
		// rates for it"; for a locker courier that was not true.
		// One settings switch still governs them all: "offer delivery to a courier
		// location" is one decision to the shop owner, whatever the courier calls it.
		$pickup_offered = 'yes' === $this->get_option( 'office', 'yes' );
		$offices        = null;
		foreach ( Darling_Carriers::pickup_modes() as $pickup_mode ) {
			if ( ! isset( $mine[ $pickup_mode ] ) || ! $pickup_offered ) {
				continue;
			}
			// Availability still depends on the destination: nowhere to collect in
			// the customer's settlement -> no pickup rate, whatever the table says.
			// Looked up once even when a courier serves several pickup modes.
			if ( null === $offices ) {
				$offices = Darling_Panel_API::offices( $this->carrier, $city );
			}
			if ( ! empty( $offices ) ) {
				$this->add_panel_rate( $mine[ $pickup_mode ], $pickup_mode, $is_free, $stale );
			}
		}
		if ( isset( $mine['door'] ) && Darling_Carriers::supports_door( $this->carrier )
			&& 'yes' === $this->get_option( 'door', 'yes' ) ) {
			$this->add_panel_rate( $mine['door'], 'door', $is_free, $stale );
		}
	}

	/** @param array{courier:string,mode:string,label_bg?:string,price_eur:float|int|string} $row */
	private function add_panel_rate( array $row, string $mode, bool $is_free, bool $stale ): void {
		$label = trim( (string) ( $row['label_bg'] ?? '' ) );
		if ( '' === $label ) {
			$label = Darling_Carriers::is_pickup( $mode )
				? $this->carrier_label . ' — ' . Darling_Carriers::office_label( $this->carrier )
				: $this->carrier_label . ' — до адрес';
		}

		$meta = array(
			'darling_carrier'      => $this->carrier,
			'darling_mode'         => $mode,
			'darling_price_source' => $stale ? 'panel_rates_stale' : 'panel_rates',
		);

		$this->add_rate( array(
			'id'        => $this->id . ':' . $mode,
			'label'     => $is_free ? $label . ' (безплатна)' : $label,
			'cost'      => $is_free ? 0 : round( (float) $row['price_eur'], 2 ),
			'meta_data' => $meta,
		) );
	}
}

/*
 * One thin subclass per registry entry. Adding a courier means adding a registry
 * entry plus four lines here — and nothing else: no pricing logic, no picker
 * change, no front-end change. It appears at checkout the moment the panel
 * starts serving rates for it.
 */

class Darling_Shipping_Econt extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id = 'darling_econt'; $this->carrier = 'econt';
		parent::__construct( $instance_id );
	}
}

class Darling_Shipping_Speedy extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id = 'darling_speedy'; $this->carrier = 'speedy';
		parent::__construct( $instance_id );
	}
}

class Darling_Shipping_Boxnow extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id = 'darling_boxnow'; $this->carrier = 'boxnow';
		parent::__construct( $instance_id );
	}
}

class Darling_Shipping_Sameday extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id = 'darling_sameday'; $this->carrier = 'sameday';
		parent::__construct( $instance_id );
	}
}

class Darling_Shipping_Pigeon extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id = 'darling_pigeon'; $this->carrier = 'pigeon';
		parent::__construct( $instance_id );
	}
}

class Darling_Shipping_Evropat extends Darling_Shipping_Base {
	public function __construct( $instance_id = 0 ) {
		$this->id = 'darling_evropat'; $this->carrier = 'evropat';
		parent::__construct( $instance_id );
	}
}
