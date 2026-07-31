<?php
/**
 * Dump the exact WooCommerce REST representation of an order.
 *
 * Uses rest_do_request rather than an HTTP call, so we get the byte-for-byte wire
 * shape the connector will parse WITHOUT creating an API key that then has to
 * live somewhere. The point is to remove the last unverified link in the
 * connector's mapper — its field NAMES — so a re-shaped export will not do.
 */
wp_set_current_user( 1 );
$req = new WP_REST_Request( 'GET', '/wc/v3/orders/15' );
$res = rest_do_request( $req );
if ( $res->is_error() ) {
    echo json_encode( array( 'error' => $res->as_error()->get_error_message() ) ), "\n";
    return;
}
echo json_encode( $res->get_data(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ), "\n";
