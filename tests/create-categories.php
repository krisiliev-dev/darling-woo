<?php
/**
 * Create the product categories the navigation links to.
 *
 * Slugs are taken from the live Shopify collection URLs, so the eventual 301 map
 * is a straight /collections/<slug> -> /product-category/<slug>/ rewrite rather
 * than a per-product lookup table. Creating them now also means the catalogue
 * import attaches products to existing terms instead of inventing its own.
 */
$cats = array(
	'za-kuhnyata'        => 'За кухнята',
	'za-banyata'         => 'За банята',
	'dekoraciya-za-doma' => 'Декорация за дома',
	'za-gradinata'       => 'За градината',
	'pochistvane'        => 'Почистване',
	'parti'              => 'Парти и празници',
	'za-decata'          => 'За децата',
	'podaraci'           => 'Подаръци',
	'izborat-na-lady-d'  => 'Изборът на Lady D',
	'promocii'           => 'Промоции',
);
foreach ( $cats as $slug => $name ) {
	if ( term_exists( $slug, 'product_cat' ) ) { printf( "  %-20s exists\n", $slug ); continue; }
	$t = wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) );
	printf( "  %-20s %s\n", $slug, is_wp_error( $t ) ? 'FAILED: ' . $t->get_error_message() : 'created' );
}
