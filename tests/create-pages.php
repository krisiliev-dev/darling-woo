<?php
/**
 * Create the content pages the header and footer link to.
 *
 * These were linked before they existed, so every one of them 404'd. Content is
 * deliberately a marked SKELETON, not invented prose: Общи условия, Поверителност,
 * Доставка and Връщане carry legal obligations under Bulgarian and EU consumer law,
 * and text that merely LOOKS like a policy is worse than an obvious placeholder —
 * it reads as authoritative and nobody goes back to it.
 */
$todo = '<!-- wp:paragraph --><p><strong>⚠ Съдържанието на тази страница предстои да бъде попълнено.</strong></p><!-- /wp:paragraph -->';

$pages = array(
	'za-nas' => array( 'За нас',
		'<!-- wp:paragraph --><p>„Дарлинг 7“ ООД — Свищов. Тайната на една домакиня.</p><!-- /wp:paragraph -->' . $todo ),
	'pomosht' => array( 'Помощ и въпроси',
		'<!-- wp:heading {"level":2} --><h2>Често задавани въпроси</h2><!-- /wp:heading -->' . $todo ),
	'kontakti' => array( 'Контакти',
		'<!-- wp:paragraph --><p>Имейл: <a href="mailto:orders@darlinghome.bg">orders@darlinghome.bg</a><br>гр. Свищов</p><!-- /wp:paragraph -->' . $todo ),
	'obshti-usloviya' => array( 'Общи условия',
		'<!-- wp:paragraph --><p>Общи условия за ползване на онлайн магазина на „Дарлинг 7“ ООД.</p><!-- /wp:paragraph -->' . $todo ),
	'poveritelnost' => array( 'Политика за поверителност',
		'<!-- wp:paragraph --><p>Как обработваме и защитаваме личните ви данни (GDPR).</p><!-- /wp:paragraph -->' . $todo ),
	'dostavka' => array( 'Доставка',
		'<!-- wp:paragraph --><p>Доставяме с Еконт и Спиди — до офис или до адрес. Цената на доставката се изчислява автоматично при поръчка според теглото и получателя.</p><!-- /wp:paragraph -->' . $todo ),
	'vrashtane' => array( 'Връщане и рекламации',
		'<!-- wp:paragraph --><p>Право на отказ до 14 дни съгласно Закона за защита на потребителите.</p><!-- /wp:paragraph -->' . $todo ),
);

foreach ( $pages as $slug => $p ) {
	$existing = get_page_by_path( $slug );
	if ( $existing ) {
		printf( "  %-18s exists (#%d)\n", $slug, $existing->ID );
		continue;
	}
	$id = wp_insert_post( array(
		'post_type'    => 'page',
		'post_name'    => $slug,
		'post_title'   => $p[0],
		'post_content' => $p[1],
		'post_status'  => 'publish',
	) );
	printf( "  %-18s %s\n", $slug, is_wp_error( $id ) ? 'FAILED: ' . $id->get_error_message() : "created (#$id)" );
}
