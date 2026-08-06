#!/usr/bin/env python3
"""palette23.html — КЕХЛИБАРЕНО СТЪКЛО, seven ways.
   palette24.html — the shortlist (метал · кехлибарен мрамор · шперплат · стъкло) × glow.

Why the earlier „glass" was not glass: it was an OPAQUE body with a glossy highlight.
Real glass is defined by what passes THROUGH it — so every variant here is genuinely
translucent, and each page shows the same element over claret, over the grey page and on
a white card, because that is where transparency stops being decorative and starts being
a design decision.
"""
import os
from page8 import uri, page, HEAD, TEX, METAL

MARBLE_M = uri("new-marble-map.webp", 256, 58)
PLY_M = uri("new-ply-map.webp", 256, 58)
AMBER = "--gh:36;--gs:88;--gl:-2"

# amber, but as TRANSPARENT colour — the ramp with alpha
A = lambda a: f"hsl(36 88% 50% / {a})"
A_L = lambda a: f"hsl(38 92% 66% / {a})"
A_D = lambda a: f"hsl(28 90% 30% / {a})"

BUBBLES = ("radial-gradient(closest-side circle at 18% 34%, rgb(255 255 255/.55) 0 40%, transparent 62%), "
           "radial-gradient(closest-side circle at 63% 22%, rgb(255 255 255/.42) 0 38%, transparent 60%), "
           "radial-gradient(closest-side circle at 41% 74%, rgb(255 255 255/.38) 0 36%, transparent 58%), "
           "radial-gradient(closest-side circle at 86% 62%, rgb(255 255 255/.30) 0 34%, transparent 56%)")

GLOW = ("0 0 0 1px rgb(255 214 140/.35), 0 0 18px 2px hsl(38 95% 60% / .55), "
        "0 0 46px 10px hsl(36 95% 58% / .30)")

def S(key, title, note, surface, rim, extra="", bg="transparent", tex="none",
      tsz="auto", blend="normal", ink="#3A1D20", metal=False, textsurface=None):
    style = (f"{AMBER};--surface:{surface};--tile:none;--tsz:auto;--blend:{blend};"
             f"--ink:{ink};--rim:{rim};--bg:{bg};--acc-tex:url({tex});--acc-size:{tsz};{extra}")
    return page(key, title, note, style, metal, textsurface or surface)

# ── DECK 1: seven glasses ────────────────────────────────────────────────────
GLASS = [
 S("gl-clear", "1. Чисто кехлибарено стъкло — 55% плътност",
   "Най-простото: цветът е полупрозрачен и НИЩО не се размива. Затова върху кларета "
   "става топло-червен, а върху сивото — блед мед. *** Едно и също стъкло, два различни "
   "цвята, защото стъклото няма свой цвят — то има само тон. ***",
   f"linear-gradient(180deg, {A_L('.55')} 0%, {A('.55')} 55%, {A_D('.45')} 100%)",
   f"inset 0 1px 0 rgb(255 255 255/.6), inset 0 -8px 14px -10px {A_D('.55')}, "
   f"inset 0 0 0 1px rgb(255 255 255/.35)"),

 S("gl-thin", "2. Тънко стъкло — 30% плътност",
   "Почти прозрачно. Върху кларета бутонът едва се държи; върху бяла карта изчезва. "
   "Показано, за да се види къде е границата.",
   f"linear-gradient(180deg, {A_L('.34')} 0%, {A('.30')} 60%, {A_D('.26')} 100%)",
   f"inset 0 1px 0 rgb(255 255 255/.5), inset 0 0 0 1px rgb(255 255 255/.28)"),

 S("gl-frost", "3. Матирано стъкло — размива фона",
   "Пясъкоструйно: полупрозрачно И <code>backdrop-filter: blur</code>. Оттук нататък "
   "фонът се вижда размит, не ясен. *** Това е единственият вариант в целия проект, "
   "който е скъп за рисуване — блърът се преизчислява при всяко скролване. ***",
   f"linear-gradient(180deg, {A_L('.42')}, {A('.34')})",
   f"inset 0 1px 0 rgb(255 255 255/.65), inset 0 0 0 1px rgb(255 255 255/.4)",
   extra="backdrop-filter:blur(10px) saturate(1.4);-webkit-backdrop-filter:blur(10px) saturate(1.4)"),

 S("gl-thick", "4. Дебело стъкло — ръбът пречупва",
   "Стъклото е най-ярко там, където е най-дебело: по ръба. Затова тук ръбът СВЕТИ, "
   "а средата е по-плътна и по-тъмна — обратното на метала.",
   f"radial-gradient(70% 130% at 50% 50%, {A('.30')} 0 42%, {A('.60')} 78%, {A_L('.85')} 100%)",
   f"inset 0 0 0 1px rgb(255 255 255/.55), inset 0 12px 20px -14px rgb(255 255 255/.85), "
   f"inset 0 -12px 20px -14px {A_D('.6')}, inset 14px 0 26px -18px rgb(255 255 255/.5), "
   f"inset -14px 0 26px -18px rgb(255 255 255/.5)"),

 S("gl-seeded", "5. Стъкло с мехурчета",
   "Ръчно издухано стъкло задържа мехурчета. Тук те са четири светли точки в самото "
   "стъкло — не текстура отгоре, а дефект вътре, което е разликата.",
   f"{BUBBLES}, linear-gradient(180deg, {A_L('.55')} 0%, {A('.52')} 60%, {A_D('.45')} 100%)",
   f"inset 0 1px 0 rgb(255 255 255/.6), inset 0 -8px 14px -10px {A_D('.5')}, "
   f"inset 0 0 0 1px rgb(255 255 255/.35)"),

 S("gl-caustic", "6. Стъкло с каустики",
   "Светлината, минала през извито стъкло, се събира в ярки нишки. Два тесни, наклонени "
   "лъча — това е ефектът, който окото чете като „стъкло\", а не като „пластмаса\".",
   f"linear-gradient(102deg, transparent 18%, rgb(255 255 255/.55) 26%, transparent 33%), "
   f"linear-gradient(102deg, transparent 58%, rgb(255 255 255/.38) 63%, transparent 69%), "
   f"linear-gradient(180deg, {A_L('.55')} 0%, {A('.55')} 55%, {A_D('.45')} 100%)",
   f"inset 0 1px 0 rgb(255 255 255/.6), inset 0 -8px 14px -10px {A_D('.5')}, "
   f"inset 0 0 0 1px rgb(255 255 255/.4)"),

 S("gl-glow", "7. Стъкло + сияние  ⟵ „магическата\" двойка",
   "Точно предположението ти: стъклото приема светлина по-добре от метала, защото вече "
   "изглежда полупрозрачно. Сиянието не се бори с повърхността — то я обяснява.",
   f"radial-gradient(58% 110% at 50% 58%, hsl(45 100% 78% / .75) 0%, {A_L('.6')} 40%, "
   f"{A('.55')} 72%, {A_D('.5')} 100%)",
   f"inset 0 0 0 1px hsl(42 100% 88% / .8), inset 0 9px 16px -11px hsl(45 100% 92% / .9), "
   f"inset 0 -10px 18px -12px {A_D('.6')}, {GLOW}"),
]

intro1 = ('<div class="intro"><h1>Кехлибарено стъкло — седем плътности</h1>'
 '<p>Права бележка: това, което нарекох „стъкло" досега, беше <b>непрозрачно тяло с '
 'гланц</b>. Истинското стъкло се определя от онова, което минава ПРЕЗ него — затова тук '
 'всичките седем са наистина полупрозрачни.</p>'
 '<p><b>Затова гледай ги на цяла страница, а не като мостри:</b> едно и също стъкло е '
 'топло-червено върху кларета, бледо-медено върху сивата страница и почти изчезва върху '
 'бяла карта. Стъклото няма собствен цвят — то има тон, а цветът идва от това, което е '
 'зад него. Значката „Ново" върху бялата снимка е най-честният тест.</p>'
 '<p><small><b>Една честна цена:</b> само вариант 3 (матирано) използва '
 '<code>backdrop-filter</code>. Той е единственото наистина скъпо нещо в целия проект — '
 'размива се при всяко скролване. Останалите шест са обикновени полупрозрачни фонове и '
 'не струват нищо повече от плътен цвят.</small></p></div>')
open("palette23.html", "w", encoding="utf-8").write(HEAD + intro1 + "".join(GLASS) + "</html>")

# ── DECK 2: the shortlist × glow ─────────────────────────────────────────────
BODY_SPOT = ("radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, "
             "transparent 74%), linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, "
             "var(--g-shadow) 100%)")
BODY_MATTE = ("linear-gradient(178deg, var(--g-light) 0%, var(--g-core) 62%, var(--g-shadow) 100%)")
RIM_WARM = ("inset 0 0 0 1px hsl(36 88% 32% / .55), inset 0 9px 16px -11px var(--g-vanilla), "
            "inset 0 -11px 20px -11px var(--g-deep), inset 9px 0 18px -14px var(--g-deep), "
            "inset -9px 0 18px -14px var(--g-deep)")
RIM_LIT = ("inset 0 0 0 1px hsl(42 100% 88% / .8), inset 0 8px 16px -10px hsl(45 100% 92% / .9), "
           "inset 0 -10px 20px -12px hsl(30 90% 55% / .8), "
           "inset 12px 0 22px -16px hsl(45 100% 90% / .7), "
           "inset -12px 0 22px -16px hsl(45 100% 90% / .7)")
GLINTS = ("radial-gradient(closest-side circle at 21% 25%, hsl(48 100% 96%) 0%, "
          "hsl(45 100% 88% / .55) 20%, transparent 58%), "
          "radial-gradient(closest-side circle at 76% 69%, hsl(48 100% 96%) 0%, "
          "hsl(45 100% 88% / .45) 16%, transparent 52%), ")

SHORT = [
    ("met", "Метал", BODY_SPOT, METAL, "150px 150px"),
    ("mar", "Кехлибарен мрамор", BODY_SPOT, MARBLE_M, "230px 230px"),
    ("ply", "Шперплат", BODY_MATTE, PLY_M, "250px 250px"),
]
LEVELS = [
    ("0", "без сияние", RIM_WARM, "", ""),
    ("1", "сияние + светещ ръб", RIM_LIT + ", " + GLOW, "", ""),
    ("2", "сияние + светещ ръб + искри", RIM_LIT + ", " + GLOW, GLINTS, ""),
]

deck2 = []
for mk, mname, body, tex, tsz in SHORT:
    for lk, lname, rim, glints, _ in LEVELS:
        deck2.append(S(f"{mk}-{lk}", f"{mname} — {lname}",
                       "Едни и същи трите материала, три нива светлина. Сравнявай по редове.",
                       glints + body, rim, tex=tex, tsz=tsz, blend="overlay, normal",
                       metal=True, textsurface="var(--text-spot)"))
# and the glass, at the same three levels
GLASS_BODY = f"linear-gradient(180deg, {A_L('.55')} 0%, {A('.55')} 55%, {A_D('.45')} 100%)"
for lk, lname, rim, glints, _ in LEVELS:
    r = (f"inset 0 1px 0 rgb(255 255 255/.6), inset 0 -8px 14px -10px {A_D('.5')}, "
         f"inset 0 0 0 1px rgb(255 255 255/.35)") if lk == "0" else rim
    deck2.append(S(f"gls-{lk}", f"Кехлибарено стъкло — {lname}",
                   "Стъклото приема светлина най-естествено от четирите — виж дали това е "
                   "„магическото\", което търсиш.",
                   glints + GLASS_BODY, r))

intro2 = ('<div class="intro"><h1>Твоите три плюс стъклото, всяко с три нива светлина</h1>'
 '<p>Дванайсет страници, подредени по материал: <b>метал</b>, <b>кехлибарен мрамор</b>, '
 '<b>шперплат</b> и <b>стъкло</b>, всяко без сияние, със сияние и светещ ръб, и с добавени '
 'искри. Цветът е кехлибар навсякъде, повърхността е E, текстурата е акцент по ръба — '
 'всичко това вече е решено и не се мени.</p>'
 '<p><b>Какво да гледаш:</b> сиянието прави най-малко за шперплата (матовият материал не '
 'изглежда като източник на светлина) и най-много за стъклото. Метал и мрамор са по средата. '
 'Ако тръгнеш към магията, стъклото е материалът, който я носи без да изглежда залепена.</p>'
 '<p><small>Нищо не се движи. Искрите са неподвижни — същият мотив като на фона, но вграден '
 'в повърхността.</small></p></div>')
open("palette24.html", "w", encoding="utf-8").write(HEAD + intro2 + "".join(deck2) + "</html>")

extra = "<style>.acc--metal::after{background-size:var(--acc-size,190px 190px)}</style>"
for f in ("palette23.html", "palette24.html"):
    h = open(f, encoding="utf-8").read().replace("</style>", "</style>" + extra, 1)
    open(f, "w", encoding="utf-8").write(h)
    print(f, os.path.getsize(f) // 1024, "KB")
