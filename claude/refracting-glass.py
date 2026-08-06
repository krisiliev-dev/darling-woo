#!/usr/bin/env python3
"""palette25.html — glass that REFRACTS: light from inside, spreading outward.

Kris: „these are simply transparent, which isn't very indicative that it is glass. We need
some sort of light refraction… say the light is coming from within the button… kaleidoscopic
refractions. Maybe it can even be procedural animation."

So the model changes. Until now the glass was LIT FROM OUTSIDE and we varied its opacity.
Here the light source is INSIDE the object: a bright core, filaments carrying it outward,
and caustics on the surface where the curved glass focuses it. Two rendered assets do the
work — a seamless caustic web and a true kaleidoscopic burst (built by repeating one angular
wedge, which is what makes it a kaleidoscope rather than noise).
"""
import base64, os
from page8 import uri, page, HEAD

WEB = uri("caustic-web.webp", 320, 74)
B9 = uri("caustic-burst9.webp", 384, 78)
B14 = uri("caustic-burst14.webp", 384, 78)
FACETS = uri("caustic-facets.webp", 256, 74)

AMBER = "--gh:36;--gs:88;--gl:-2"
A = lambda a: f"hsl(36 88% 50% / {a})"
A_L = lambda a: f"hsl(38 92% 66% / {a})"
A_D = lambda a: f"hsl(28 90% 30% / {a})"

# the body: translucent amber with a bright core — „the light is inside“
BODY_LIT = (f"radial-gradient(56% 105% at 50% 56%, hsl(45 100% 80% / .92) 0%, "
            f"{A_L('.72')} 30%, {A('.60')} 62%, {A_D('.52')} 100%)")
RIM_GLASS = (f"inset 0 0 0 1px hsl(44 100% 90% / .75), "
             f"inset 0 9px 16px -11px hsl(46 100% 94% / .9), "
             f"inset 0 -10px 18px -12px {A_D('.6')}, "
             f"inset 13px 0 24px -17px hsl(46 100% 92% / .7), "
             f"inset -13px 0 24px -17px hsl(46 100% 92% / .7)")
GLOW = ("0 0 0 1px rgb(255 214 140/.30), 0 0 18px 2px hsl(38 95% 60% / .55), "
        "0 0 48px 12px hsl(36 95% 58% / .32)")
POCKET = ("0 0 0 18px rgb(60 12 20 / .40), 0 0 54px 26px rgb(50 8 16 / .38)")

def S(key, title, note, body, rim, fx="none", fxop=".85", web="none", webop=".55",
      cls="", mask2=None, extra=""):
    m2 = f"--mask2:{mask2};" if mask2 else ""
    style = (f"{AMBER};--surface:{body};--tile:none;--tsz:auto;--blend:normal;"
             f"--ink:#3A1D20;--rim:{rim};--bg:transparent;"
             f"--acc-tex:{web};--acc-size:280px 280px;--acc-op:{webop};"
             f"--fx:{fx};--fx-op:{fxop};{m2}{extra}")
    p = page(key, title, note, style, True, body)
    if cls:
        p = p.replace('class="page"', f'class="page {cls}"')
    return p

SOFT_MASK = "radial-gradient(80% 200% at 50% 50%, rgba(0,0,0,.30) 0 34%, #000 100%)"

V = [
 S("gg-core", "1. Само светлина отвътре",
   "Без шарка. Ядрото свети, стъклото го пропуска навън и гасне към ръба. Това е базата — "
   "всичко следващо добавя пречупване върху нея.",
   BODY_LIT, RIM_GLASS),

 S("gg-web", "2. + каустична мрежа по повърхността",
   "Нишките, които се виждат на дъното на басейн. Изрисувани са като РИДОВЕ на изкривено "
   "поле, затова са тънки като косъм — каустиката е линия, не петно.",
   BODY_LIT, RIM_GLASS, web=f"url({WEB})", webop=".62", mask2=SOFT_MASK),

 S("gg-burst", "3. + калейдоскопичен изблик",
   "Деветкратна симетрия, построена като ЕДИН ъглов клин, повторен в кръг — затова е "
   "истински калейдоскоп, а не шум. Излиза от центъра на елемента, значи следва формата му.",
   BODY_LIT, RIM_GLASS, fx=f"url({B9})", fxop=".80"),

 S("gg-full", "4. Всичко заедно + външно сияние",
   "Изблик + мрежа + ореол навън. Светлината минава през стъклото и продължава в страницата.",
   BODY_LIT, RIM_GLASS + ", " + GLOW, fx=f"url({B9})", fxop=".78",
   web=f"url({WEB})", webop=".50", mask2=SOFT_MASK),

 S("gg-anim", "5. Същото, но ЖИВО  ⟵ процедурна анимация",
   "Изблкът се върти веднъж на 48 секунди, ядрото „диша“ за 9, а искрите примигват — "
   "толкова бавно, че се усеща като светлина, а не като реклама. Спира напълно при "
   "prefers-reduced-motion и няма да го има в кошницата и плащането.",
   BODY_LIT, RIM_GLASS + ", " + GLOW, fx=f"url({B14})", fxop=".80",
   web=f"url({WEB})", webop=".48", cls="spin breathe", mask2=SOFT_MASK),

 S("gg-facets", "6. Витраж — рязано стъкло",
   "Дванайсет плоски сектора вместо нишки. Светлината стъпва от фасет на фасет, вместо да "
   "тече — по-строго, по-бижутерско.",
   BODY_LIT, RIM_GLASS, fx=f"url({FACETS})", fxop=".55"),

 S("gg-pocket", "7. Пълното, но в потъмнено гнездо  ⟵ и решението на контраста",
   "*** Стъклото падаше върху кларета, защото пропуска фона си. Тук около бутона има "
   "тъмно „гнездо“ — точно каквото хвърля истинско стъкло със светлина вътре. *** "
   "Физически честно и вдига контраста, вместо да го фалшифицира.",
   BODY_LIT, RIM_GLASS + ", " + GLOW + ", " + POCKET, fx=f"url({B9})", fxop=".82",
   web=f"url({WEB})", webop=".50", cls="spin breathe", mask2=SOFT_MASK),
]

FX_CSS = """
<style>
/* the caustic layers. ::before carries the burst (inside the glass, so it is clipped by
   the element); ::after carries the surface web. Both use `screen`, so they only ADD
   light and can never tint the amber. */
.acc{position:relative;isolation:isolate;overflow:hidden}
.acc::before{content:"";position:absolute;inset:-45%;pointer-events:none;
	background-image:var(--fx,none);background-size:100% 100%;background-position:50% 50%;
	background-repeat:no-repeat;mix-blend-mode:screen;opacity:var(--fx-op,.8);
	transform-origin:50% 50%}
.acc--metal::after{background-image:var(--acc-tex);
	background-size:var(--acc-size,280px 280px);
	mix-blend-mode:screen;opacity:var(--acc-op,.55);
	-webkit-mask-image:var(--mask2,var(--mask));mask-image:var(--mask2,var(--mask))}

/* PROCEDURAL MOTION. Two properties only — transform and opacity — so it composites on
   the GPU and never triggers layout or paint. Slow enough to read as light, not as a
   banner: a full turn takes 48s. */
@keyframes d-refract{to{transform:rotate(360deg)}}
@keyframes d-breathe{0%,100%{opacity:var(--fx-op,.8)}50%{opacity:calc(var(--fx-op,.8) * .62)}}
@keyframes d-twinkle{0%,100%{opacity:.30}50%{opacity:.95}}
.spin .acc::before{animation:d-refract 48s linear infinite}
.breathe .acc::after{animation:d-breathe 9s ease-in-out infinite}
.spin .badge::before{animation-duration:64s}
.spin .tick::before{animation-duration:38s}

/* Non-negotiable: the whole thing stops dead for anyone who asks it to, and it would be
   absent on cart / checkout / order-received exactly as the ambient sparkles already are. */
@media (prefers-reduced-motion: reduce){
	.spin .acc::before,.breathe .acc::after{animation:none}
}
</style>"""

intro = ('<div class="intro"><h1>Стъкло, което пречупва</h1>'
 '<p>Забележката ти смени модела, не настройката. Досега стъклото беше <b>осветено отвън</b> '
 'и въртяхме плътността му. Тук източникът е <b>вътре в предмета</b>: ярко ядро, нишки, '
 'които го изнасят навън, и каустики по повърхността, където извитото стъкло фокусира '
 'светлината.</p>'
 '<p><b>Изблкът е истински калейдоскоп.</b> Построен е като ЕДИН ъглов клин, повторен девет '
 '(и съответно четиринайсет) пъти в кръг — затова има реална ротационна симетрия. Шум не '
 'може да даде това. Излиза от центъра на всеки елемент, значи значката, бутонът и '
 'панделката получават своя собствена версия според формата си.</p>'
 '<p><b>Само кехлибар.</b> И двата слоя са сиви и се смесват със <code>screen</code> — те '
 'ДОБАВЯТ светлина и по построение не могат да внесат друг цвят.</p>'
 '<p><b>За анимацията:</b> вариант 5 и 7 се движат. Пълен оборот за <b>48 секунди</b>, '
 'дишане за 9. Мени се само <code>transform</code> и <code>opacity</code>, значи всичко се '
 'композира на GPU — нула преоформяне, нула пре-рисуване. Спира изцяло при '
 '<code>prefers-reduced-motion</code> и няма да съществува в кошницата, плащането и '
 'потвърждението, точно както искрите вече не съществуват там.</p>'
 '<p><small>Ако това е посоката, следващата стъпка е същият изблик да мине през paint '
 'worklet-а — тогава всеки бутон получава СОБСТВЕНА симетрия по seed, вместо да делят '
 'един файл.</small></p></div>')

html = HEAD.replace("</style>", "</style>" + FX_CSS, 1) + intro + "".join(V) + "</html>"
open("palette25.html", "w", encoding="utf-8").write(html)
print("palette25.html", os.path.getsize("palette25.html") // 1024, "KB")
