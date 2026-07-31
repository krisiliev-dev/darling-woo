<?php
/**
 * Create one order while the panel is unreachable, so the connector has a REAL
 * darling_fallback="yes" fixture instead of a hand-crafted guess.
 *
 * The fallback path is the one guard with no example behind it, and "no example"
 * is exactly the situation the empty-office-id bug came out of.
 */
if ( ! did_action( 'woocommerce_load_cart_from_session' ) ) { wc_load_cart(); }
WC()->cart->empty_cart();
$p = wc_get_products( array( 'limit' => 1, 'status' => 'publish' ) );
WC()->cart->add_to_cart( $p[0]->get_id() );

WC()->customer->set_shipping_country( 'BG' );
WC()->customer->set_shipping_state( 'BG-04' );
WC()->customer->set_shipping_city( 'Свищов' );
WC()->customer->set_shipping_postcode( '5250' );
WC()->session->set( 'chosen_payment_method', 'cod' );

WC()->cart->calculate_shipping();
WC()->cart->calculate_totals();

$rate = null;
foreach ( WC()->shipping()->get_packages() as $pk ) {
	foreach ( $pk['rates'] as $id => $r ) {
		if ( 0 === strpos( $id, 'darling_econt:door' ) ) { $rate = $r; break 2; }
	}
}
if ( ! $rate ) { echo "  no econt door rate produced\n"; return; }
$fb = $rate->get_meta_data()['darling_fallback'] ?? '';
printf( "  rate %s = %.2f  fallback=%s\n", $rate->get_id(), $rate->get_cost(), $fb ?: '(none)' );
if ( 'yes' !== $fb ) { echo "  NOT a fallback rate - refusing to create a misleading fixture\n"; return; }

WC()->session->set( 'chosen_shipping_methods', array( $rate->get_id() ) );
WC()->cart->calculate_totals();

$order = wc_create_order();
foreach ( WC()->cart->get_cart() as $item ) {
	$order->add_product( $item['data'], $item['quantity'] );
}
$addr = array(
	'first_name' => 'Тест', 'last_name' => 'Резервна',
	'address_1' => 'ул. Цар Освободител 1', 'city' => 'Свищов',
	'state' => 'BG-04', 'postcode' => '5250', 'country' => 'BG',
	'email' => 'wootest@example.com', 'phone' => '0888123456',
);
$order->set_address( $addr, 'billing' );
$order->set_address( $addr, 'shipping' );

$item = new WC_Order_Item_Shipping();
$item->set_method_title( $rate->get_label() );
$item->set_method_id( $rate->get_method_id() );
$item->set_total( $rate->get_cost() );
foreach ( $rate->get_meta_data() as $k => $v ) { $item->add_meta_data( $k, $v, true ); }
$order->add_item( $item );

$order->set_payment_method( 'cod' );
$order->set_currency( 'EUR' );
$order->update_meta_data( 'darling_dest', 'door' );
$order->update_meta_data( 'darling_carrier', 'econt' );
$order->update_meta_data( 'darling_city', 'Свищов' );
$order->calculate_totals();
$order->set_status( 'processing' );
$order->save();
printf( "  created order %d total %.2f shipping %.2f\n", $order->get_id(), $order->get_total(), $order->get_shipping_total() );
