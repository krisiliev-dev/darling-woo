#!/usr/bin/env python3
"""palette28.html — the winner, ANIMATED, and wired to the REAL selectors.

Two things happened this round.

1. Kris asked for motion: the glow, the sparkles and a slow shift on the highlight.
   Everything here moves on `transform` and `opacity` only — the two properties the
   compositor can animate without laying out or repainting — except the specular drift,
   which is a background-position and is honestly labelled as the one repaint.

2. *** I PROBED THE LIVE DOM BEFORE WRITING A SINGLE SELECTOR, *** and it changed the
   plan for the better: the classes the metal needs ALREADY EXIST.
     hero button ....... a.d-btn.d-btn--primary   inside .darling-hero--red
     newsletter button . button.d-btn.d-btn--primary inside .darling-news-band
     wordmark .......... a.darling-header__logo.darling-wordmark
     footer rule ....... span.dff-rule
     footer mark ....... div.dff-mark
   So slice 6 needs NO markup change at all. Two things I expected are NOT there and are
   recorded rather than invented: the trust ticks are the text glyph „✦" with no element
   of their own, and the product card has no badge element.
"""
import os
from page8 import uri, page, HEAD

PLY = uri("strong-ply.webp", 256, 70)
AMBER = "--gh:36;--gs:88;--gl:-2"
BODY = ("radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, "
        "transparent 74%), linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, "
        "var(--g-shadow) 100%)")
RIM_LIT = ("inset 0 0 0 1px hsl(42 100% 88% / .80), "
           "inset 0 8px 16px -10px hsl(45 100% 92% / .90), "
           "inset 0 -10px 20px -12px hsl(30 90% 55% / .80), "
           "inset 12px 0 22px -16px hsl(45 100% 90% / .70), "
           "inset -12px 0 22px -16px hsl(45 100% 90% / .70)")
MASK_STRONG = "radial-gradient(64% 190% at 50% 50%, transparent 0 26%, #000 86%)"

MOTION_CSS = """<style>
/* ── THE MOTION LAYER ───────────────────────────────────────────────────────
   The bloom and the glints move to a ::before that sits BEHIND the element
   (z-index:-1, inset negative), so it can spill outside without the element
   needing overflow:visible for anything else. It is the only layer that moves,
   and it moves on transform and opacity — the compositor handles both without
   laying out or repainting.

   Rhythms are deliberately unequal and slow, so nothing ever pulses in unison:
     bloom breathes .... 11s
     glints turn ....... 54s for a full revolution
     highlight drifts .. 26s, and this one IS a repaint (see the note)      */
.acc{overflow:visible}
.acc::before{
	content:"";position:absolute;inset:-45%;z-index:-1;pointer-events:none;
	border-radius:inherit;
	background:
		radial-gradient(closest-side circle at 40.5% 43%, hsl(48 100% 96% / .95) 0%,
			hsl(45 100% 88% / .55) 8%, transparent 22%),
		radial-gradient(closest-side circle at 62% 60%, hsl(48 100% 96% / .9) 0%,
			hsl(45 100% 88% / .45) 6%, transparent 18%),
		radial-gradient(closest-side, hsl(38 95% 60% / .42) 0 36%,
			hsl(36 95% 58% / .18) 58%, transparent 76%);
	animation: d-breathe 11s ease-in-out infinite, d-turn 54s linear infinite;
}
@keyframes d-breathe{ 0%,100%{opacity:1} 50%{opacity:.62} }
@keyframes d-turn{ to{ transform: rotate(360deg) } }

/* the specular drifts a little across the face. THIS ONE REPAINTS — a
   background-position cannot be composited — but the amplitude is 4% and the period
   is 26s, and the metal only ever appears on a handful of elements per page. */
.acc{ animation: d-drift 26s ease-in-out infinite }
@keyframes d-drift{
	0%,100%{ background-position: 0% 0%, 0% 0% }
	50%    { background-position: 4% 2%, 0% 0% }
}

/* NON-NEGOTIABLE, both of them. */
@media (prefers-reduced-motion: reduce){
	.acc, .acc::before{ animation: none !important }
}
body.woocommerce-cart, body.woocommerce-checkout, body.woocommerce-order-received{
	--money-path: 1;
}
body.woocommerce-cart .acc, body.woocommerce-checkout .acc,
body.woocommerce-order-received .acc,
body.woocommerce-cart .acc::before, body.woocommerce-checkout .acc::before,
body.woocommerce-order-received .acc::before{ animation: none !important }

.acc--metal::after{background-size:var(--acc-size,190px 190px);opacity:var(--acc-op,1);
	border-radius:inherit;
	-webkit-mask-image:var(--mask2,var(--mask));mask-image:var(--mask2,var(--mask))}
</style>"""

style = (f"{AMBER};--surface:{BODY};--tile:none;--tsz:auto;--blend:normal;"
         f"--ink:#3A1D20;--rim:{RIM_LIT};--bg:var(--g-core);"
         f"--acc-tex:url({PLY});--acc-size:260px 260px;--acc-op:1;--mask2:{MASK_STRONG}")

pages = [page("live", "Шперплат + сияние + искри — В ДВИЖЕНИЕ",
              "Сиянието диша за 11 s, искрите обикалят за 54 s, отблясъкът се измества за "
              "26 s. Трите ритъма са нарочно различни, за да не пулсират в такт.",
              style, True, "var(--text-spot)")]

intro = ('<div class="intro"><h1>Победителят, вече жив</h1>'
 '<p>Сиянието <b>диша</b> (11 s), искрите <b>обикалят</b> бавно (54 s), а отблясъкът по '
 'повърхността се <b>измества</b> (26 s). Трите периода са нарочно несъразмерни — така '
 'нищо не пулсира в такт и се чете като светлина в стая, а не като банер.</p>'
 '<p><b>Какво струва:</b> сиянието и искрите живеят на един псевдоелемент зад бутона и се '
 'движат само чрез <code>transform</code> и <code>opacity</code> — двете неща, които '
 'композиторът върши без преоформяне и без пре-рисуване. *** Единственото изключение е '
 'изместването на отблясъка: то е <code>background-position</code> и наистина се '
 'пре-рисува. *** Амплитудата е 4%, периодът 26 s, а металът е на шепа елементи на '
 'страница — но го казвам, вместо да го скрия.</p>'
 '<p><b>Две неща спират всичко:</b> <code>prefers-reduced-motion</code> и присъствието на '
 'кошницата, плащането или потвърждението — там анимациите просто не съществуват, точно '
 'както искрите на фона вече не съществуват.</p>'
 '<p><small><b>И една добра новина от проверката на живия сайт:</b> класовете, които '
 'слайс 6 иска, ВЕЧЕ съществуват — <code>.d-btn--primary</code> в героя и в нюзлетъра, '
 '<code>.darling-wordmark</code> в хедъра, <code>.dff-rule</code> и <code>.dff-mark</code> '
 'във футъра. Тоест не се налага никаква промяна в маркъпа. Две неща обаче ги НЯМА и ги '
 'записвам, вместо да ги измислям: отметките в реда с доверието са текстовият знак „✦" без '
 'собствен елемент, а продуктовата карта няма значка.</small></p></div>')

html = HEAD.replace("</style>", "</style>" + MOTION_CSS, 1) + intro + "".join(pages) + "</html>"
open("palette28.html", "w", encoding="utf-8").write(html)
print("palette28.html", os.path.getsize("palette28.html") // 1024, "KB")
