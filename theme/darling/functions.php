<?php
/**
 * Дарлинг theme functions.
 *
 * Kept deliberately small: presentation lives in style.css / theme.json, and
 * storefront behaviour (courier office picker, VAT invoice, GPSR) belongs in
 * the darling-checkout PLUGIN, not here — so switching or updating the theme
 * can never take checkout logic down with it.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_enqueue_scripts', function () {
	/*
	 * LOAD ORDER (slice 2a, 2026-08-06). The ported Shopify stylesheet prints
	 * FIRST and style.css prints last, so the theme wins every equal-specificity
	 * conflict with it. It used to be the exact inverse — 'darling-ported'
	 * declared 'darling' as its dependency — and every "SLICE n fix" block in
	 * style.css was a downstream symptom of that one inverted line.
	 *
	 * Both files stay UNLAYERED, deliberately. Slice 2 tried wrapping the ported
	 * file in `@layer ported` and had to be reverted: unlayered CSS outranks
	 * every layer, so layering it dropped the vendored file below Twenty
	 * Twenty-Five's own unlayered stylesheet, which it had been beating by
	 * source order. Mobile went from 16 to 45 defects with document-level
	 * overflow. Cascade layers are only safe here once the parent theme's
	 * contribution is neutralised — that is slice 3's job, not this one.
	 */
	$ported = get_stylesheet_directory() . '/assets/darling.css';
	if ( file_exists( $ported ) ) {
		wp_enqueue_style(
			'darling-ported',
			get_stylesheet_directory_uri() . '/assets/darling.css',
			array( 'twentytwentyfive-style' ),
			filemtime( $ported )
		);
	}

	$style = get_stylesheet_directory() . '/style.css';
	wp_enqueue_style(
		'darling',
		get_stylesheet_uri(),
		array( 'darling-ported' ),
		file_exists( $style ) ? filemtime( $style ) : null // cache-bust on deploy
	);

	$hdr = get_stylesheet_directory() . '/assets/header.js';
	if ( file_exists( $hdr ) ) {
		wp_enqueue_script(
			'darling-header',
			get_stylesheet_directory_uri() . '/assets/header.js',
			array(),
			filemtime( $hdr ),
			true
		);
	}

	$amb = get_stylesheet_directory() . '/assets/ambient.js';
	if ( file_exists( $amb ) ) {
		wp_enqueue_script(
			'darling-ambient',
			get_stylesheet_directory_uri() . '/assets/ambient.js',
			array(),
			filemtime( $amb ),
			true
		);
	}

	/*
	 * O-5. Enqueued here rather than in the plugin because it is presentation:
	 * it decides what a card LOOKS like when its photo is missing, and takes
	 * nothing down if the theme is switched. No dependency — it only ever reads
	 * <img> state, so it must not wait on anything.
	 */
	$imf = get_stylesheet_directory() . '/assets/img-fallback.js';
	if ( file_exists( $imf ) ) {
		wp_enqueue_script(
			'darling-img-fallback',
			get_stylesheet_directory_uri() . '/assets/img-fallback.js',
			array(),
			filemtime( $imf ),
			true
		);
	}
}, 20 );

/**
 * The stock "Designed with WordPress" credit is gone because we now ship our own
 * parts/footer.html, which replaces the parent theme's footer entirely. The
 * earlier CSS patch only hid the LINK and left the words "Designed with" behind —
 * a reminder that hiding part of something is not removing it.
 */

add_action( 'after_setup_theme', function () {
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
} );

/**
 * Bulgarian address format: postcode precedes the city.
 */
add_filter( 'woocommerce_localisation_address_formats', function ( $formats ) {
	$formats['BG'] = "{name}\n{company}\n{address_1}\n{address_2}\n{postcode} {city}\n{country}";
	return $formats;
} );

/**
 * A search with exactly one hit shows the results page, as on the Shopify site,
 * instead of WooCommerce's default redirect straight to the product. The
 * customer searched — show them what the search found, with the count.
 */
add_filter( 'woocommerce_redirect_single_search_result', '__return_false' );

/**
 * Result-count phrasing to match the live site: „1 артикул" / „N артикула"
 * instead of core's verbose „Показване на единствения резултат". Scoped to the
 * woocommerce text domain and exactly these source strings, so nothing else
 * shifts meaning.
 */
add_filter( 'gettext', function ( $translation, $text, $domain ) {
	if ( 'woocommerce' !== $domain ) {
		return $translation;
	}
	if ( 'Showing the single result' === $text ) {
		return '1 артикул';
	}
	if ( 'Showing all %d results' === $text ) {
		return '%d артикула';
	}
	if ( 'Showing %1$d–%2$d of %3$d results' === $text ) {
		return '%1$d–%2$d от %3$d артикула';
	}
	return $translation;
}, 10, 3 );

/**
 * My Account: no „Изтегляния". We sell physical goods only — the tab is noise,
 * and an empty downloads screen reads as something broken. Menu item removed
 * here; the endpoint itself is disabled via the option (set to '') so a typed
 * /my-account/downloads/ URL falls through to the dashboard instead of
 * rendering an orphaned page.
 */
add_filter( 'woocommerce_account_menu_items', function ( $items ) {
	unset( $items['downloads'] );
	return $items;
} );

/**
 * Dual currency for the blocks cart page. The PHP price filters cover
 * server-rendered prices; the cart block renders client-side from Store API
 * JSON, so it gets its лв. companion from a small watcher script instead.
 * Loaded only where the cart block exists.
 */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! function_exists( 'is_cart' ) || ! is_cart() ) {
		return;
	}
	$src = get_stylesheet_directory() . '/assets/cart-dual.js';
	if ( file_exists( $src ) ) {
		wp_enqueue_script(
			'darling-cart-dual',
			get_stylesheet_directory_uri() . '/assets/cart-dual.js',
			array(),
			filemtime( $src ),
			true
		);
	}
}, 20 );

/**
 * Social login buttons on the My Account forms. Nextend FREE only hooks
 * wp-login.php — its WooCommerce form integration is a Pro feature — but the
 * [nextend_social_login] shortcode ships in free and renders the same buttons.
 * It outputs nothing while no provider is enabled, so this stays honest-dark
 * if providers are ever turned off.
 */
add_action( 'woocommerce_login_form_end', function () {
	echo do_shortcode( '[nextend_social_login]' );
} );
add_action( 'woocommerce_register_form_end', function () {
	echo do_shortcode( '[nextend_social_login]' );
} );

/**
 * Bulgarian for blocks-checkout strings the upstream pack misses. Header, not
 * footer: the i18n.gettext filter must exist before React hydrates the blocks.
 */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! function_exists( 'is_checkout' ) || ( ! is_checkout() && ! is_cart() ) ) {
		return;
	}
	$src = get_stylesheet_directory() . '/assets/checkout-i18n.js';
	if ( file_exists( $src ) ) {
		wp_enqueue_script(
			'darling-checkout-i18n',
			get_stylesheet_directory_uri() . '/assets/checkout-i18n.js',
			array( 'wp-hooks', 'wp-i18n' ),
			filemtime( $src ),
			false // header on purpose
		);
	}
}, 20 );

/**
 * The Bulgarian address form's state label ships from server-side country
 * locale data (not JS gettext) as „Щат/Област" — no Bulgarian address has a
 * „щат". Plain „Област", still optional.
 */
add_filter( 'woocommerce_get_country_locale', function ( $locale ) {
	$locale['BG']['state']['label']    = 'Област';
	$locale['BG']['state']['required'] = false;
	return $locale;
} );

/**
 * Last two checkout strings: these reach the blocks as SERVER-rendered
 * settings JSON (asset data registry), so the JS i18n hook never sees them —
 * PHP gettext does. Scoped to the exact source strings.
 */
add_filter( 'gettext', function ( $translation, $text, $domain ) {
	if ( 'woocommerce' !== $domain ) {
		return $translation;
	}
	if ( 'Phone (optional)' === $text ) {
		return 'Телефон (по избор)';
	}
	if ( 'Express Checkout' === $text ) {
		return 'Бързо плащане';
	}
	return $translation;
}, 10, 3 );

/**
 * „Express Checkout" comes from the Stripe gateway's own text domain, not
 * woocommerce's. Exact-string match, domain-agnostic — the phrase doesn't
 * appear anywhere it shouldn't be Bulgarian.
 */
add_filter( 'gettext', function ( $translation, $text ) {
	return 'Express Checkout' === $text ? 'Бързо плащане' : $translation;
}, 10, 2 );
