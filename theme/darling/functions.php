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
	$style = get_stylesheet_directory() . '/style.css';
	wp_enqueue_style(
		'darling',
		get_stylesheet_uri(),
		array( 'twentytwentyfive-style' ),
		file_exists( $style ) ? filemtime( $style ) : null // cache-bust on deploy
	);

	// The Shopify theme's stylesheet, ported verbatim rather than rewritten. It
	// carries the --d-* tokens AND the bespoke animations (ambient stars, star
	// twinkle, bow float, gradient drift, shimmer). Reimplementing those by eye
	// would drift from the original; keeping the file intact means the storefront
	// matches, and a future diff against a fresh capture shows exactly what moved.
	$ported = get_stylesheet_directory() . '/assets/darling.css';
	if ( file_exists( $ported ) ) {
		wp_enqueue_style(
			'darling-ported',
			get_stylesheet_directory_uri() . '/assets/darling.css',
			array( 'darling' ),
			filemtime( $ported )
		);
	}

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
}, 20 );

/**
 * Remove the stock theme's "Designed with WordPress" credit.
 *
 * Twenty Twenty-Five puts it in a footer template part, so there is no filter to
 * unhook — it has to be hidden. Doing it in CSS rather than by overriding the
 * whole footer template keeps us on the parent theme's markup, so parent updates
 * still reach us.
 */
add_action( 'wp_head', function () {
	echo '<style id="darling-inline">'
	   . '.wp-block-site-tagline + .wp-block-paragraph a[href*="wordpress.org"],'
	   . 'footer .wp-block-paragraph a[href*="wordpress.org"]{display:none}'
	   . '</style>';
}, 100 );

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
