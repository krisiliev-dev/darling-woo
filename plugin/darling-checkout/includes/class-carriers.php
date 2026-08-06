<?php
/**
 * Carrier registry.
 *
 * Adding a courier is a config entry here, not a new class — and a carrier stays
 * dark until the panel can actually serve it. That means credentials can be
 * dropped in later with NO code change: the moment the panel answers for
 * `boxnow`, the storefront starts offering it.
 *
 * The alternative (hard-coding two carriers) would have meant a code change,
 * review and deploy for every contract signed.
 */

defined( 'ABSPATH' ) || exit;

class Darling_Carriers {

	/**
	 * `office_label` matters: BOX NOW and Sameday deliver to automated LOCKERS,
	 * not staffed offices. Calling a locker an "офис" in checkout would be simply
	 * wrong, and customers turn up at the wrong kind of place.
	 */
	private const REGISTRY = array(
		'econt' => array(
			'label'        => 'Еконт',
			'office_label' => 'до офис',
			'door'         => true,
		),
		'speedy' => array(
			'label'        => 'Спиди',
			'office_label' => 'до офис',
			'door'         => true,
		),
		'boxnow' => array(
			'label'        => 'BOX NOW',
			'office_label' => 'до автомат',
			'door'         => false, // lockers only
		),
		'sameday' => array(
			'label'        => 'Sameday',
			'office_label' => 'до автомат (easybox)',
			'door'         => true,
		),
		'pigeon' => array(
			'label'        => 'Pigeon Express',
			'office_label' => 'до офис',
			'door'         => true,
		),
		'evropat' => array(
			'label'        => 'Европът',
			'office_label' => 'до офис',
			'door'         => true,
		),
	);

	/**
	 * *** MODES THAT MEAN THE PARCEL WAITS AT A COURIER LOCATION. ***
	 * The customer must name WHICH one, so these are the modes that require an
	 * office id, offer the picker, and validate against the destination.
	 *
	 * BoxNow's rate row says `locker`, not `office`. The storefront read only
	 * `office` and `door`, so that row was silently DROPPED: the carrier would
	 * stay invisible at checkout while the panel showed its rate as enabled, and
	 * it would read as "the storefront picker is broken". Confirmed by the panel
	 * on 2026-08-06 - mode string is "locker", buffer 0.10, COD fee 0.
	 *
	 * Every pickup mode belongs HERE and nowhere else. A second list somewhere
	 * that forgets one is exactly how this stayed invisible.
	 */
	private const PICKUP_MODES = array( 'office', 'locker' );

	/** @return string[] */
	public static function pickup_modes(): array {
		return self::PICKUP_MODES;
	}

	/** Does this rate mode need a location id from the customer? */
	public static function is_pickup( string $mode ): bool {
		return in_array( strtolower( trim( $mode ) ), self::PICKUP_MODES, true );
	}

	/** Regex fragment covering every mode a darling rate id can carry. */
	public static function mode_pattern(): string {
		return implode( '|', array_map( 'preg_quote', array_merge( self::PICKUP_MODES, array( 'door' ) ) ) );
	}

	/** @return array<string,array> every carrier we know how to speak to */
	public static function all(): array {
		return self::REGISTRY;
	}

	public static function get( string $id ): ?array {
		return self::REGISTRY[ $id ] ?? null;
	}

	public static function label( string $id ): string {
		return self::REGISTRY[ $id ]['label'] ?? $id;
	}

	public static function office_label( string $id ): string {
		return self::REGISTRY[ $id ]['office_label'] ?? 'до офис';
	}

	public static function supports_door( string $id ): bool {
		return (bool) ( self::REGISTRY[ $id ]['door'] ?? true );
	}

	/** Regex fragment for the front-end picker, so it never falls behind this list. */
	public static function id_pattern(): string {
		return implode( '|', array_map( 'preg_quote', array_keys( self::REGISTRY ) ) );
	}
}
