<?php
/**
 * "Which couriers are actually live?" — visible in WooCommerce → Status.
 *
 * Carriers under contract but not yet provisioned on the panel are deliberately
 * invisible at checkout. That is the right behaviour, but silent: without this
 * page the only way to know why BOX NOW is not being offered is to read the code.
 * So the state is shown, with the reason, and a way to re-check on demand.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Carrier_Status {

	public static function init(): void {
		add_action( 'woocommerce_system_status_report', array( __CLASS__, 'render' ) );
		add_action( 'admin_post_darling_recheck_carriers', array( __CLASS__, 'recheck' ) );
	}

	/** Forget every probe result, so a newly-provisioned carrier appears at once. */
	public static function recheck(): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'Недостатъчни права.', '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'darling_recheck_carriers' );

		foreach ( array_keys( Darling_Carriers::all() ) as $id ) {
			delete_transient( 'darling_papi_sup_' . $id );
		}
		wp_safe_redirect( admin_url( 'admin.php?page=wc-status&darling_rechecked=1' ) );
		exit;
	}

	public static function render(): void {
		$configured = Darling_Panel_API::configured();
		?>
		<table class="wc_status_table widefat" cellspacing="0">
			<thead>
				<tr><th colspan="3" data-export-label="Дарлинг — куриери">
					<h2>Дарлинг — куриери
						<?php if ( $configured ) : ?>
							<a class="button button-small" style="float:right"
							   href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=darling_recheck_carriers' ), 'darling_recheck_carriers' ) ); ?>">
								Провери отново
							</a>
						<?php endif; ?>
					</h2>
				</th></tr>
			</thead>
			<tbody>
			<?php if ( ! $configured ) : ?>
				<tr><td colspan="3">
					<mark class="error">Панелът не е конфигуриран</mark> —
					липсва DARLING_PANEL_URL / DARLING_PANEL_TOKEN.
				</td></tr>
			<?php else : ?>
				<?php foreach ( Darling_Carriers::all() as $id => $cfg ) :
					$live = Darling_Panel_API::supports( $id ); ?>
					<tr>
						<td><?php echo esc_html( $cfg['label'] ); ?></td>
						<td class="help"><?php echo esc_html( $cfg['office_label'] . ( $cfg['door'] ? ' + до адрес' : ' (само автомати)' ) ); ?></td>
						<td>
							<?php if ( $live ) : ?>
								<mark class="yes">✔ активен</mark>
							<?php else : ?>
								<mark class="no">— чака достъп в панела</mark>
								<span class="help">Методът е регистриран и ще заработи автоматично,
								без промяна по кода, щом панелът може да го обслужва.</span>
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
			<?php endif; ?>
			</tbody>
		</table>
		<?php
	}
}
