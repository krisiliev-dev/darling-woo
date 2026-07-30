<?php
/**
 * Plugin Name:       Дарлинг — Checkout
 * Description:       Дарлинг storefront logic: EUR/BGN dual display, B2B фактура fields, GPSR. Built block-native and driven by our own panel API.
 * Version:           1.0.0
 * Requires at least: 6.7
 * Requires PHP:      8.1
 * Requires Plugins:  woocommerce
 * WC requires at least: 9.4
 * WC tested up to:   10.9
 * Text Domain:       darling-checkout
 * License:           GPL-2.0-or-later
 *
 * Deliberately a PLUGIN, not theme code: checkout behaviour must survive a
 * theme change. And deliberately block-native — the classic shortcode checkout
 * is being deprecated, and the Bulgarian courier plugins are all tied to it.
 */

defined( 'ABSPATH' ) || exit;

define( 'DARLING_CHECKOUT_VERSION', '1.0.0' );
define( 'DARLING_CHECKOUT_PATH', plugin_dir_path( __FILE__ ) );

/**
 * Declare compatibility BEFORE WooCommerce boots its feature checks.
 * Without these, WooCommerce flags the plugin as incompatible and can disable
 * HPOS/blocks — silently degrading the store rather than erroring.
 */
add_action( 'before_woocommerce_init', function () {
	if ( ! class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		return;
	}
	\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
	\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
} );

// Fail loudly rather than fatally if WooCommerce is missing.
add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p><strong>Дарлинг — Checkout</strong> изисква WooCommerce.</p></div>';
		} );
		return;
	}

	require_once DARLING_CHECKOUT_PATH . 'includes/class-currency.php';
	require_once DARLING_CHECKOUT_PATH . 'includes/class-invoice-fields.php';
	require_once DARLING_CHECKOUT_PATH . 'includes/class-gpsr.php';

	Darling_Currency::init();
	Darling_Invoice_Fields::init();
	Darling_GPSR::init();
} );
