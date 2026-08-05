<?php
/**
 * Newsletter subscribe relay.
 *
 * The storefront form posts here; this relays to the panel's listmonk endpoint
 * SERVER-SIDE (the office token never reaches the browser — same model as the
 * office lookup and shipping rates). The panel endpoint went LIVE 2026-08-05
 * (night): the orders@ mail fallback is retired — listmonk is the system of record, and
 * an unreachable panel surfaces an honest "опитай пак по-късно" (contract rule:
 * never queue-and-fake).
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

		// Panel says try later (503 = listmonk down or disabled), or the relay
		// could not reach it. Per the panel contract (2026-08-05 night entry):
		// show an honest "try later" — never queue-and-fake, never a mailbox
		// side-channel that would double-handle signups now that listmonk is
		// the system of record for the list.
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->warning(
				'newsletter subscribe unavailable (panel/listmonk down?) - customer told to retry',
				array( 'source' => 'darling-newsletter' )
			);
		}
		return self::err( 'Нещо се обърка — опитай пак малко по-късно, darling.' );
	}

	private static function ok( string $msg ): WP_REST_Response {
		return new WP_REST_Response( array( 'ok' => true, 'message' => $msg ), 200 );
	}

	private static function err( string $msg ): WP_REST_Response {
		return new WP_REST_Response( array( 'ok' => false, 'message' => $msg ), 200 );
	}
}
