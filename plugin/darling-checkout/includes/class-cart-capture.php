<?php
/**
 * Cart capture for the panel's Кошници view.
 *
 * WooCommerce has no native abandoned-cart event, which is why the third-party
 * plugin route existed. We emit our own — and since we are the CONTROLLER of this
 * data (on Shopify we were merely a recipient, and its GDPR erasure topics were
 * handled for us), the privacy rules are structural, not optional:
 *
 *   1. keyed on a PSEUDONYMOUS cart id, never on email or phone;
 *   2. NO contact details stored until an order actually exists;
 *   3. hard 30-day retention, enforced by a purge job rather than by intention;
 *   4. an erasure path for the pseudonymous record.
 *
 * The difference between an abandoned-cart feature and an unmanaged database of
 * people who merely browsed is exactly these four rules.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Cart_Capture {

	private const TABLE     = 'darling_carts';
	private const RETENTION = 30; // days — see rule 3
	private const CRON      = 'darling_purge_carts';

	public static function init(): void {
		add_action( 'woocommerce_cart_updated', array( __CLASS__, 'capture' ) );
		add_action( 'woocommerce_checkout_order_processed', array( __CLASS__, 'mark_converted' ), 10, 3 );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'mark_converted_api' ) );

		add_action( self::CRON, array( __CLASS__, 'purge' ) );
		if ( ! wp_next_scheduled( self::CRON ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON );
		}

		// GDPR: the pseudonymous record must be erasable and exportable.
		add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'register_eraser' ) );
	}

	public static function install(): void {
		global $wpdb;
		$t = $wpdb->prefix . self::TABLE;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta(
			"CREATE TABLE $t (
				cart_key VARCHAR(64) NOT NULL,
				updated_at DATETIME NOT NULL,
				item_count INT NOT NULL DEFAULT 0,
				total DECIMAL(12,2) NOT NULL DEFAULT 0,
				currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
				items LONGTEXT NULL,
				converted_order_id BIGINT NULL,
				PRIMARY KEY (cart_key),
				KEY updated_at (updated_at)
			) {$wpdb->get_charset_collate()}"
		);
	}

	/**
	 * Pseudonymous, per-session cart id. Deliberately NOT derived from anything
	 * identifying, so the key cannot be reversed to a person.
	 */
	private static function cart_key(): string {
		if ( ! WC()->session ) {
			return '';
		}
		$k = WC()->session->get( 'darling_cart_key' );
		if ( ! $k ) {
			$k = wp_generate_uuid4();
			WC()->session->set( 'darling_cart_key', $k );
		}
		return (string) $k;
	}

	public static function capture(): void {
		if ( is_admin() || ! WC()->cart || WC()->cart->is_empty() ) {
			return;
		}
		$key = self::cart_key();
		if ( ! $key ) {
			return;
		}

		// Product-level only. No names, no emails, no phones - rule 2.
		$items = array();
		foreach ( WC()->cart->get_cart() as $line ) {
			$p = $line['data'] ?? null;
			if ( ! $p ) {
				continue;
			}
			$items[] = array(
				'sku'  => $p->get_sku(),
				'name' => $p->get_name(),
				'qty'  => (int) ( $line['quantity'] ?? 0 ),
			);
		}

		global $wpdb;
		$wpdb->replace(
			$wpdb->prefix . self::TABLE,
			array(
				'cart_key'   => $key,
				'updated_at' => current_time( 'mysql', true ),
				'item_count' => WC()->cart->get_cart_contents_count(),
				'total'      => (float) WC()->cart->get_total( 'edit' ),
				'currency'   => get_woocommerce_currency(),
				'items'      => wp_json_encode( $items ),
			),
			array( '%s', '%s', '%d', '%f', '%s', '%s' )
		);
	}

	public static function mark_converted( $order_id, $posted, $order ): void {
		self::converted( (int) $order_id );
	}

	public static function mark_converted_api( $order ): void {
		if ( $order instanceof WC_Order ) {
			self::converted( $order->get_id() );
		}
	}

	private static function converted( int $order_id ): void {
		$key = self::cart_key();
		if ( ! $key || ! $order_id ) {
			return;
		}
		global $wpdb;
		$wpdb->update(
			$wpdb->prefix . self::TABLE,
			array( 'converted_order_id' => $order_id ),
			array( 'cart_key' => $key ),
			array( '%d' ),
			array( '%s' )
		);
	}

	/** Rule 3: retention enforced by a job, not by intention. */
	public static function purge(): void {
		global $wpdb;
		$t = $wpdb->prefix . self::TABLE;
		$n = $wpdb->query(
			$wpdb->prepare( "DELETE FROM $t WHERE updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d DAY)", self::RETENTION )
		);
		if ( $n ) {
			wc_get_logger()->info( "purged $n cart record(s) older than " . self::RETENTION . ' days',
				array( 'source' => 'darling-cart-capture' ) );
		}
	}

	public static function register_eraser( array $erasers ): array {
		$erasers['darling-carts'] = array(
			'eraser_friendly_name' => 'Дарлинг — изоставени кошници',
			'callback'             => array( __CLASS__, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * Nothing here is keyed by email, so a subject request can only reach records
	 * linked to an actual order. That is a consequence of rule 1, and it is the
	 * intended one: browsing carts are not attributable to a person.
	 */
	public static function erase( $email, $page = 1 ): array {
		global $wpdb;
		$t       = $wpdb->prefix . self::TABLE;
		$removed = 0;
		$user    = get_user_by( 'email', $email );
		$ids     = wc_get_orders( array( 'customer' => $email, 'limit' => -1, 'return' => 'ids' ) );
		if ( $user ) {
			$ids = array_merge( $ids, wc_get_orders( array( 'customer_id' => $user->ID, 'limit' => -1, 'return' => 'ids' ) ) );
		}
		foreach ( array_unique( array_map( 'intval', $ids ) ) as $oid ) {
			$removed += (int) $wpdb->delete( $t, array( 'converted_order_id' => $oid ), array( '%d' ) );
		}
		return array(
			'items_removed'  => $removed > 0,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => true,
		);
	}
}
