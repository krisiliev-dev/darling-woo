<?php
/**
 * Outbound email over SMTP.
 *
 * The container has no MTA — `sendmail_path` points at /usr/sbin/sendmail, which
 * does not exist in the official WordPress image. So every transactional mail was
 * failing with "Неуспешна инициализация на функцията mail", including the customer's
 * order confirmation and the shop's new-order notice. Silently: WooCommerce logs
 * it as an order note and carries on, so the order looks perfectly healthy.
 *
 * Done here rather than with an SMTP plugin so the credentials stay in the
 * ENVIRONMENT and never reach the database — the same rule as the courier token
 * and the BORICA key. A plugin storing an app password in wp_options would put it
 * in every database backup.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Mail {

	public static function init(): void {
		add_action( 'phpmailer_init', array( __CLASS__, 'configure' ) );
		add_action( 'wp_mail_failed', array( __CLASS__, 'log_failure' ) );
		add_action( 'admin_notices', array( __CLASS__, 'notice' ) );
	}

	private static function user(): string {
		return (string) ( getenv( 'SMTP_USER' ) ?: getenv( 'GMAIL_USER' ) ?: '' );
	}

	private static function pass(): string {
		// The app password is stored with spaces by Google; SMTP wants it without.
		// Leaving them in produces an auth failure that reads like a wrong password.
		return str_replace( ' ', '', (string) ( getenv( 'SMTP_PASS' ) ?: getenv( 'GMAIL_APP_PASSWORD' ) ?: '' ) );
	}

	public static function configured(): bool {
		return '' !== self::user() && '' !== self::pass();
	}

	public static function configure( $phpmailer ): void {
		if ( ! self::configured() ) {
			return;
		}
		$phpmailer->isSMTP();
		$phpmailer->Host       = (string) ( getenv( 'SMTP_HOST' ) ?: 'smtp.gmail.com' );
		$phpmailer->Port       = (int) ( getenv( 'SMTP_PORT' ) ?: 587 );
		$phpmailer->SMTPAuth   = true;
		$phpmailer->SMTPSecure = 'tls';
		$phpmailer->Username   = self::user();
		$phpmailer->Password   = self::pass();
		$phpmailer->Timeout    = 15;

		// PHPMailer's default CharSet is ISO-8859-1: Cyrillic subjects and bodies
		// arrive as mojibake (only Latin survives - reported by the owner on a
		// review-moderation mail). UTF-8 + base64 transfer encoding survives every
		// relay and mailbox on the route.
		$phpmailer->CharSet  = 'UTF-8';
		$phpmailer->Encoding = 'base64';

		// Gmail rewrites the envelope sender to the authenticated account anyway, so
		// a From: that disagrees just looks like spoofing to spam filters. Make the
		// header match reality and keep the shop name as the display name.
		$phpmailer->setFrom(
			self::user(),
			(string) ( getenv( 'SMTP_FROM_NAME' ) ?: get_bloginfo( 'name' ) ),
			false
		);
	}

	/** Never let a delivery failure be invisible — that is how this one survived. */
	public static function log_failure( $error ): void {
		if ( $error instanceof WP_Error && function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->error( 'mail failed: ' . $error->get_error_message(), array( 'source' => 'darling-mail' ) );
		}
	}

	public static function notice(): void {
		if ( self::configured() || ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		echo '<div class="notice notice-error"><p><strong>Дарлинг</strong>: липсват SMTP данни '
		   . '(SMTP_USER / SMTP_PASS) — <strong>магазинът не изпраща имейли</strong>, включително '
		   . 'потвърждения за поръчка към клиентите.</p></div>';
	}
}
