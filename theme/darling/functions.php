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
}, 20 );

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
