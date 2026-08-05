<?php
/**
 * Newsletter subscribe relay.
 *
 * The storefront form posts here; this relays to the panel's listmonk endpoint
 * SERVER-SIDE (the office token never reaches the browser — same model as the
 * office lookup and shipping rates). Until the panel posts that the endpoint is
 * LIVE, and whenever it is unreachable, the address is delivered to the
 * orders@ mailbox instead (same mail path as the contact form) so no signup is
 * ever lost. The two paths return DIFFERENT success copy: double opt-in wording
 * only when the panel accepted (a confirmation email really will arrive).
 *
 * Contract (PANEL_AGENT_STATUS.md, 2026-08-05):
 *   POST {panel}/api/public/newsletter/subscribe  X-Office-Token: …
 *   {"email":…,"source":…,"consent":true,"consent_ts":…}
 *   200 {"status":"pending"} · 400 invalid · 403 token · 429 rate-limited
 */

defined( 'ABSPATH' ) || exit;

class Darling_Newsletter {

	private const RATE_LIMIT     = 10;            // per IP
	private const RATE_WINDOW    = HOUR_IN_SECONDS;
	private const MIN_FILL_MS    = 2500;          // faster than a human types an email
	private const RECIPIENT      = 'orders@darlinghome.bg';

	public static function init(): void {
		add_action( 'rest_api_init', function () {
			register_rest_route( 'darling/v1', '/newsletter', array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => '__return_true',
			) );
		} );
	}

	public static function handle( WP_REST_Request $req ): WP_REST_Response {
		$email   = sanitize_email( (string) $req->get_param( 'email' ) );
		$hp      = (string) $req->get_param( 'website' );
		$elapsed = (int) $req->get_param( 'elapsed_ms' );

		// Bots get a confident success and nothing happens — same posture as the
		// contact form: an error message is a debugging aid for the spammer.
		if ( '' !== $hp || ( $elapsed > 0 && $elapsed < self::MIN_FILL_MS ) ) {
			return self::ok( 'Проверете пощата си, за да потвърдите абонамента.' );
		}

		if ( ! is_email( $email ) ) {
			return self::err( 'Невалиден имейл адрес.' );
		}

		$ip  = (string) ( $_SERVER['REMOTE_ADDR'] ?? '' );
		$key = 'darling_news_rl_' . md5( $ip );
		$n   = (int) get_transient( $key );
		if ( $n >= self::RATE_LIMIT ) {
			return self::err( 'Твърде много опити — опитай пак по-късно.' );
		}
		set_transient( $key, $n + 1, self::RATE_WINDOW );

		$status = Darling_Panel_API::newsletter_subscribe( $email, 'home' );

		if ( 'pending' === $status ) {
			return self::ok( 'Проверете пощата си, за да потвърдите абонамента.' );
		}
		if ( 'invalid' === $status ) {
			return self::err( 'Невалиден имейл адрес.' );
		}
		if ( 'ratelimited' === $status ) {
			return self::err( 'Твърде много опити — опитай пак по-късно.' );
		}

		// Panel unavailable (endpoint not live yet, or outage): deliver to the
		// mailbox so the signup is kept. Honest copy — no confirmation email is
		// coming on this path.
		$sent = wp_mail(
			self::RECIPIENT,
			'Абонамент за бюлетина (fallback)',
			"Нов абонат за бюлетина:\n\n{$email}\n\nЗаписан на: " . gmdate( 'c' )
			. "\nИзточник: начална страница (panel endpoint unavailable — да се добави в listmonk при пускането)."
		);
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->info(
				'newsletter fallback to mailbox (panel status: unavailable, mail ' . ( $sent ? 'sent' : 'FAILED' ) . ')',
				array( 'source' => 'darling-newsletter' )
			);
		}
		if ( $sent ) {
			return self::ok( 'Благодарим! Записахме те, darling.' );
		}
		return self::err( 'Нещо се обърка — опитай пак малко по-късно.' );
	}

	private static function ok( string $msg ): WP_REST_Response {
		return new WP_REST_Response( array( 'ok' => true, 'message' => $msg ), 200 );
	}

	private static function err( string $msg ): WP_REST_Response {
		return new WP_REST_Response( array( 'ok' => false, 'message' => $msg ), 200 );
	}
}
