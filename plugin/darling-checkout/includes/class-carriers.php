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
