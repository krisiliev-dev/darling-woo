<?php
/**
 * Export real orders as connector fixtures, so another session can validate its
 * mapper against orders this system actually produced rather than against
 * fixtures invented from a spec. Test orders only — no real customer data.
 */
$out = array();
foreach ( array( 13, 15, 16 ) as $id ) {
    $o = wc_get_order( $id );
    if ( ! $o ) { continue; }
    $meta = array();
    foreach ( $o->get_meta_data() as $m ) {
        $d = $m->get_data();
        if ( strpos( $d['key'], 'darling' ) === 0 || strpos( $d['key'], '_wc_other' ) === 0 ) {
            $meta[ $d['key'] ] = is_scalar( $d['value'] ) ? $d['value'] : json_encode( $d['value'] );
        }
    }
    $ship = array();
    foreach ( $o->get_items( 'shipping' ) as $i ) {
        $sm = array();
        foreach ( $i->get_meta_data() as $m ) { $d = $m->get_data(); $sm[ $d['key'] ] = $d['value']; }
        $ship[] = array( 'name' => $i->get_name(), 'total' => $i->get_total(), 'meta' => $sm );
    }
    $lines = array();
    foreach ( $o->get_items() as $i ) {
        $p = $i->get_product();
        $lines[] = array( 'name' => $i->get_name(), 'qty' => $i->get_quantity(),
                          'sku' => $p ? $p->get_sku() : null, 'total' => $i->get_total() );
    }
    $out[ $id ] = array(
        'id' => $o->get_id(), 'status' => $o->get_status(), 'currency' => $o->get_currency(),
        'total' => $o->get_total(), 'shipping_total' => $o->get_shipping_total(),
        'payment_method' => $o->get_payment_method(), 'transaction_id' => $o->get_transaction_id(),
        'is_paid' => $o->is_paid(), 'date_created' => $o->get_date_created()->date('c'),
        'billing' => $o->get_address('billing'), 'shipping' => $o->get_address('shipping'),
        'darling_meta' => $meta, 'shipping_lines' => $ship, 'line_items' => $lines,
    );
}
echo json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ), "\n";
