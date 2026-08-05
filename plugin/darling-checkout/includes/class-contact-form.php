<?php
/**
 * Contact form on /kontakti/ — [darling_contact_form].
 *
 * EMAIL-FIRST BY DESIGN (owner decision, 2026-08-05): the message is delivered
 * to orders@darlinghome.bg through the shop's own verified mail path
 * (Darling_Mail / phpmailer_init), which runs on this same box. Wiring the form
 * to the admin panel instead would make a customer's message depend on the
 * panel box being up at the moment they press Send. If the panel later wants
 * these messages visible, it reads the mailbox over IMAP — one source of
 * truth, two views of it.
 *
 * Spam posture: honeypot + minimum-fill-time + per-IP rate limit. The first
 * two PRETEND SUCCESS on a hit (a bot told "rejected" just adapts); the rate
 * limit is honest because a human can trip it. The rate-limit counter lives in
 * a transient: if the object cache is down the counter reads 0 and the form
 * stays open — fail open on advice, fail closed on money. A contact form is
 * advice.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Contact_Form {

	private const NONCE   = 'darling_contact';
	private const MAX_PER_HOUR = 5;
	private const MIN_SECONDS  = 3;

	public static function init(): void {
		add_shortcode( 'darling_contact_form', array( __CLASS__, 'render' ) );
		add_action( 'admin_post_darling_contact', array( __CLASS__, 'handle' ) );
		add_action( 'admin_post_nopriv_darling_contact', array( __CLASS__, 'handle' ) );
	}

	private static function to(): string {
		return (string) ( getenv( 'DARLING_CONTACT_TO' ) ?: 'orders@darlinghome.bg' );
	}

	/* ---------------------------------------------------------------- render */

	public static function render(): string {
		$notice = self::notice_html();

		// The page sits behind a 60s micro-cache, so this nonce is shared by
		// everyone who loads the cached copy — which is how logged-out nonces
		// behave anyway. A stale one (cache row older than the nonce lifetime)
		// fails soft: the visitor gets a "try again" notice, not a white screen.
		$nonce  = wp_create_nonce( self::NONCE );
		$action = esc_url( admin_url( 'admin-post.php' ) );

		return $notice . '
<form class="darling-contact-form" id="kontakt-forma" method="post" action="' . $action . '">
	<input type="hidden" name="action" value="darling_contact">
	<input type="hidden" name="_wpnonce" value="' . esc_attr( $nonce ) . '">
	<input type="hidden" name="form_ts" value="' . esc_attr( (string) time() ) . '">

	<p class="darling-hp" aria-hidden="true">
		<label for="dcf-website">Уебсайт</label>
		<input type="text" id="dcf-website" name="website" tabindex="-1" autocomplete="off">
	</p>

	<div class="darling-contact-form__row">
		<p>
			<label class="visually-hidden" for="dcf-name">Име</label>
			<input type="text" id="dcf-name" name="dcf_name" maxlength="100" autocomplete="name" placeholder="Име">
		</p>
		<p>
			<label class="visually-hidden" for="dcf-email">Имейл адрес *</label>
			<input type="email" id="dcf-email" name="dcf_email" maxlength="100" autocomplete="email" required placeholder="Имейл адрес *">
		</p>
	</div>
	<p>
		<label class="visually-hidden" for="dcf-phone">Телефон</label>
		<input type="tel" id="dcf-phone" name="dcf_phone" maxlength="40" autocomplete="tel" placeholder="Телефон">
	</p>
	<p>
		<label class="visually-hidden" for="dcf-body">Коментар *</label>
		<textarea id="dcf-body" name="dcf_body" rows="10" maxlength="5000" required placeholder="Коментар *"></textarea>
	</p>
	<p>
		<button type="submit" class="d-btn d-btn--primary">Изпрати</button>
	</p>
</form>';
	}

	private static function notice_html(): string {
		if ( isset( $_GET['izprateno'] ) ) {
			return '<p class="darling-form-notice darling-form-notice--ok">Благодарим ти! Съобщението е изпратено — ще се обадим или ще ти пишем съвсем скоро, darling.</p>';
		}
		if ( ! isset( $_GET['greshka'] ) ) {
			return '';
		}
		$msgs = array(
			'danni'       => 'Моля, попълни имейл и съобщение — без тях няма как да ти отговорим.',
			'sesiya'      => 'Сесията изтече. Презареди страницата и опитай отново.',
			'chesto'      => 'Получихме няколко съобщения от теб подред. Изчакай малко или ни се обади на 089 336 1670.',
			'izprashtane' => 'Не успяхме да изпратим съобщението. Обади се на 089 336 1670 или ни пиши директно на orders@darlinghome.bg.',
		);
		$key = sanitize_key( (string) $_GET['greshka'] );
		$msg = $msgs[ $key ] ?? $msgs['izprashtane'];
		return '<p class="darling-form-notice darling-form-notice--err">' . esc_html( $msg ) . '</p>';
	}

	/* ---------------------------------------------------------------- handle */

	public static function handle(): void {
		if ( ! wp_verify_nonce( (string) ( $_POST['_wpnonce'] ?? '' ), self::NONCE ) ) {
			self::back( 'greshka', 'sesiya' );
		}

		// Honeypot filled or the form came back faster than a human types:
		// spam. Pretend success so the bot learns nothing.
		$ts = (int) ( $_POST['form_ts'] ?? 0 );
		if ( '' !== trim( (string) ( $_POST['website'] ?? '' ) )
			|| $ts <= 0 || ( time() - $ts ) < self::MIN_SECONDS ) {
			self::back( 'izprateno', '1' );
		}

		$ip  = (string) ( $_SERVER['REMOTE_ADDR'] ?? '' );
		$key = 'darling_contact_rl_' . md5( $ip );
		$n   = (int) get_transient( $key );
		if ( $n >= self::MAX_PER_HOUR ) {
			self::back( 'greshka', 'chesto' );
		}
		set_transient( $key, $n + 1, HOUR_IN_SECONDS );

		$name  = sanitize_text_field( (string) ( $_POST['dcf_name'] ?? '' ) );
		$email = sanitize_email( (string) ( $_POST['dcf_email'] ?? '' ) );
		$phone = sanitize_text_field( (string) ( $_POST['dcf_phone'] ?? '' ) );
		$body  = sanitize_textarea_field( (string) ( $_POST['dcf_body'] ?? '' ) );

		if ( ! is_email( $email ) || '' === trim( $body ) ) {
			self::back( 'greshka', 'danni' );
		}

		$lines = array(
			'Ново съобщение от формата за контакт на darlinghome.bg',
			'',
			'Име:     ' . ( $name ?: '—' ),
			'Имейл:   ' . $email,
			'Телефон: ' . ( $phone ?: '—' ),
			'',
			$body,
			'',
			'— изпратено на ' . wp_date( 'd.m.Y H:i' ) . ' от IP ' . $ip,
		);

		$subject = 'Съобщение от darlinghome.bg' . ( $name ? ' — ' . $name : '' );
		$headers = array( 'Reply-To: ' . ( $name ? "$name <$email>" : $email ) );

		$sent = wp_mail( self::to(), $subject, implode( "\n", $lines ), $headers );

		// wp_mail false → the visitor is told plainly and given the direct
		// address. A "thanks!" over a failed send is how messages vanish.
		$sent ? self::back( 'izprateno', '1' ) : self::back( 'greshka', 'izprashtane' );
	}

	private static function back( string $param, string $value ): void {
		$url = wp_get_referer() ?: home_url( '/kontakti/' );
		$url = remove_query_arg( array( 'izprateno', 'greshka' ), $url );
		wp_safe_redirect( add_query_arg( $param, $value, $url ) . '#kontakt-forma' );
		exit;
	}
}
