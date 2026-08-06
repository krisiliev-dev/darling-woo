<?php
/**
 * BORICA APGW gateway.
 *
 * Lives in its own file and is required lazily — see class-borica.php for why.
 *
 * The wire format lives in class-borica-protocol.php, which has no WordPress
 * dependency and is gated by tests/borica-protocol-gate.php against BORICA's
 * own published vectors — including five real signatures from their test
 * terminal. This file is the WooCommerce shell around that proven core.
 *
 * 2026-08-06: the MAC field-order warning that used to sit at the top of this
 * file is SETTLED, from a front-to-back read of P-OM-41 v7.0. The scheme is
 * MAC_GENERAL and the response signing string does NOT carry a trailing RFU
 * byte, even though the spec's own tables print one. See
 * docs claude/BORICA_INTEGRATION_20260806.md and the protocol class header.
 * The old MAC_RESPONSE constant here included RFU: every response would have
 * failed verification, and the symptom is indistinguishable from a bad key.
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-borica-protocol.php';

class Darling_Borica_Gateway extends WC_Payment_Gateway {

	/** How long after a non-final response the status re-check becomes meaningful. */
	private const RECHECK_AFTER = Darling_Borica_Protocol::FINAL_AFTER_SECONDS;

	public function __construct() {
		$this->id                 = 'darling_borica';
		$this->method_title       = 'Борика (карта)';
		$this->method_description = 'Плащане с карта през БОРИКА APGW. '
			. 'Ключът за подписване се чете от файл на сървъра (DARLING_BORICA_KEY), не от базата.';
		$this->has_fields         = false;
		$this->icon               = '';
		// 'refunds' is deliberately NOT declared: TRTYPE=24 is not wired yet, and a
		// refund button that silently fails is worse than no button. Re-add it in
		// the same commit that implements process_refund() and proves it on the
		// test terminal.
		$this->supports = array( 'products' );

		$this->init_form_fields();
		$this->init_settings();

		$this->title       = $this->get_option( 'title', 'Плащане с карта' );
		$this->description = $this->get_option( 'description', 'Ще бъдете пренасочени към защитената страница на БОРИКА.' );
		$this->enabled     = $this->get_option( 'enabled', 'no' );

		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		add_action( 'woocommerce_receipt_' . $this->id, array( $this, 'receipt_page' ) );
	}

	public function init_form_fields(): void {
		$this->form_fields = array(
			'enabled' => array(
				'title'   => 'Активно',
				'type'    => 'checkbox',
				'label'   => 'Приемай плащания с карта през БОРИКА',
				'default' => 'no',
			),
			'title' => array(
				'title'   => 'Заглавие',
				'type'    => 'text',
				'default' => 'Плащане с карта',
			),
			'description' => array(
				'title'   => 'Описание',
				'type'    => 'textarea',
				'default' => 'Ще бъдете пренасочени към защитената страница на БОРИКА.',
			),
			'environment' => array(
				'title'       => 'Среда',
				'type'        => 'select',
				'options'     => array( 'test' => 'Тестова', 'prod' => 'Продукционна' ),
				'default'     => 'test',
				'description' => 'Смени на продукционна едва след успешен тест с тестовия терминал.',
			),
			'terminal' => array(
				'title'       => 'TERMINAL ID',
				'type'        => 'text',
				'description' => 'V + 7 цифри, от договора. Различен е за тестова и продукционна среда.',
				'default'     => '',
			),
			'merchant' => array(
				'title'       => 'MERCHANT ID',
				'type'        => 'text',
				'description' => '10 знака, от договора.',
				'default'     => '',
			),
			'merch_name' => array(
				'title'   => 'Име на търговеца',
				'type'    => 'text',
				'default' => 'Дарлинг 7 ООД',
			),
			'merch_url' => array(
				'title'   => 'Адрес на магазина',
				'type'    => 'text',
				'default' => 'https://darlinghome.bg',
			),
		);
	}

	// ─── configuration ────────────────────────────────────────────────────

	private function gateway_url(): string {
		return 'prod' === $this->get_option( 'environment', 'test' )
			? Darling_Borica_Protocol::GATEWAY_PROD
			: Darling_Borica_Protocol::GATEWAY_TEST;
	}

	private static function key_path(): string {
		return (string) ( getenv( 'DARLING_BORICA_KEY' ) ?: '' );
	}

	private static function key_pass(): string {
		return (string) ( getenv( 'DARLING_BORICA_KEY_PASS' ) ?: '' );
	}

	private static function cert_path(): string {
		return (string) ( getenv( 'DARLING_BORICA_CERT' ) ?: '' );
	}

	/**
	 * Every reason the gateway is not usable, in plain Bulgarian.
	 * Returned as a list rather than a bool so the settings screen can say WHICH
	 * piece is missing — "не е конфигурирано" sends someone hunting.
	 */
	public function config_problems(): array {
		$p = array();

		$tid = (string) $this->get_option( 'terminal' );
		if ( ! $tid ) {
			$p[] = 'липсва TERMINAL ID';
		} elseif ( ! preg_match( '/^V\d{7}$/', $tid ) ) {
			$p[] = 'TERMINAL ID трябва да е във вида V1234567';
		}
		if ( ! $this->get_option( 'merchant' ) ) {
			$p[] = 'липсва MERCHANT ID';
		}

		$key = self::key_path();
		if ( ! $key ) {
			$p[] = 'липсва DARLING_BORICA_KEY (път до частния ключ)';
		} elseif ( ! is_readable( $key ) ) {
			$p[] = "ключът не е четим: $key";
		} elseif ( '' === self::key_pem() ) {
			$p[] = 'ключът не се зарежда (грешна парола или формат)';
		}

		$cert = self::cert_path();
		if ( ! $cert ) {
			$p[] = 'липсва DARLING_BORICA_CERT (сертификат на БОРИКА за проверка на отговора)';
		} elseif ( ! is_readable( $cert ) ) {
			$p[] = "сертификатът не е четим: $cert";
		}

		// The terminal is single-currency and the request currency must match it.
		// Bulgaria is on the euro from 2026-01-01, so a BGN store here means the
		// shop and the terminal disagree and every request comes back RC -11.
		if ( 'EUR' !== get_woocommerce_currency() ) {
			$p[] = 'валутата на магазина трябва да е EUR (терминалът е едновалутен)';
		}
		return $p;
	}

	/**
	 * Hide the gateway until it can actually take a payment. A card button that
	 * dead-ends at a signature error loses the order AND the customer's trust,
	 * so an unconfigured gateway is simply not offered.
	 */
	public function is_available(): bool {
		return 'yes' === $this->enabled && empty( $this->config_problems() );
	}

	public function admin_options(): void {
		$problems = $this->config_problems();
		if ( $problems ) {
			echo '<div class="notice notice-warning inline"><p><strong>БОРИКА не е готова</strong> — методът няма да се показва на клиентите:</p><ul style="list-style:disc;margin-left:2em">';
			foreach ( $problems as $p ) {
				printf( '<li>%s</li>', esc_html( $p ) );
			}
			echo '</ul></div>';
		} else {
			echo '<div class="notice notice-success inline"><p><strong>БОРИКА е конфигурирана.</strong> '
			   . esc_html( 'Среда: ' . ( 'prod' === $this->get_option( 'environment', 'test' ) ? 'ПРОДУКЦИОННА' : 'тестова' ) )
			   . '</p></div>';
		}
		echo '<p><em>BACKREF (адрес за отговор — регистрира се при БОРИКА за терминала, не се изпраща в заявката):</em> <code>'
		   . esc_html( WC()->api_request_url( 'darling_borica' ) ) . '</code></p>';
		parent::admin_options();
	}

	// ─── signing ──────────────────────────────────────────────────────────

	/** The key PEM, or '' when it cannot be read or decrypted. */
	private static function key_pem(): string {
		$path = self::key_path();
		if ( ! $path || ! is_readable( $path ) ) {
			return '';
		}
		$pem = file_get_contents( $path );
		if ( false === $pem ) {
			return '';
		}
		// Prove it actually loads with the configured passphrase, so a wrong
		// password is reported on the settings screen and not at checkout.
		return openssl_pkey_get_private( $pem, self::key_pass() ) ? (string) $pem : '';
	}

	/**
	 * Kept as a delegating alias: tests/borica-mac.php and any other caller that
	 * knew this entry point keeps working, but there is exactly ONE implementation
	 * of the MAC rule in the tree.
	 */
	public static function mac( array $fields, array $data ): string {
		return Darling_Borica_Protocol::mac_source( $fields, $data );
	}

	private static function sign( array $data ): ?string {
		$pem = self::key_pem();
		if ( '' === $pem ) {
			return null;
		}
		try {
			return Darling_Borica_Protocol::sign_request( $data, $pem, self::key_pass() );
		} catch ( Exception $e ) {
			wc_get_logger()->error( 'BORICA sign failed: ' . $e->getMessage(), array( 'source' => 'darling-borica' ) );
			return null;
		}
	}

	/** @return array {ok: bool, variant: string, source: string} */
	private static function verify( array $data ): array {
		$cert = self::cert_path();
		if ( ! $cert || ! is_readable( $cert ) ) {
			return array( 'ok' => false, 'variant' => '', 'source' => '' );
		}
		return Darling_Borica_Protocol::verify_response( $data, (string) file_get_contents( $cert ) );
	}

	// ─── payment ──────────────────────────────────────────────────────────

	/**
	 * APGW wants a 6-digit ORDER, unique per terminal per 24 h. Order ids will
	 * exceed six digits, so we send the last six and carry the REAL order id in
	 * AD.CUST_BOR_ORDER_ID, which BORICA echoes back and also puts in the
	 * financial files the accountant reconciles against. The response is matched
	 * on that, never on ORDER — six digits collide every million orders and would
	 * then settle the wrong one.
	 */
	private static function short_order( int $order_id ): string {
		return substr( str_pad( (string) $order_id, 6, '0', STR_PAD_LEFT ), -6 );
	}

	/** ORDER + 'WC' + real order id, which is the format BORICA's Table 1 requires. */
	private static function addendum_order_id( int $order_id ): string {
		return Darling_Borica_Protocol::bor_order_id( self::short_order( $order_id ), 'WC' . $order_id );
	}

	/** Recover the Woo order id from the echoed AD.CUST_BOR_ORDER_ID. */
	public static function order_id_from_addendum( string $addendum ): int {
		// 6 digits of ORDER, then 'WC', then the real id.
		return preg_match( '/^\d{6}WC(\d+)$/', trim( $addendum ), $m ) ? (int) $m[1] : 0;
	}

	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );
		return array(
			'result'   => 'success',
			'redirect' => $order->get_checkout_payment_url( true ),
		);
	}

	/** Renders the auto-submitting form that hands the customer to BORICA. */
	public function receipt_page( $order_id ): void {
		$order  = wc_get_order( $order_id );
		$fields = $this->build_request( $order );

		if ( null === $fields ) {
			wc_print_notice( 'Плащането с карта е временно недостъпно. Моля, изберете друг начин на плащане.', 'error' );
			wc_get_logger()->error(
				sprintf( 'order %d: could not sign BORICA request (%s)', $order_id, implode( '; ', $this->config_problems() ) ),
				array( 'source' => 'darling-borica' )
			);
			return;
		}

		printf( '<form id="darling-borica" method="POST" action="%s">', esc_url( $this->gateway_url() ) );
		foreach ( $fields as $k => $v ) {
			printf( '<input type="hidden" name="%s" value="%s">', esc_attr( $k ), esc_attr( $v ) );
		}
		echo '<p>Пренасочване към БОРИКА…</p>';
		echo '<button type="submit" class="button">Продължи към плащане</button>';
		echo '</form>';
		// Auto-submit, but leave the button: if JS is off or slow, the customer is
		// not stranded on a blank page.
		echo '<script>document.getElementById("darling-borica").submit();</script>';
	}

	private function build_request( WC_Order $order ): ?array {
		$order_id = $order->get_id();
		try {
			// get_total() is a string in WooCommerce; keeping it one all the way
			// through means the amount never round-trips through a float.
			$amount = Darling_Borica_Protocol::format_amount( (string) $order->get_total() );
			$short  = Darling_Borica_Protocol::format_order( self::short_order( $order_id ) );
		} catch ( Exception $e ) {
			wc_get_logger()->error(
				sprintf( 'order %d: bad BORICA amount/order (%s)', $order_id, $e->getMessage() ),
				array( 'source' => 'darling-borica' )
			);
			return null;
		}

		$data = array(
			'TERMINAL'  => (string) $this->get_option( 'terminal' ),
			'TRTYPE'    => Darling_Borica_Protocol::TRTYPE_SALE,
			'AMOUNT'    => $amount,
			'CURRENCY'  => get_woocommerce_currency(),
			'ORDER'     => $short,
			'TIMESTAMP' => Darling_Borica_Protocol::utc_timestamp(),
			'NONCE'     => Darling_Borica_Protocol::new_nonce(),
		);

		$sign = self::sign( $data );
		if ( null === $sign ) {
			return null;
		}

		// The NONCE is what a response is matched on, so it is stored BEFORE the
		// customer leaves. An unrecognised NONCE coming back later then means
		// "not ours", not "we forgot".
		$order->update_meta_data( '_borica_nonce', $data['NONCE'] );
		$order->update_meta_data( '_borica_order', $short );
		$order->update_meta_data( '_borica_sent_at', time() );
		$order->save();

		// Non-MAC fields are added AFTER signing — they are not covered by the
		// signature and including them in the MAC would break verification.
		//
		// M_INFO is mandatory for a Sale, and it is also the main lever we have on
		// card conversion: the richer the 3-DS v2 data, the more likely the issuer
		// authenticates frictionlessly instead of sending an SMS the customer
		// abandons.
		$minfo = Darling_Borica_Protocol::m_info( array(
			'name'         => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ),
			'email'        => (string) $order->get_billing_email(),
			'phone'        => (string) $order->get_billing_phone(),
			'bill_address' => trim( $order->get_billing_address_1() . ', ' . $order->get_billing_city() ),
			'ship_address' => trim( $order->get_shipping_address_1() . ', ' . $order->get_shipping_city() ),
		) );

		return $data + array(
			'P_SIGN'               => $sign,
			'DESC'                 => mb_substr( 'Поръчка ' . $order->get_order_number(), 0, 50 ),
			'MERCHANT'             => (string) $this->get_option( 'merchant' ),
			'MERCH_NAME'           => (string) $this->get_option( 'merch_name' ),
			'MERCH_URL'            => (string) $this->get_option( 'merch_url' ),
			'MERCH_GMT'            => '+03',
			'COUNTRY'              => 'BG',
			'LANG'                 => 'BG',
			'EMAIL'                => (string) $order->get_billing_email(),
			'M_INFO'               => $minfo,
			'AD.CUST_BOR_ORDER_ID' => self::addendum_order_id( $order_id ),
			'ADDENDUM'             => 'AD,TD',
		);
		// BACKREF is deliberately absent: APGW takes the return address from the
		// terminal record in its own database, and it is not in the documented
		// field list. Ours is registered as https://darlinghome.bg/wc-api/darling_borica/.
	}

	// ─── callback ─────────────────────────────────────────────────────────

	/**
	 * Claim a one-time action atomically. INSERT on a UNIQUE column, so two
	 * concurrent callbacks cannot both win — a check-then-act here means two
	 * payment_complete() calls, two stock decrements and two customer e-mails.
	 */
	private static function claim_once( string $key ): bool {
		global $wpdb;
		$rows = $wpdb->query(
			$wpdb->prepare(
				"INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')",
				substr( $key, 0, 191 ),
				(string) time()
			)
		);
		return 1 === (int) $rows;
	}

	/**
	 * BORICA posts the result here. Everything in $_POST is attacker-controllable
	 * until the signature is verified, so nothing touches the order before that.
	 */
	public static function handle_callback(): void {
		$gw  = WC()->payment_gateways()->payment_gateways()['darling_borica'] ?? null;
		$in  = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification -- signed by BORICA
		$in  = is_array( $in ) ? array_map( 'strval', $in ) : array();
		$log = wc_get_logger();

		$verdict = self::verify( $in );
		if ( ! $verdict['ok'] ) {
			// Unverified means "no message at all": we do not read the amount off
			// it, do not touch an order, and do not tell the customer anything
			// derived from it.
			$log->error( 'BORICA callback FAILED signature verification - ignored', array( 'source' => 'darling-borica' ) );
			status_header( 400 );
			exit( 'bad signature' );
		}
		if ( 'canonical' !== $verdict['variant'] ) {
			// Still genuine — it took BORICA's private key — but signed over the
			// with-RFU string. That means the scheme moved and someone must look.
			$log->warning(
				'BORICA response verified only in the legacy with-RFU form; the signing scheme has changed',
				array( 'source' => 'darling-borica' )
			);
		}

		$order_id = self::order_id_from_addendum( (string) ( $in['AD.CUST_BOR_ORDER_ID'] ?? '' ) );
		$order    = $order_id ? wc_get_order( $order_id ) : null;
		if ( ! $order instanceof WC_Order ) {
			$log->error(
				'BORICA callback for unknown order, addendum=' . ( $in['AD.CUST_BOR_ORDER_ID'] ?? '' ),
				array( 'source' => 'darling-borica' )
			);
			status_header( 404 );
			exit( 'unknown order' );
		}

		// The signature proves BORICA sent it; it does NOT prove it is about this
		// order or this amount. NONCE is unique per request and was stored before
		// the customer left, so it is what ties the message to the attempt.
		$expected_nonce = (string) $order->get_meta( '_borica_nonce' );
		if ( '' !== $expected_nonce && ! hash_equals( $expected_nonce, (string) ( $in['NONCE'] ?? '' ) ) ) {
			$log->error(
				sprintf( 'order %d: BORICA NONCE does not match the request - ignored', $order_id ),
				array( 'source' => 'darling-borica' )
			);
			status_header( 409 );
			exit( 'nonce mismatch' );
		}

		$result = Darling_Borica_Protocol::classify( $in );

		// A replayed older-but-valid message for a cheaper order must not settle
		// this one. Checked only on the success path: declines carry whatever
		// amount BORICA chooses to echo.
		if ( 'paid' === $result['state'] ) {
			$expect = Darling_Borica_Protocol::format_amount( (string) $order->get_total() );
			if ( $result['amount'] !== $expect ) {
				$log->error(
					sprintf( 'order %d: BORICA amount %s != order total %s - NOT marking paid',
						$order_id, $result['amount'], $expect ),
					array( 'source' => 'darling-borica' )
				);
				$order->add_order_note( 'БОРИКА върна различна сума — плащането НЕ е признато. Провери ръчно.' );
				$order->save();
				status_header( 409 );
				exit( 'amount mismatch' );
			}
		}

		$order->update_meta_data( '_borica_action',  $result['action'] );
		$order->update_meta_data( '_borica_rc',      $result['rc'] );
		$order->update_meta_data( '_borica_rrn',     $result['rrn'] );
		$order->update_meta_data( '_borica_int_ref', $result['int_ref'] );
		$order->update_meta_data( '_borica_approval', $result['approval'] );
		$order->update_meta_data( '_borica_eci', $result['eci'] );
		$order->update_meta_data( '_borica_auth_step_res', $result['auth_step_res'] );
		$order->update_meta_data( '_borica_card', $result['card'] );

		// The issuer's ACS sometimes sends text meant for the cardholder. The spec
		// says the merchant MUST display it, so at minimum it lands on the order
		// where the office can read it back to them.
		if ( '' !== $result['cardholder_info'] ) {
			$order->add_order_note( 'Съобщение от банката към клиента: ' . $result['cardholder_info'] );
		}

		$redirect = wc_get_checkout_url();

		if ( 'paid' === $result['state'] ) {
			// Only ACTION 0 together with RC 00 is money. BORICA can post the same
			// result more than once, and the status poller is a second route to the
			// same completion, so the claim is atomic and keyed on the order.
			if ( self::claim_once( '_borica_settled_' . $order_id ) ) {
				$order->payment_complete( $result['rrn'] );
				$order->add_order_note( sprintf(
					'БОРИКА: одобрено (RRN %s, код %s, карта %s, ECI %s).',
					$result['rrn'], $result['approval'], $result['card'], $result['eci']
				) );
			} else {
				$log->info( sprintf( 'order %d: BORICA result already settled, ignoring duplicate', $order_id ),
					array( 'source' => 'darling-borica' ) );
			}
			$redirect = $gw ? $gw->get_return_url( $order ) : home_url();

		} elseif ( 'declined' === $result['state'] ) {
			$order->update_status( 'failed', sprintf( 'БОРИКА: отказано (RC %s — %s).', $result['rc'], $result['message'] ) );
			wc_add_notice( 'Плащането беше отказано от банката. Опитайте отново или изберете друг начин на плащане.', 'error' );

		} else {
			// NOT a decline. Negative RCs are gateway-side and can still become 00
			// inside GUARDTIME — the customer pressed Back, got an error, then
			// carried on and paid. Marking these failed loses real sales; marking
			// them paid loses real money. So: hold, and re-check after the window.
			$order->update_status( 'on-hold', sprintf(
				'БОРИКА: все още няма окончателен отговор (RC %s — %s). Проверката ще се повтори след %d минути.',
				$result['rc'], $result['message'], (int) round( self::RECHECK_AFTER / 60 )
			) );
			wp_schedule_single_event( time() + self::RECHECK_AFTER, 'darling_borica_recheck', array( $order_id ) );
			wc_add_notice( 'Плащането още се обработва от банката. Ще получите потвърждение по имейл.', 'notice' );
		}

		$order->save();
		wp_safe_redirect( $redirect );
		exit;
	}

	// ─── status re-check ──────────────────────────────────────────────────

	/** How many times a non-final transaction is re-checked before a human is asked. */
	private const RECHECK_MAX = 3;

	/**
	 * TRTYPE=90. The reconciliation path, and the reason an order whose customer
	 * closed the browser still ends up truthful.
	 *
	 * Read-only against BORICA: it moves no money. The only write is the same
	 * settle path the callback uses, behind the same atomic claim, because the
	 * callback and this poller are two routes to one completion.
	 *
	 * APGW only keeps transaction data for 24 hours; after that this can no longer
	 * answer and the order needs a human and the Merchant Portal.
	 */
	public static function recheck( $order_id ): void {
		$order_id = (int) $order_id;
		$order    = $order_id ? wc_get_order( $order_id ) : null;
		$log      = wc_get_logger();
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		if ( $order->is_paid() || 'failed' === $order->get_status() ) {
			return;   // the callback got there first
		}

		$gws = WC()->payment_gateways()->payment_gateways();
		$gw  = $gws['darling_borica'] ?? null;
		if ( ! $gw instanceof self ) {
			return;
		}

		$attempts = (int) $order->get_meta( '_borica_recheck_attempts' );
		$request  = array(
			'TERMINAL'    => (string) $gw->get_option( 'terminal' ),
			'TRTYPE'      => Darling_Borica_Protocol::TRTYPE_STATUS,
			'ORDER'       => (string) $order->get_meta( '_borica_order' ),
			'NONCE'       => Darling_Borica_Protocol::new_nonce(),
		);
		if ( '' === $request['ORDER'] ) {
			return;   // never sent to BORICA in the first place
		}
		$sign = self::sign( $request );
		if ( null === $sign ) {
			$log->error( sprintf( 'order %d: cannot sign BORICA status check', $order_id ),
				array( 'source' => 'darling-borica' ) );
			return;
		}
		$request['TRAN_TRTYPE'] = Darling_Borica_Protocol::TRTYPE_SALE;
		$request['P_SIGN']      = $sign;

		$res = wp_remote_post( $gw->gateway_url(), array(
			'timeout' => 20,
			'body'    => $request,
		) );
		if ( is_wp_error( $res ) ) {
			$log->error( sprintf( 'order %d: BORICA status check failed: %s', $order_id, $res->get_error_message() ),
				array( 'source' => 'darling-borica' ) );
			self::reschedule( $order, $attempts );
			return;
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		if ( ! is_array( $body ) ) {
			$log->error( sprintf( 'order %d: BORICA status check returned no JSON', $order_id ),
				array( 'source' => 'darling-borica' ) );
			self::reschedule( $order, $attempts );
			return;
		}
		$body = array_map( 'strval', array_filter( $body, 'is_scalar' ) );

		if ( ! self::verify( $body )['ok'] ) {
			// Fail closed: an unverified answer tells us nothing, so the order
			// stays exactly where it is.
			$log->error( sprintf( 'order %d: BORICA status check signature did not verify - ignored', $order_id ),
				array( 'source' => 'darling-borica' ) );
			self::reschedule( $order, $attempts );
			return;
		}

		$result = Darling_Borica_Protocol::classify( $body );
		$order->update_meta_data( '_borica_rc', $result['rc'] );
		$order->update_meta_data( '_borica_recheck_attempts', $attempts + 1 );

		if ( 'paid' === $result['state'] ) {
			$expect = Darling_Borica_Protocol::format_amount( (string) $order->get_total() );
			if ( $result['amount'] !== $expect ) {
				$order->add_order_note( sprintf(
					'БОРИКА (проверка на статус): сумата %s не съвпада с %s — плащането НЕ е признато.',
					$result['amount'], $expect ) );
				$order->save();
				return;
			}
			$order->update_meta_data( '_borica_rrn', $result['rrn'] );
			$order->update_meta_data( '_borica_int_ref', $result['int_ref'] );
			$order->update_meta_data( '_borica_approval', $result['approval'] );
			if ( self::claim_once( '_borica_settled_' . $order_id ) ) {
				$order->payment_complete( $result['rrn'] );
				$order->add_order_note( sprintf(
					'БОРИКА (проверка на статус): одобрено (RRN %s, код %s).',
					$result['rrn'], $result['approval'] ) );
			}
		} elseif ( 'declined' === $result['state'] ) {
			$order->update_status( 'failed', sprintf(
				'БОРИКА (проверка на статус): отказано (RC %s — %s).', $result['rc'], $result['message'] ) );
		} else {
			self::reschedule( $order, $attempts );
		}
		$order->save();
	}

	/** Try again later, or hand it to a human rather than looping forever. */
	private static function reschedule( WC_Order $order, int $attempts ): void {
		if ( $attempts + 1 >= self::RECHECK_MAX ) {
			$order->add_order_note( sprintf(
				'БОРИКА: след %d проверки все още няма окончателен отговор. Провери ръчно в Merchant Portal '
				. '(поръчка %s) — APGW пази данните само 24 часа.',
				self::RECHECK_MAX, $order->get_meta( '_borica_order' ) ) );
			$order->save();
			return;
		}
		$order->update_meta_data( '_borica_recheck_attempts', $attempts + 1 );
		$order->save();
		wp_schedule_single_event( time() + self::RECHECK_AFTER, 'darling_borica_recheck', array( $order->get_id() ) );
	}
}
