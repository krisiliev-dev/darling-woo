/**
 * Keep the DISPLAYED shipping prices in step with the chosen payment method.
 *
 * The server re-prices correctly on every switch (gate-proven: exact panel
 * matrix both directions). WooCommerce Blocks, however, was observed updating
 * the rendered shipping options only on the FIRST price-changing switch —
 * subsequent switches left stale prices on screen until an unrelated cart
 * update. Charged totals were always correct (submission recalculates); this
 * closes the display half of the old re-pricing bug.
 *
 * Mechanism: watch the payment data store's active method; on a real switch,
 * invalidate the cart store's resolution so Blocks refetches
 * /wc/store/v1/cart, which carries the re-priced rates for the new method.
 * Two staggered invalidations bracket the calc-totals round-trip so the
 * refetch cannot race the session update.
 */
(function () {
	if ( ! window.wp || ! wp.data || ! wp.data.subscribe ) {
		return;
	}
	var last = null;

	function refetchCart() {
		var d = wp.data.dispatch( 'wc/store/cart' );
		if ( d && d.invalidateResolutionForStore ) {
			d.invalidateResolutionForStore();
		}
	}

	wp.data.subscribe( function () {
		var pay = wp.data.select( 'wc/store/payment' );
		if ( ! pay || ! pay.getActivePaymentMethod ) {
			return;
		}
		var pm = pay.getActivePaymentMethod();
		if ( ! pm || pm === last ) {
			return;
		}
		var isFirst = ( last === null );
		last = pm;
		if ( isFirst ) {
			return; // initial hydration, not a customer switch
		}
		setTimeout( refetchCart, 700 );
		setTimeout( refetchCart, 2600 );
	} );
})();
