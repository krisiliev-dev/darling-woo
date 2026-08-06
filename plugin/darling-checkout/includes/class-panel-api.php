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

	/**
	 * Bump when the panel's response SHAPE changes. NOT when its data changes -
	 * that is what the TTL is for. See self::get().
	 */
	private const CACHE_EPOCH   = '20260807a';

	private const CACHE_OFFICES = 12 * HOUR_IN_SECONDS;
	private const CACHE_QUOTE   = 10 * MINUTE_IN_SECONDS;
	private const TIMEOUT       = 8;

	private const CACHE_PROBE_OK      = 12 * HOUR_IN_SECONDS;
	private const CACHE_PROBE_ABSENT  = HOUR_IN_SECONDS;
	private const CACHE_PROBE_UNKNOWN = 5 * MINUTE_IN_SECONDS;
	/** How long a carrier stays 'known good' for outage decisions. */
	private const CACHE_KNOWN_GOOD    = 30 * DAY_IN_SECONDS;

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
		// *** THE CACHE KEY CARRIES A SHAPE EPOCH, AND IT HAD TO. ***
		// Office lists cache for twelve hours keyed on the URL. When the panel starts
		// returning NEW FIELDS - as it did tonight, adding kind/lat/lon/distance_km -
		// every already-cached URL keeps serving the OLD SHAPE until it expires, and the
		// storefront quietly renders a feature that looks broken.
		// Measured: Свищов still answered `kind: ""` from cache while a never-queried
		// city answered `kind: "office"` - so СВИЩОВ - БИЛЛА (АВТОМАТ) was still being
		// labelled «офис» in the picker, which is the exact support call this whole
		// slice exists to prevent. It also nearly had me report a working panel as
		// broken twice in one night.
		// *** A PANEL DEPLOY MUST NOT TAKE TWELVE HOURS TO REACH CUSTOMERS. ***
		$key = 'darling_papi_' . self::CACHE_EPOCH . '_' . md5( $url );

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

	/**
	 * Courier offices AND lockers for a settlement, optionally ranked by distance.
	 *
	 * Every row is now {id, name, address, city, lat, lon, kind} for every carrier,
	 * and `kind` is `locker` (автомат), `office` or `pudo`.
	 *
	 * *** THAT FIELD IS NOT COSMETIC. *** Speedy's list is 833 lockers and 460
	 * staffed offices in ONE response, so the per-CARRIER noun in the registry is
	 * wrong for Speedy on nearly two thirds of its rows - it sends someone to look
	 * for a counter at an unattended machine, which is exactly the support call the
	 * registry's own comment says the noun exists to prevent. The noun has to follow
	 * the ROW, not the courier.
	 *
	 * `$lat`/`$lon` must be given together; they rank nearest-first and add
	 * `distance_km`. They are ROUNDED TO 3 DECIMALS (~110 m) before the call, because
	 * the transient key is a hash of the URL: a browser's raw high-precision position
	 * would mint a fresh cache entry per customer per request and the 12h office cache
	 * would never hit once.
	 *
	 * @return array<int,array{id:string,name:string,address:string,city:string,lat:?float,lon:?float,kind:string,distance_km?:float}>
	 */
	public static function offices( string $carrier, string $city, ?float $lat = null, ?float $lon = null, ?float $radius_km = null ): array {
		$carrier = self::carrier( $carrier );
		if ( ! $carrier ) {
			return array();
		}
		$args = array();
		if ( '' !== trim( $city ) ) {
			$args['city'] = $city;
		}
		if ( null !== $lat && null !== $lon ) {
			$args['lat'] = round( $lat, 3 );
			$args['lon'] = round( $lon, 3 );
			if ( null !== $radius_km && $radius_km > 0 ) {
				$args['radius_km'] = round( $radius_km, 1 );
			}
		}
		// Never ask for a whole country's offices. With neither a settlement nor a
		// position there is nothing to rank or filter by, and the panel caps at 300
		// AFTER filtering - so an unfiltered call returns an arbitrary 300 of Speedy's
		// 1293 and looks like a complete answer.
		if ( ! $args ) {
			return array();
		}
		$r = self::get( "/api/public/couriers/$carrier/offices", $args, self::CACHE_OFFICES );
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
			'dest_type'  => Darling_Carriers::is_pickup( $dest_type ) ? 'office' : 'door',
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

	private const CACHE_RATES     = 15 * MINUTE_IN_SECONDS;
	/**
	 * How long a last-known-good rates table may substitute during a panel
	 * outage. Stale-but-true beats both "no checkout" and an invented price:
	 * tariffs change on contract renegotiation, not hourly.
	 */
	private const CACHE_RATES_LKG = DAY_IN_SECONDS;

	/**
	 * The panel's pre-computed shipping-rates table for (weight, cod).
	 *
	 * Contract (PANEL_AGENT_STATUS.md, 2026-08-05):
	 *   GET /api/public/shipping-rates?weight_kg=<float>&cod=<0|1>
	 *   -> {"rates":[{courier,mode,label_bg,price_eur,sort},…],"free_over_eur":77.0}
	 * Rates arrive cheapest-first; price_eur already contains the buffer, and the
	 * COD fee when cod=1. Cached 15 min per (weight rounded to 0.1kg, cod) — the
	 * panel brackets weights internally, so the rounding only bounds the number
	 * of cache keys, not correctness.
	 *
	 * Returns the decoded payload; during an outage, the last-known-good payload
	 * with 'darling_stale' => true (logged); null when there has never been one.
	 * A HEALTHY response with an empty rates array is returned as-is — it is
	 * authoritative (panel refresh still filling) and callers hide options.
	 */
	public static function shipping_rates( float $weight_kg, bool $cod ): ?array {
		if ( ! self::configured() ) {
			return null;
		}
		$w   = number_format( max( 0.1, round( $weight_kg, 1 ) ), 1, '.', '' );
		$key = 'darling_papi_rates_' . $w . '_' . ( $cod ? '1' : '0' );
		$lkg = 'darling_papi_rates_lkg_' . $w . '_' . ( $cod ? '1' : '0' );

		$hit = get_transient( $key );
		if ( is_array( $hit ) ) {
			return $hit;
		}

		$url = self::base() . '/api/public/shipping-rates?' . http_build_query( array(
			'weight_kg' => $w,
			'cod'       => $cod ? '1' : '0',
		) );
		$res = wp_remote_get( $url, array(
			'timeout' => self::TIMEOUT,
			'headers' => array( 'X-Office-Token' => self::token(), 'Accept' => 'application/json' ),
		) );

		$data = null;
		if ( ! is_wp_error( $res ) && 200 === (int) wp_remote_retrieve_response_code( $res ) ) {
			$decoded = json_decode( wp_remote_retrieve_body( $res ), true );
			if ( is_array( $decoded ) && array_key_exists( 'rates', $decoded ) ) {
				$data = $decoded;
			}
		}

		if ( null !== $data ) {
			set_transient( $key, $data, self::CACHE_RATES );
			if ( ! empty( $data['rates'] ) ) {
				// Only a table that actually offers something is worth keeping as
				// the outage substitute — an empty table would hide everything.
				set_transient( $lkg, $data, self::CACHE_RATES_LKG );
			}
			return $data;
		}

		self::log( 'shipping-rates fetch failed (' . ( is_wp_error( $res ) ? $res->get_error_message() : 'HTTP ' . wp_remote_retrieve_response_code( $res ) ) . ')' );
		$old = get_transient( $lkg );
		if ( is_array( $old ) ) {
			self::log( 'serving LAST-KNOWN-GOOD shipping rates (stale, real prices) for w=' . $w . ' cod=' . ( $cod ? '1' : '0' ) );
			$old['darling_stale'] = true;
			return $old;
		}
		return null;
	}

	/**
	 * Relay a newsletter signup to the panel's listmonk endpoint.
	 *
	 * Returns 'pending' | 'invalid' | 'ratelimited' | 'unavailable'. The caller
	 * owns the fallback — this method never invents a success.
	 */
	public static function newsletter_subscribe( string $email, string $source ): string {
		if ( ! self::configured() ) {
			return 'unavailable';
		}
		// 12s, not the shared 8s: panel asks >=10s headroom here (listmonk's SMTP
		// dial is inline on subscriber create). Checkout-latency paths keep 8s.
		$res = wp_remote_post( self::base() . '/api/public/newsletter/subscribe', array(
			'timeout' => 12,
			'headers' => array(
				'X-Office-Token' => self::token(),
				'Content-Type'   => 'application/json',
				'Accept'         => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'email'      => $email,
				'source'     => $source,
				'consent'    => true,
				'consent_ts' => gmdate( 'c' ),
			) ),
		) );
		if ( is_wp_error( $res ) ) {
			self::log( 'newsletter relay failed: ' . $res->get_error_message() );
			return 'unavailable';
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		if ( 200 === $code ) {
			return 'pending';
		}
		if ( 400 === $code ) {
			return 'invalid';
		}
		if ( 429 === $code ) {
			return 'ratelimited';
		}
		self::log( "newsletter relay returned HTTP $code" );
		return 'unavailable';
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
			// The panel is UNREACHABLE, which is not the same as "this carrier is
			// not provisioned". If we have ever confirmed this carrier, keep
			// treating it as supported so the quote path still runs and can fall
			// back to a charged rate.
			//
			// Without this the fail-open is defeated by its own guard: a panel
			// outage made supports() false, the carrier produced NO rate, and
			// checkout offered no shipping at all — which is the exact outcome
			// FALLBACK_RATE_EUR exists to prevent. Found by trying to produce a
			// fallback order and discovering one could not occur.
			set_transient( $key, '0', self::CACHE_PROBE_UNKNOWN );
			return (bool) get_transient( self::known_key( $carrier ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );

		if ( 200 === $code ) {
			set_transient( $key, '1', self::CACHE_PROBE_OK );
			// Long-lived "we have seen this work" marker, used only to decide how
			// to behave during an outage.
			set_transient( self::known_key( $carrier ), '1', self::CACHE_KNOWN_GOOD );
			return true;
		}
		if ( in_array( $code, array( 404, 501 ), true ) ) {
			// An explicit "no such carrier" IS authoritative — forget it is good.
			set_transient( $key, '0', self::CACHE_PROBE_ABSENT );
			delete_transient( self::known_key( $carrier ) );
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

	private static function known_key( string $carrier ): string {
		return 'darling_papi_known_' . $carrier;
	}

	private static function log( string $msg ): void {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->warning( $msg, array( 'source' => 'darling-panel-api' ) );
		}
	}
}
