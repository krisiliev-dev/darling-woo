<?php
/**
 * BORICA APGW gateway.
 *
 * Lives in its own file and is required lazily — see class-borica.php for why,
 * and for the MAC field-order warning that must be settled before go-live.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Borica_Gateway extends WC_Payment_Gateway {
	/** Sale. 12 = deferred auth, 21 = capture, 22 = reversal, 24 = refund. */
	private const TRTYPE_SALE = '1';

	private const URL_TEST = 'https://3dsgate-dev.borica.bg/cgi-bin/cgi_link';
	private const URL_PROD = 'https://3dsgate.borica.bg/cgi-bin/cgi_link';

	/** ⚠ Confirm against the doc pack — see file header. */
	private const MAC_REQUEST = array(
		'TERMINAL', 'TRTYPE', 'AMOUNT', 'CURRENCY', 'ORDER', 'TIMESTAMP', 'NONCE', 'RFU',
	);
	private const MAC_RESPONSE = array(
		'ACTION', 'RC', 'APPROVAL', 'TERMINAL', 'TRTYPE', 'AMOUNT', 'CURRENCY',
		'ORDER', 'RRN', 'INT_REF', 'PARES_STATUS', 'ECI', 'TIMESTAMP', 'NONCE', 'RFU',
	);

	public function __construct() {
		$this->id                 = 'darling_borica';
		$this->method_title       = 'Борика (карта)';
		$this->method_description = 'Плащане с карта през БОРИКА APGW. '
			. 'Ключът за подписване се чете от файл на сървъра (DARLING_BORICA_KEY), не от базата.';
		$this->has_fields         = false;
		$this->icon               = '';
		$this->supports           = array( 'products', 'refunds' );

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
				'description' => '8 цифри, от договора.',
				'default'     => '',
			),
			'merchant' => array(
				'title'       => 'MERCHANT ID',
				'type'        => 'text',
				'description' => '10–15 знака, от договора.',
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
		return 'prod' === $this->get_option( 'environment', 'test' ) ? self::URL_PROD : self::URL_TEST;
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
		if ( ! $this->get_option( 'terminal' ) ) { $p[] = 'липсва TERMINAL ID'; }
		if ( ! $this->get_option( 'merchant' ) ) { $p[] = 'липсва MERCHANT ID'; }

		$key = self::key_path();
		if ( ! $key ) {
			$p[] = 'липсва DARLING_BORICA_KEY (път до частния ключ)';
		} elseif ( ! is_readable( $key ) ) {
			$p[] = "ключът не е четим: $key";
		} elseif ( null === self::load_key() ) {
			$p[] = 'ключът не се зарежда (грешна парола или формат)';
		}

		$cert = self::cert_path();
		if ( ! $cert ) {
			$p[] = 'липсва DARLING_BORICA_CERT (сертификат на БОРИКА за проверка на отговора)';
		} elseif ( ! is_readable( $cert ) ) {
			$p[] = "сертификатът не е четим: $cert";
		}

		if ( 'EUR' !== get_woocommerce_currency() && 'BGN' !== get_woocommerce_currency() ) {
			$p[] = 'валутата на магазина трябва да е EUR или BGN';
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
		echo '<p><em>BACKREF (адрес за отговор, дай го на БОРИКА):</em> <code>'
		   . esc_html( WC()->api_request_url( 'darling_borica' ) ) . '</code></p>';
		parent::admin_options();
	}

	// ─── signing ──────────────────────────────────────────────────────────

	/** @return \OpenSSLAsymmetricKey|null */
	private static function load_key() {
		$path = self::key_path();
		if ( ! $path || ! is_readable( $path ) ) {
			return null;
		}
		$pem = file_get_contents( $path );
		if ( false === $pem ) {
			return null;
		}
		$key = openssl_pkey_get_private( $pem, self::key_pass() );
		return $key ?: null;
	}

	/**
	 * APGW MAC: each field contributes strlen(value).value, and an EMPTY field
	 * contributes a literal "-". Getting the empty case wrong is the classic
	 * failure — it only shows up on the orders where one optional field happens
	 * to be blank, so it looks intermittent.
	 */
	public static function mac( array $fields, array $data ): string {
		$mac = '';
		foreach ( $fields as $f ) {
			$v = (string) ( $data[ $f ] ?? '' );
			$mac .= ( '' === $v ) ? '-' : strlen( $v ) . $v;
		}
		return $mac;
	}

	private static function sign( array $data ): ?string {
		$key = self::load_key();
		if ( null === $key ) {
			return null;
		}
		$sig = '';
		if ( ! openssl_sign( self::mac( self::MAC_REQUEST, $data ), $sig, $key, OPENSSL_ALGO_SHA256 ) ) {
			return null;
		}
		return strtoupper( bin2hex( $sig ) );
	}

	private static function verify( array $data ): bool {
		$cert = self::cert_path();
		if ( ! $cert || ! is_readable( $cert ) ) {
			return false;
		}
		$pub = openssl_pkey_get_public( (string) file_get_contents( $cert ) );
		if ( ! $pub ) {
			return false;
		}
		$sig = (string) ( $data['P_SIGN'] ?? '' );
		if ( '' === $sig || ! ctype_xdigit( $sig ) ) {
			return false;
		}
		return 1 === openssl_verify(
			self::mac( self::MAC_RESPONSE, $data ),
			(string) hex2bin( $sig ),
			$pub,
			OPENSSL_ALGO_SHA256
		);
	}

	// ─── payment ──────────────────────────────────────────────────────────

	/**
	 * APGW wants a 6-digit ORDER. Order ids will exceed that, so we send the last
	 * six digits and keep the REAL order id in AD.CUST_BOR_ORDER_ID, which is
	 * echoed back. The response is matched on that, never on ORDER — six digits
	 * collide every million orders and would then settle the wrong order.
	 */
	private static function short_order( int $order_id ): string {
		return substr( str_pad( (string) $order_id, 6, '0', STR_PAD_LEFT ), -6 );
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
		$amount = number_format( (float) $order->get_total(), 2, '.', '' );

		$data = array(
			'TERMINAL'  => (string) $this->get_option( 'terminal' ),
			'TRTYPE'    => self::TRTYPE_SALE,
			'AMOUNT'    => $amount,
			'CURRENCY'  => get_woocommerce_currency(),
			'ORDER'     => self::short_order( $order->get_id() ),
			'TIMESTAMP' => gmdate( 'YmdHis' ),
			'NONCE'     => strtoupper( bin2hex( random_bytes( 16 ) ) ),
			'RFU'       => '',
		);

		$sign = self::sign( $data );
		if ( null === $sign ) {
			return null;
		}

		// Non-MAC fields are added AFTER signing — they are not covered by the
		// signature and including them in the MAC would break verification.
		return $data + array(
			'P_SIGN'                 => $sign,
			'DESC'                   => 'Поръчка ' . $order->get_order_number(),
			'MERCHANT'               => (string) $this->get_option( 'merchant' ),
			'MERCH_NAME'             => (string) $this->get_option( 'merch_name' ),
			'MERCH_URL'              => (string) $this->get_option( 'merch_url' ),
			'MERCH_GMT'              => '+03',
			'COUNTRY'                => 'BG',
			'LANG'                   => 'BG',
			'EMAIL'                  => $order->get_billing_email(),
			'BACKREF'                => WC()->api_request_url( 'darling_borica' ),
			'AD.CUST_BOR_ORDER_ID'   => (string) $order->get_id(),
			'ADDENDUM'               => 'AD,TD',
		);
	}

	// ─── callback ─────────────────────────────────────────────────────────

	/**
	 * BORICA posts the result here. Everything in $_POST is attacker-controllable
	 * until the signature is verified, so nothing touches the order before that.
	 */
	public static function handle_callback(): void {
		$gw = WC()->payment_gateways()->payment_gateways()['darling_borica'] ?? null;
		$in = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification -- signed by BORICA
		$in = is_array( $in ) ? array_map( 'strval', $in ) : array();

		$log = wc_get_logger();

		if ( ! self::verify( $in ) ) {
			$log->error( 'BORICA callback FAILED signature verification - ignored', array( 'source' => 'darling-borica' ) );
			status_header( 400 );
			exit( 'bad signature' );
		}

		$order_id = (int) ( $in['AD.CUST_BOR_ORDER_ID'] ?? 0 );
		$order    = $order_id ? wc_get_order( $order_id ) : null;
		if ( ! $order instanceof WC_Order ) {
			$log->error( "BORICA callback for unknown order $order_id", array( 'source' => 'darling-borica' ) );
			status_header( 404 );
			exit( 'unknown order' );
		}

		// The signature proves BORICA sent it; it does NOT prove it is about the
		// amount we asked for. A replayed older-but-valid message for a cheaper
		// order of the same customer would otherwise mark this one paid.
		$expect = number_format( (float) $order->get_total(), 2, '.', '' );
		if ( (string) ( $in['AMOUNT'] ?? '' ) !== $expect ) {
			$log->error(
				sprintf( 'order %d: BORICA amount %s != order total %s - NOT marking paid',
					$order_id, $in['AMOUNT'] ?? '', $expect ),
				array( 'source' => 'darling-borica' )
			);
			$order->add_order_note( 'БОРИКА върна различна сума — плащането НЕ е признато. Провери ръчно.' );
			status_header( 409 );
			exit( 'amount mismatch' );
		}

		$rc  = (string) ( $in['RC'] ?? '' );
		$rrn = (string) ( $in['RRN'] ?? '' );

		// BORICA can post the same result more than once. Without this an order
		// gets a second payment note and a second stock decrement.
		if ( $order->get_meta( '_borica_rrn' ) === $rrn && $order->is_paid() ) {
			status_header( 200 );
			exit( 'already processed' );
		}

		$order->update_meta_data( '_borica_rc',       $rc );
		$order->update_meta_data( '_borica_rrn',      $rrn );
		$order->update_meta_data( '_borica_approval', (string) ( $in['APPROVAL'] ?? '' ) );
		$order->update_meta_data( '_borica_int_ref',  (string) ( $in['INT_REF'] ?? '' ) );

		if ( '00' === $rc ) {
			$order->payment_complete( $rrn );
			$order->add_order_note( sprintf( 'БОРИКА: одобрено (RRN %s, код %s).', $rrn, $in['APPROVAL'] ?? '' ) );
			$redirect = $gw ? $gw->get_return_url( $order ) : home_url();
		} else {
			$order->update_status( 'failed', sprintf( 'БОРИКА: отказано (RC %s).', $rc ) );
			$redirect = wc_get_checkout_url();
			wc_add_notice( 'Плащането беше отказано от банката. Опитайте отново или изберете друг начин на плащане.', 'error' );
		}
		$order->save();

		wp_safe_redirect( $redirect );
		exit;
	}
}
