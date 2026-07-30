<?php
/**
 * Server-side client for our own admin panel.
 *
 * All courier calls go through the panel, never direct to Econt/Speedy: the
 * courier credentials stay on the panel box and the shop holds no courier
 * logic. The panel token is read from the environment, never committed.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Panel_API {

	private const CACHE_OFFICES = 12 * HOUR_IN_SECONDS;
	private const CACHE_QUOTE   = 10 * MINUTE_IN_SECONDS;
	private const TIMEOUT       = 8;

	private const CACHE_PROBE_OK      = 12 * HOUR_IN_SECONDS;
	private const CACHE_PROBE_ABSENT  = HOUR_IN_SECONDS;
	private const CACHE_PROBE_UNKNOWN = 5 * MINUTE_IN_SECONDS;

	public static function configured(): bool {
		return (bool) self::token() && (bool) self::base();
	}

	private static function base(): string {
		return (string) ( getenv( 'DARLING_PANEL_URL' ) ?: '' );
	}

	private static function token(): string {
		return (string) ( getenv( 'DARLING_PANEL_TOKEN' ) ?: '' );
	}

	/**
	 * @return array{ok:bool,data:array,error:string}
	 */
	private static function get( string $path, array $args, int $ttl ): array {
		if ( ! self::configured() ) {
			return array( 'ok' => false, 'data' => array(), 'error' => 'panel not configured' );
		}
		$url = self::base() . $path . '?' . http_build_query( $args );
		$key = 'darling_papi_' . md5( $url );

		$hit = get_transient( $key );
		if ( false !== $hit ) {
			return array( 'ok' => true, 'data' => $hit, 'error' => '' );
		}

		$res = wp_remote_get( $url, array(
			'timeout' => self::TIMEOUT,
			'headers' => array( 'X-Office-Token' => self::token(), 'Accept' => 'application/json' ),
		) );

		if ( is_wp_error( $res ) ) {
			self::log( "$path failed: " . $res->get_error_message() );
			return array( 'ok' => false, 'data' => array(), 'error' => $res->get_error_message() );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		if ( 200 !== $code ) {
			self::log( "$path returned HTTP $code" );
			return array( 'ok' => false, 'data' => array(), 'error' => "HTTP $code" );
		}
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( ! is_array( $data ) ) {
			self::log( "$path returned unparseable body" );
			return array( 'ok' => false, 'data' => array(), 'error' => 'bad json' );
		}
		set_transient( $key, $data, $ttl );
		return array( 'ok' => true, 'data' => $data, 'error' => '' );
	}

	/** @return array<int,array{id:string,name:string,address:string}> */
	public static function offices( string $carrier, string $city ): array {
		$carrier = self::carrier( $carrier );
		if ( ! $carrier || '' === trim( $city ) ) {
			return array();
		}
		$r = self::get( "/api/public/couriers/$carrier/offices", array( 'city' => $city ), self::CACHE_OFFICES );
		return $r['ok'] ? (array) ( $r['data']['offices'] ?? array() ) : array();
	}

	/**
	 * Live courier fee. Returns null when the panel cannot answer — callers must
	 * decide the fallback, and MUST NOT silently treat null as "free".
	 *
	 * @return array{shipping:float,cod:float,total:float}|null
	 */
	public static function quote( string $carrier, string $dest_type, array $dest, int $weight_g, bool $cod, float $amount ): ?array {
		$carrier = self::carrier( $carrier );
		if ( ! $carrier ) {
			return null;
		}
		$args = array(
			'dest_type'  => 'office' === $dest_type ? 'office' : 'door',
			'weight_g'   => max( 1, $weight_g ),
			'cod'        => $cod ? 'true' : 'false',
			'amount_eur' => round( $amount, 2 ),
		) + $dest;

		$r = self::get( "/api/public/couriers/$carrier/quote", $args, self::CACHE_QUOTE );
		if ( ! $r['ok'] ) {
			return null;
		}
		$d = $r['data'];
		if ( ! isset( $d['total_fee_eur'] ) ) {
			return null;
		}
		return array(
			'shipping' => (float) ( $d['shipping_fee_eur'] ?? 0 ),
			'cod'      => (float) ( $d['cod_fee_eur'] ?? 0 ),
			'total'    => (float) $d['total_fee_eur'],
		);
	}

	private static function carrier( string $c ): string {
		$c = strtolower( trim( $c ) );
		return null !== Darling_Carriers::get( $c ) ? $c : '';
	}

	/**
	 * Can the panel actually serve this carrier right now?
	 *
	 * The registry lists every courier we know how to speak to; this asks which of
	 * them the panel has credentials for. A carrier under contract but not yet
	 * provisioned answers 404, and must NOT be offered at checkout — quoting a
	 * courier we cannot book is worse than not offering it, because the customer
	 * pays for a delivery that then has to be renegotiated by phone.
	 *
	 * Deliberately three-valued in its caching:
	 *   200      -> supported, cache long (stable state)
	 *   404/501  -> not provisioned, cache 1h so a new contract goes live by itself
	 *   timeout  -> UNKNOWN, cache 5min only; a flaky network must never latch a
	 *               working carrier off for an hour.
	 */
	public static function supports( string $carrier ): bool {
		$carrier = self::carrier( $carrier );
		if ( ! $carrier || ! self::configured() ) {
			return false;
		}
		$key = 'darling_papi_sup_' . $carrier;
		$hit = get_transient( $key );
		if ( false !== $hit ) {
			return '1' === $hit;
		}

		$url = self::base() . "/api/public/couriers/$carrier/offices?" . http_build_query( array( 'city' => 'София' ) );
		$res = wp_remote_get( $url, array(
			'timeout' => self::TIMEOUT,
			'headers' => array( 'X-Office-Token' => self::token(), 'Accept' => 'application/json' ),
		) );

		if ( is_wp_error( $res ) ) {
			set_transient( $key, '0', self::CACHE_PROBE_UNKNOWN );
			return false;
		}
		$code = (int) wp_remote_retrieve_response_code( $res );

		if ( 200 === $code ) {
			set_transient( $key, '1', self::CACHE_PROBE_OK );
			return true;
		}
		if ( in_array( $code, array( 404, 501 ), true ) ) {
			set_transient( $key, '0', self::CACHE_PROBE_ABSENT );
			return false;
		}
		// 5xx, 401, anything else: a real problem, but not evidence about provisioning.
		self::log( "carrier probe $carrier returned HTTP $code" );
		set_transient( $key, '0', self::CACHE_PROBE_UNKNOWN );
		return false;
	}

	/** Carriers the panel can serve right now, in registry order. */
	public static function live_carriers(): array {
		$live = array();
		foreach ( array_keys( Darling_Carriers::all() ) as $id ) {
			if ( self::supports( $id ) ) {
				$live[] = $id;
			}
		}
		return $live;
	}

	private static function log( string $msg ): void {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->warning( $msg, array( 'source' => 'darling-panel-api' ) );
		}
	}
}
