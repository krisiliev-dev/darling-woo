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
	 * CUTOVER, PART TWO - THE TWO LEGACY SHEETS ARE GONE FROM THE PAGE.
	 *
	 * What used to be here enqueued 'darling-ported' (assets/darling.css, the
	 * ported Shopify stylesheet) and 'darling' (style.css, 135 KB of tokens and
	 * components), both UNLAYERED and both ahead of the design system.
	 *
	 * That ordering could never work, and part one said so before it was
	 * measured: unlayered CSS outranks every cascade layer regardless of
	 * specificity, and almost all of src/ is layered. Measured on the live home
	 * page afterwards, with darling.build.css loading correctly:
	 *
	 *   a { color: var(--d-cherry-deep) }   style.css   UNLAYERED   -> won
	 *   a { color: inherit }                base layer              -> lost
	 *   .d-btn { background: var(--btn-bg) }  style.css UNLAYERED   -> won
	 *   .d-btn { background: var(--action) }  patterns layer        -> lost
	 *
	 * Every link on the site was cherry and the hero call to action was crimson,
	 * with our rules present, matching, and underneath. The owner reviewing the
	 * live page read it as "our colours are wrong" - they were not wrong, they
	 * were not reaching the page.
	 *
	 * Slice 2 tried the gentler version of this - wrap the ported sheet in
	 * `@layer ported` - and reverted it, because layering dropped it below Twenty
	 * Twenty-Five's own unlayered stylesheet and mobile went from 16 defects to
	 * 45. That reason has expired: measured 2026-08-10, the parent theme's
	 * stylesheet is NOT among the sheets the live page loads. There is nothing
	 * left for a layered legacy sheet to fall below - and the owner asked for the
	 * files gone rather than demoted, so they are archived outside theme/ where
	 * the deploy rsync cannot reach them.
	 *
	 * style.css still EXISTS, because WordPress reads the theme header out of it.
	 * It contains that header and an explanation, and nothing enqueues it.
	 */
	$build = get_stylesheet_directory() . '/darling.build.css';
	if ( file_exists( $build ) ) {
		wp_enqueue_style(
			'darling-system',
			get_stylesheet_directory_uri() . '/darling.build.css',
			array(),
			filemtime( $build )
		);
	}
	/*
	 * *** THE DESIGN SYSTEM'S OWN SCRIPT WAS NEVER ENQUEUED. ***
	 *
	 * assets/darling-ui.js is, by its own header, "the only script the design
	 * system has". It publishes numbers the stylesheet cannot compute: the
	 * slider fill, the scrollbar thumb length, the scroll clock behind --sc-pos,
	 * and the tab underline geometry - and it drives the search field's wipe,
	 * .d-wipe__input / .d-wipe__clear.
	 *
	 * It was the ONLY script in assets/ written entirely in the d- vocabulary,
	 * and the only one this file never asked for. The owner reported it as "the
	 * search bar doesn't have its animation"; the file was on the box the whole
	 * time, next to five scripts that were enqueued.
	 *
	 * Everything it does degrades to nothing rather than to broken, which is why
	 * its absence read as a missing flourish instead of an error.
	 */
	$ui = get_stylesheet_directory() . '/assets/darling-ui.js';
	if ( file_exists( $ui ) ) {
		wp_enqueue_script(
			'darling-ui',
			get_stylesheet_directory_uri() . '/assets/darling-ui.js',
			array(),
			filemtime( $ui ),
			true
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

	/*
	 * Category carousel controls. Injected by script rather than written into
	 * front-page.html because that markup is rebuilt when the taxonomy category
	 * feed lands; the buttons must survive that.
	 */
	$car = get_stylesheet_directory() . '/assets/carousel.js';
	if ( file_exists( $car ) ) {
		wp_enqueue_script(
			'darling-carousel',
			get_stylesheet_directory_uri() . '/assets/carousel.js',
			array(),
			filemtime( $car ),
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
 *
 * The buttons render in ENGLISH on a Bulgarian-only storefront - measured live:
 * "Continue with Facebook" / "Continue with Google", in both the visible label and
 * the aria-label, with the provider name wrapped in <b> in the aria-label only.
 *
 * Translated on the OUTPUT rather than through a gettext filter on purpose: the label
 * comes out of Nextend's own catalogue and I could not verify the source string without
 * guessing at its text domain. A string replace on the rendered markup is honest about
 * what it knows - and if Nextend ever changes the wording, this no-ops and the button
 * stays English rather than breaking.
 */
function darling_nsl_bg( $html ) {
	return str_replace(
		// The aria-label wraps the provider in <b>; the prefix is the same string, so
		// two entries cover both. A third 'Continue with <b>' pair would be dead:
		// str_replace walks the array in order and the prefix has already matched.
		array( 'Continue with ', 'Sign in with ' ),
		array( 'Продължи с ', 'Влез с ' ),
		$html
	);
}
add_action( 'woocommerce_login_form_end', function () {
	echo darling_nsl_bg( do_shortcode( '[nextend_social_login]' ) );
} );
add_action( 'woocommerce_register_form_end', function () {
	echo darling_nsl_bg( do_shortcode( '[nextend_social_login]' ) );
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

/**
 * The order-received page should only be reachable BY an order.
 *
 * Measured sprint 76: /checkout/order-received/ returns 200 to anyone and renders the
 * confirmation template with a generic "check your email" fallback. No order data leaks
 * (no order number, no overview), so this is not a disclosure fix - it is that a bare
 * confirmation page is a dead end nobody should land on.
 *
 * DELIBERATELY NARROW. This fires ONLY when the endpoint carries no order id at all.
 * Every real post-purchase URL is /checkout/order-received/<id>/?key=wc_order_..., and
 * those are left entirely to WooCommerce own key validation, untouched. Guarding on the
 * key as well would put a redirect in the path of a customer returning from a payment
 * provider, and Stripe went live today - that is not a risk worth taking to tidy up a
 * page nobody reaches on purpose.
 */
add_action( 'template_redirect', function () {
	if ( ! function_exists( 'is_order_received_page' ) || ! is_order_received_page() ) {
		return;
	}
	// get_query_var is empty for the bare endpoint and numeric for every real order URL.
	if ( absint( get_query_var( 'order-received' ) ) > 0 ) {
		return;
	}
	$shop = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : '';
	wp_safe_redirect( $shop ? $shop : home_url( '/' ), 302 );
	exit;
} );

/**
 * *** THE CARD FIELDS ARE THE ONE PLACE IN THE SYSTEM A STYLESHEET CANNOT
 * REACH. *** They live in a cross-origin iframe on js.stripe.com. Stripe's only
 * styling surface is an `appearance` object handed to Elements in JavaScript.
 *
 * Measured on the live checkout, before this existed:
 *   wc_stripe_upe_params is a real global (localised on wc-stripe-upe-classic)
 *   and it has NO `blocksAppearance` key.
 *
 * Read out of the plugin's own built JS (build/upe-blocks.js) rather than from
 * documentation for some other version:
 *
 *     const key = isBlocks ? 'blocksAppearance' : 'appearance';
 *     const given = wc_stripe_upe_params?.[key];
 *     if (given) return given;              // <- ours, used verbatim
 *     ...                                    // otherwise SAMPLE THE PAGE
 *
 * That fallback is why the card fields look like a near-miss of our theme: the
 * plugin walks the DOM with getComputedStyle, finds some input, and copies it.
 * A near-miss is worse than a mismatch, because it reads as a rendering fault.
 *
 * assets/stripe-appearance.js is GENERATED from tokens.resolved.json by
 * scripts/gen-stripe-appearance.js, so the day --edge-field moves, the three
 * fields that take the money move with every other field on the page.
 *
 * Attached to the handle that CREATES the global, after it, so there is
 * something to assign to; the blocks bundle reads it later, at mount.
 *
 * *** NOT YET PROVEN AGAINST A REAL PAYMENT. *** It is proven to reach inside
 * the iframe - injected at document-start in a browser, the card fields took
 * our radius, edge, ink and labels - but no test-mode order has been placed
 * through it. Do that before this ships, per WOO_SURFACE_INVENTORY.
 */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! function_exists( 'is_checkout' ) || ( ! is_checkout() && ! is_cart() ) ) {
		return;
	}
	$src = get_stylesheet_directory() . '/assets/stripe-appearance.js';
	if ( ! file_exists( $src ) ) {
		return;
	}
	$appearance = file_get_contents( $src );
	if ( false === $appearance ) {
		return;
	}
	// Both keys: the blocks checkout reads blocksAppearance, the classic one
	// reads appearance, and this theme has to survive either being the live
	// checkout. Guarded, because the plugin may be deactivated.
	$assign = $appearance . "\n"
		. "if (typeof window.wc_stripe_upe_params === 'object' && window.wc_stripe_upe_params) {\n"
		. "\twindow.wc_stripe_upe_params.blocksAppearance = window.darlingStripeAppearance;\n"
		. "\twindow.wc_stripe_upe_params.appearance = window.darlingStripeAppearance;\n"
		. "}\n";

	foreach ( array( 'wc-stripe-upe-classic', 'wc-stripe-blocks-integration' ) as $handle ) {
		if ( wp_script_is( $handle, 'registered' ) || wp_script_is( $handle, 'enqueued' ) ) {
			wp_add_inline_script( $handle, $assign, 'after' );
		}
	}
}, 30 );
