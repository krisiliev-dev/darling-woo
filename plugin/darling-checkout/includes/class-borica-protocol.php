<?php
/**
 * BORICA APGW / 3-D Secure protocol core.
 *
 * P-OM-41 "Secure payments via Internet — instruction for virtual merchants",
 * version 7.0 / 17.04.2026, signing scheme MAC_GENERAL.
 *
 * This class is pure protocol: no WordPress, no I/O, no globals. It is the
 * PHP twin of darling_core/borica.py and BOTH are gated by the same vector
 * file (borica_vectors.json), which contains five REAL signatures produced by
 * BORICA's test terminal V1800001. If the two implementations ever drift, the
 * shared vectors fail on whichever side moved.
 *
 * THE ONE THING THAT WILL BITE YOU (spec pp. 26/30/49/50)
 * ------------------------------------------------------
 * The signed string concatenates <utf8-byte-length><value> per field in a
 * fixed order. Missing or empty fields contribute a single "-" with no length.
 *
 *   REQUEST  strings end with an extra "-" (the RFU placeholder).
 *   RESPONSE strings DO NOT.
 *
 * Section 5 of the spec prints response strings *with* a trailing "-" and
 * claims the signature is valid. That is a documentation error: five real
 * (string, P_SIGN) pairs published in that same document verify against
 * BORICA's own APGW public key only when the trailing byte is omitted, and
 * none verify with it. BORICA's PHP sample in §9.7 also omits it.
 *
 * MONEY RULES
 * -----------
 * - Settled iff ACTION === '0' AND RC === '00'. Nothing else is money.
 * - A negative RC is NOT final: it can still flip to success inside GUARDTIME
 *   (15 min). classify() returns three states — never collapse to a boolean.
 * - A response whose P_SIGN does not verify did not come from BORICA. Treat it
 *   as no message at all: do not read the amount off it, do not complete the
 *   order, do not show the customer a result derived from it.
 *
 * @package Darling_Borica
 */

defined( 'ABSPATH' ) || defined( 'DARLING_BORICA_CLI' ) || exit;

class Darling_Borica_Protocol {

	const TRTYPE_SALE             = '1';
	const TRTYPE_PREAUTH          = '12';
	const TRTYPE_COMPLETION       = '21';
	const TRTYPE_PREAUTH_REVERSAL = '22';
	const TRTYPE_REVERSAL         = '24';
	const TRTYPE_STATUS           = '90';

	/** APGW rejects a TIMESTAMP older than this. */
	const GUARDTIME_SECONDS = 900;
	/** GUARDTIME + 1 min buffer; only after this is a negative RC final. */
	const FINAL_AFTER_SECONDS = 960;

	const GATEWAY_TEST = 'https://3dsgate-dev.borica.bg/cgi-bin/cgi_link';
	const GATEWAY_PROD = 'https://3dsgate.borica.bg/cgi-bin/cgi_link';

	const RFU = '-';

	/** Fields signed in a request, per transaction type (RFU appended below). */
	private static function req_base() {
		return array( 'TERMINAL', 'TRTYPE', 'AMOUNT', 'CURRENCY', 'ORDER', 'TIMESTAMP', 'NONCE' );
	}

	/** Fields signed in every response — no RFU. */
	public static function response_sign_fields() {
		return array(
			'ACTION', 'RC', 'APPROVAL', 'TERMINAL', 'TRTYPE', 'AMOUNT', 'CURRENCY',
			'ORDER', 'RRN', 'INT_REF', 'PARES_STATUS', 'ECI', 'TIMESTAMP', 'NONCE',
		);
	}

	/**
	 * @param string $trtype
	 * @return array
	 * @throws InvalidArgumentException
	 */
	public static function request_sign_fields( $trtype ) {
		$trtype = (string) $trtype;
		if ( self::TRTYPE_STATUS === $trtype ) {
			return array( 'TERMINAL', 'TRTYPE', 'ORDER', 'NONCE' );
		}
		$known = array(
			self::TRTYPE_SALE, self::TRTYPE_PREAUTH, self::TRTYPE_COMPLETION,
			self::TRTYPE_PREAUTH_REVERSAL, self::TRTYPE_REVERSAL,
		);
		if ( ! in_array( $trtype, $known, true ) ) {
			throw new InvalidArgumentException( 'unsupported TRTYPE ' . $trtype );
		}
		$fields   = self::req_base();
		$fields[] = 'RFU';
		return $fields;
	}

	/**
	 * Build the MAC_GENERAL signing string.
	 *
	 * @param array $fields Ordered field names.
	 * @param array $values Field values.
	 * @return string
	 */
	public static function mac_source( array $fields, array $values ) {
		$out = '';
		foreach ( $fields as $name ) {
			if ( 'RFU' === $name ) {
				$out .= self::RFU;
				continue;
			}
			$text = isset( $values[ $name ] ) && null !== $values[ $name ] ? (string) $values[ $name ] : '';
			$out .= ( '' === $text ) ? self::RFU : strlen( $text ) . $text;
		}
		return $out;
	}

	/**
	 * Sign a request with our RSA private key.
	 *
	 * @param array  $fields   Request fields including TRTYPE.
	 * @param string $key_pem  PEM of the private key.
	 * @param string $password Key password, '' when unprotected.
	 * @return string P_SIGN, uppercase hex (512 chars for a 2048-bit key).
	 * @throws RuntimeException
	 */
	public static function sign_request( array $fields, $key_pem, $password = '' ) {
		$trtype = isset( $fields['TRTYPE'] ) ? (string) $fields['TRTYPE'] : '';
		$source = self::mac_source( self::request_sign_fields( $trtype ), $fields );

		$key = openssl_pkey_get_private( $key_pem, $password );
		if ( false === $key ) {
			throw new RuntimeException( 'Borica: cannot load the private key (wrong password?)' );
		}
		$details = openssl_pkey_get_details( $key );
		if ( ! $details || OPENSSL_KEYTYPE_RSA !== $details['type'] || $details['bits'] < 2048 ) {
			throw new RuntimeException( 'Borica: signing key must be RSA 2048-bit or larger' );
		}
		$signature = '';
		$ok        = openssl_sign( $source, $signature, $key, OPENSSL_ALGO_SHA256 );
		if ( ! $ok ) {
			throw new RuntimeException( 'Borica: openssl_sign failed' );
		}
		return strtoupper( bin2hex( $signature ) );
	}

	/**
	 * Verify P_SIGN on an APGW response. Never throws on a bad signature.
	 *
	 * @param array  $fields  Response fields, including P_SIGN.
	 * @param string $pub_pem BORICA's APGW public key or certificate.
	 * @return array {ok: bool, variant: string, source: string}
	 *               variant is 'canonical' (expected), 'rfu' (scheme moved —
	 *               raise an ops issue) or '' when nothing verified.
	 */
	public static function verify_response( array $fields, $pub_pem ) {
		$fail  = array( 'ok' => false, 'variant' => '', 'source' => '' );
		$psign = isset( $fields['P_SIGN'] ) ? preg_replace( '/\s+/', '', (string) $fields['P_SIGN'] ) : '';
		if ( '' === $psign || ! preg_match( '/^[0-9A-Fa-f]+$/', $psign ) || 0 !== strlen( $psign ) % 2 ) {
			return $fail;
		}
		$key = openssl_pkey_get_public( $pub_pem );
		if ( false === $key ) {
			return $fail;
		}
		$signature = hex2bin( $psign );
		$base      = self::mac_source( self::response_sign_fields(), $fields );
		foreach ( array( 'canonical' => $base, 'rfu' => $base . self::RFU ) as $variant => $source ) {
			// openssl_verify returns 1 valid, 0 invalid, -1 error. Only 1 counts.
			if ( 1 === openssl_verify( $source, $signature, $key, OPENSSL_ALGO_SHA256 ) ) {
				return array( 'ok' => true, 'variant' => $variant, 'source' => $source );
			}
		}
		$fail['source'] = $base;
		return $fail;
	}

	/* ------------------------------------------------------------------ */
	/* Field helpers                                                       */
	/* ------------------------------------------------------------------ */

	/** 16 unpredictable bytes as uppercase hex; unique per terminal per 24 h. */
	public static function new_nonce() {
		return strtoupper( bin2hex( random_bytes( 16 ) ) );
	}

	/** YYYYMMDDHHMMSS in UTC. The host clock must be NTP-synced. */
	public static function utc_timestamp( $when = null ) {
		return gmdate( 'YmdHis', null === $when ? time() : (int) $when );
	}

	/**
	 * Amount with a decimal point and exactly two decimals.
	 * Floats are refused: money must not round-trip through binary.
	 *
	 * @throws InvalidArgumentException
	 */
	public static function format_amount( $amount ) {
		if ( is_float( $amount ) ) {
			throw new InvalidArgumentException( 'Borica: pass amounts as string, never float' );
		}
		$text = trim( str_replace( array( ' ', ',' ), array( '', '.' ), (string) $amount ) );
		if ( ! preg_match( '/^\d+(\.\d+)?$/', $text ) ) {
			throw new InvalidArgumentException( 'Borica: invalid amount ' . $text );
		}
		$parts = explode( '.', $text );
		$whole = ltrim( $parts[0], '0' );
		$whole = '' === $whole ? '0' : $whole;
		$frac  = isset( $parts[1] ) ? $parts[1] : '';

		// Round half up on the string; money never touches a float here and
		// this needs no bcmath, which is not installed everywhere.
		$cents = $whole . str_pad( substr( $frac, 0, 2 ), 2, '0' );
		if ( strlen( $frac ) > 2 && $frac[2] >= '5' ) {
			$cents = self::increment_digits( $cents );
		}
		$cents = str_pad( $cents, 3, '0', STR_PAD_LEFT );
		$out   = substr( $cents, 0, -2 ) . '.' . substr( $cents, -2 );

		if ( '' === ltrim( $cents, '0' ) ) {
			throw new InvalidArgumentException( 'Borica: amount must be positive' );
		}
		return $out;
	}

	/** Add 1 to a decimal digit string, carrying. '099' -> '100'. */
	private static function increment_digits( $digits ) {
		$i = strlen( $digits ) - 1;
		while ( $i >= 0 ) {
			if ( '9' !== $digits[ $i ] ) {
				$digits[ $i ] = (string) ( (int) $digits[ $i ] + 1 );
				return $digits;
			}
			$digits[ $i ] = '0';
			$i--;
		}
		return '1' . $digits;
	}

	/** ORDER: exactly 6 digits, zero padded. Unique per terminal per 24 h. */
	public static function format_order( $order ) {
		$text = trim( (string) $order );
		if ( '' === $text || ! ctype_digit( $text ) || strlen( $text ) > 6 ) {
			throw new InvalidArgumentException( 'Borica: ORDER must be up to 6 digits, got ' . $text );
		}
		return str_pad( $text, 6, '0', STR_PAD_LEFT );
	}

	/**
	 * AD.CUST_BOR_ORDER_ID = ORDER + up to 16 Latin/digit chars, no ';'.
	 * This value travels in BORICA's financial files and is what the
	 * accountant reconciles the bank statement against.
	 */
	public static function bor_order_id( $order6, $suffix ) {
		$clean = preg_replace( '/[^0-9A-Za-z]/', '', self::latin( (string) $suffix, 64 ) );
		return $order6 . substr( $clean, 0, 16 );
	}

	/**
	 * Transliterate Bulgarian to Latin and clip; 3-DS v2 fields are Latin-only.
	 * The table is explicit per case because multi-character mappings
	 * (ц -> ts, щ -> sht) change the string length, so any position-based
	 * re-capitalisation corrupts the result. The Python twin uses the same table.
	 */
	public static function latin( $text, $limit ) {
		if ( '' === (string) $text ) {
			return '';
		}
		$map = array(
			'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e',
			'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l',
			'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's',
			'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch',
			'ш' => 'sh', 'щ' => 'sht', 'ъ' => 'a', 'ь' => 'y', 'ю' => 'yu', 'я' => 'ya',
			'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D', 'Е' => 'E',
			'Ж' => 'Zh', 'З' => 'Z', 'И' => 'I', 'Й' => 'Y', 'К' => 'K', 'Л' => 'L',
			'М' => 'M', 'Н' => 'N', 'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S',
			'Т' => 'T', 'У' => 'U', 'Ф' => 'F', 'Х' => 'H', 'Ц' => 'Ts', 'Ч' => 'Ch',
			'Ш' => 'Sh', 'Щ' => 'Sht', 'Ъ' => 'A', 'Ь' => 'Y', 'Ю' => 'Yu', 'Я' => 'Ya',
		);
		$out = strtr( (string) $text, $map );
		$out = preg_replace( '/[^\x20-\x7E]/', '', $out );
		$out = trim( preg_replace( '/\s+/', ' ', $out ) );
		return substr( $out, 0, (int) $limit );
	}

	/**
	 * Base64 of the EMV 3-DS v2 data set. BORICA marks M_INFO mandatory for
	 * Sale and Pre-authorisation; richer data means the issuer is likelier to
	 * authenticate frictionlessly, which raises conversion on the card path.
	 *
	 * @param array $args name, email, phone, bill_address, ship_address, force_challenge
	 */
	public static function m_info( array $args ) {
		$data = array();
		if ( ! empty( $args['force_challenge'] ) ) {
			$data['threeDSRequestorChallengeInd'] = '04';   // demand SCA
		}
		$name = self::latin( isset( $args['name'] ) ? $args['name'] : '', 45 );
		if ( '' !== $name ) {
			$data['cardholderName'] = $name;
		}
		if ( ! empty( $args['email'] ) ) {
			$data['email'] = substr( trim( $args['email'] ), 0, 254 );
		}
		$digits = preg_replace( '/\D/', '', isset( $args['phone'] ) ? $args['phone'] : '' );
		if ( '' !== $digits ) {
			if ( 0 === strpos( $digits, '00359' ) ) {
				$digits = substr( $digits, 5 );
			} elseif ( 0 === strpos( $digits, '359' ) ) {
				$digits = substr( $digits, 3 );
			} elseif ( 0 === strpos( $digits, '0' ) ) {
				$digits = substr( $digits, 1 );
			}
			if ( '' !== $digits ) {
				$data['mobilePhone'] = array( 'cc' => '359', 'subscriber' => $digits );
			}
		}
		$bill = self::latin( isset( $args['bill_address'] ) ? $args['bill_address'] : '', 50 );
		$ship = self::latin( isset( $args['ship_address'] ) ? $args['ship_address'] : '', 50 );
		if ( '' !== $bill ) {
			$data['billAddrLine1'] = $bill;
		}
		if ( '' !== $ship ) {
			$data['shipAddrLine1'] = $ship;
		}
		if ( empty( $data ) ) {
			return '';
		}
		return base64_encode( self::json( $data ) );
	}

	/* ------------------------------------------------------------------ */
	/* Response semantics                                                  */
	/* ------------------------------------------------------------------ */

	/**
	 * Interpret a VERIFIED APGW response.
	 *
	 * @return array {
	 *   state: 'paid'|'declined'|'pending',
	 *   final: bool,  action, rc, message, amount, rrn, int_ref, approval,
	 *   card, card_brand, eci, auth_step_res, cardholder_info
	 * }
	 * 'pending' means "not final yet — re-check with TRTYPE=90 after
	 * FINAL_AFTER_SECONDS". It is NOT a decline and must never be shown as one.
	 */
	public static function classify( array $f ) {
		$action = isset( $f['ACTION'] ) ? trim( (string) $f['ACTION'] ) : '';
		$rc     = isset( $f['RC'] ) ? trim( (string) $f['RC'] ) : '';

		if ( '0' === $action && '00' === $rc ) {
			$state = 'paid';
			$final = true;
		} elseif ( '' === $rc || '-' === substr( $rc, 0, 1 ) || '21' === $action ) {
			// APGW-side codes are provisional inside GUARDTIME; ACTION 21 is a
			// soft decline that APGW itself retries with SCA.
			$state = 'pending';
			$final = false;
		} else {
			$state = 'declined';
			$final = true;
		}

		$get = function ( $k ) use ( $f ) {
			return isset( $f[ $k ] ) ? trim( (string) $f[ $k ] ) : '';
		};
		$msg = $get( 'STATUSMSG' );
		return array(
			'state'           => $state,
			'final'           => $final,
			'action'          => $action,
			'rc'              => $rc,
			'message'         => '' !== $msg ? $msg : self::rc_text( $rc ),
			'amount'          => $get( 'AMOUNT' ),
			'rrn'             => $get( 'RRN' ),
			'int_ref'         => $get( 'INT_REF' ),
			'approval'        => $get( 'APPROVAL' ),
			'card'            => $get( 'CARD' ),
			'card_brand'      => $get( 'CARD_BRAND' ),
			'eci'             => $get( 'ECI' ),
			'auth_step_res'   => $get( 'AUTH_STEP_RES' ),
			// The spec is emphatic: text the issuer's ACS sent for the
			// cardholder MUST be displayed to them.
			'cardholder_info' => $get( 'CARDHOLDERINFO' ),
		);
	}

	/** Bulgarian text for an RC. Never empty. */
	public static function rc_text( $rc ) {
		$map = array(
			'00' => 'Успешна трансакция',
			'01' => 'Свържете се с издателя на картата',
			'04' => 'Картата е задържана',
			'05' => 'Отказана от издателя',
			'06' => 'Грешка',
			'12' => 'Невалидна трансакция',
			'13' => 'Невалидна сума',
			'14' => 'Няма такава карта',
			'15' => 'Няма такъв издател',
			'17' => 'Отказано от клиента',
			'30' => 'Грешка във формата',
			'41' => 'Изгубена карта',
			'43' => 'Открадната карта',
			'51' => 'Недостатъчна наличност',
			'54' => 'Изтекла карта',
			'55' => 'Грешен ПИН',
			'57' => 'Трансакцията не е разрешена за картодържателя',
			'58' => 'Терминалът не е активиран',
			'59' => 'Съмнение за измама',
			'62' => 'Ограничена карта',
			'65' => 'Изисква се засилена автентикация',
			'1A' => 'Изисква се засилена автентикация',
			'85' => 'Няма причина за отказ',
			'88' => 'Криптографска грешка',
			'89' => 'Неуспешна автентикация',
			'91' => 'Издателят е недостъпен',
			'95' => 'Трансакцията не е намерена',
			'96' => 'Системна грешка',
			'-1'  => 'Незапълнено задължително поле в заявката',
			'-2'  => 'Заявката съдържа поле с некоректно име',
			'-3'  => 'Авторизационният хост не отговаря',
			'-4'  => 'Няма връзка с авторизационния хост',
			'-5'  => 'Грешка във връзката с авторизационния хост',
			'-6'  => 'Грешка в конфигурацията на APGW',
			'-7'  => 'Неправилен формат на отговора от авторизационния хост',
			'-10' => 'Грешка в поле „Сума“',
			'-11' => 'Грешка в поле „Валута“',
			'-12' => 'Грешка в поле „Идентификатор на търговеца“',
			'-13' => 'Неправилен IP адрес на търговеца',
			'-15' => 'Грешка в поле RRN',
			'-16' => 'В момента се изпълнява друга трансакция на терминала',
			'-17' => 'Отказан достъп — грешка при проверка на P_SIGN',
			'-19' => 'Неуспешна автентикация на картодържателя',
			'-20' => 'Просрочена трансакция — разминаване във времето над 15 минути',
			'-21' => 'Трансакцията вече е изпълнена',
			'-22' => 'Невалидни данни за автентикация',
			'-23' => 'Невалиден контекст на трансакцията',
			'-24' => 'Несъответствие в данните на трансакцията',
			'-25' => 'Потвърждението е отказано от картодържателя',
			'-26' => 'Невалиден BIN на картата',
			'-27' => 'Невалидно име на търговеца',
			'-28' => 'Невалидно допълнително поле',
			'-29' => 'Невалиден отговор от ACS на издателя',
			'-30' => 'Трансакцията е отказана като измама',
			'-31' => 'Трансакцията е в процес на обработка',
			'-32' => 'Дублирана отказана трансакция',
			'-33' => 'Автентикацията на картодържателя е в процес',
			'-39' => 'Изчаква се потвърждение от картодържателя',
			'-40' => 'Трансакцията е в процес на обработка',
		);
		$rc = trim( (string) $rc );
		return isset( $map[ $rc ] ) ? $map[ $rc ] : ( 'Код ' . $rc );
	}

	/**
	 * @return array {authenticated: bool, text: string}
	 * ECI 05/06/07 are Visa (and Diners, Bcard, and all domestic traffic);
	 * 00/01/02 are Mastercard. The two sets do not collide.
	 */
	public static function eci_text( $eci ) {
		$map = array(
			'05' => array( true, 'Картодържател и издател са 3-D Secure; автентикацията е успешна' ),
			'06' => array( false, 'Картодържателят или издателят не е регистриран за 3-D Secure' ),
			'07' => array( false, 'Автентикацията е неуспешна или не е извършена' ),
			'02' => array( true, 'Картодържател и издател са 3-D Secure; автентикацията е успешна' ),
			'01' => array( false, 'Картодържателят или издателят не е регистриран за 3-D Secure' ),
			'00' => array( false, 'Автентикацията е неуспешна или не е извършена' ),
		);
		$eci = trim( (string) $eci );
		if ( ! isset( $map[ $eci ] ) ) {
			return array( 'authenticated' => false, 'text' => 'Няма данни за 3-D Secure автентикация' );
		}
		return array( 'authenticated' => $map[ $eci ][0], 'text' => $map[ $eci ][1] );
	}

	/** @return array {version: int, authenticated: bool, text: string} */
	public static function auth_step_text( $value ) {
		$map = array(
			'VERES_N' => array( 1, false, 'Картодържателят не участва в 3-D Secure' ),
			'VERES_U' => array( 1, false, 'Автентикацията не може да бъде извършена' ),
			'PARES_Y' => array( 1, true, 'Успешна автентикация' ),
			'PARES_A' => array( 1, true, 'Регистриран опит за автентикация' ),
			'PARES_N' => array( 1, false, 'Неуспешна автентикация' ),
			'PARES_U' => array( 1, false, 'Автентикацията не може да бъде извършена' ),
			'ARES_Y'  => array( 2, true, 'Успешна автентикация без предизвикателство' ),
			'ARES_N'  => array( 2, false, 'Отказана автентикация' ),
			'ARES_R'  => array( 2, false, 'Автентикацията е отхвърлена от издателя' ),
			'RREQ_Y'  => array( 2, true, 'Успешна автентикация със SCA' ),
			'RREQ_N'  => array( 2, false, 'Неуспешна автентикация със SCA' ),
			'RREQ_U'  => array( 2, false, 'Автентикацията не може да бъде извършена' ),
		);
		$key = strtoupper( trim( (string) $value ) );
		if ( ! isset( $map[ $key ] ) ) {
			return array( 'version' => 0, 'authenticated' => false, 'text' => 'Няма данни за автентикация' );
		}
		return array(
			'version'       => $map[ $key ][0],
			'authenticated' => $map[ $key ][1],
			'text'          => $map[ $key ][2],
		);
	}

	/** json_encode that keeps Cyrillic readable and never returns false silently. */
	private static function json( array $data ) {
		$out = json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		if ( false === $out ) {
			throw new RuntimeException( 'Borica: json_encode failed: ' . json_last_error_msg() );
		}
		return $out;
	}
}
