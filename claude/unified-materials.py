#!/usr/bin/env python3
"""palette22.html — every material given the SAME treatment as the metal:

  1. TINTED TO КЕХЛИБАР. No material keeps its own colour any more. The body comes from
     the ramp (36/88/−2) and the material contributes only its GREY shading map, so wood,
     opal, marble and enamel are all the one chosen amber.
  2. TEXTURE AS ACCENT ONLY. The grain sits on an ::after with the rim+ends mask, exactly
     as metal_0065 + everytexture do — clean under the label, textured at the edges and in
     the padding.

So the mechanism is now identical across all of them and only two things change per
material: which grey map, and how glossy the body is.
"""
import os
from page8 import uri, page, HEAD, TEX, METAL

MARBLE_M = uri("new-marble-map.webp", 256, 58)
OPAL_M = uri("new-opal-map.webp", 256, 58)
PLY_M = uri("new-ply-map.webp", 256, 58)

AMBER = "--gh:36;--gs:88;--gl:-2"

# bodies, from matte to mirror — all built from the ramp, none from a photograph
BODY_MATTE = ("linear-gradient(178deg, var(--g-light) 0%, var(--g-core) 62%, "
              "var(--g-shadow) 100%)")
BODY_SPOT = ("radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, "
             "transparent 74%), linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, "
             "var(--g-shadow) 100%)")
BODY_GLOSS = ("radial-gradient(58% 90% at 30% 10%, rgb(255 255 255/.86), transparent 64%), "
              "linear-gradient(178deg, var(--g-hi) 0%, var(--g-light) 48%, var(--g-core) 100%)")
BODY_MIRROR = ("linear-gradient(180deg, rgb(255 255 255/.70) 0%, rgb(255 255 255/.08) 26%, "
               "rgb(0 0 0/.05) 52%, rgb(0 0 0/.28) 100%), "
               "radial-gradient(60% 40% at 30% 12%, rgb(255 255 255/.85), transparent 70%), "
               "linear-gradient(175deg, var(--g-light), var(--g-core) 55%, var(--g-deep))")

RIM_WARM = ("inset 0 0 0 1px hsl(36 88% 32% / .55), "
            "inset 0 9px 16px -11px var(--g-vanilla), "
            "inset 0 -11px 20px -11px var(--g-deep), "
            "inset 9px 0 18px -14px var(--g-deep), "
            "inset -9px 0 18px -14px var(--g-deep)")
RIM_GLOSS = ("inset 0 1px 0 rgb(255 255 255/.85), "
             "inset 0 -9px 16px -11px hsl(30 80% 30% / .45), "
             "inset 0 0 0 1px hsl(34 70% 40% / .35)")

MATS = [
    ("m-gold", "Метал — кехлибар (контролата)",
     "Основата е metal_0065, акцентът е everytexture 00102, маскиран по ръба. "
     "Останалите десет вече работят по същата схема.",
     BODY_SPOT, METAL, "150px 150px", RIM_WARM, "var(--text-spot)"),

    ("m-glaze", "Керамична глазура",
     "Гланцово тяло, зърното само по ръба. Материалът, който магазинът реално продава.",
     BODY_GLOSS, TEX["glaze"], "190px 190px", RIM_GLOSS, None),

    ("m-enamel", "Емайл — кехлибарено тяло, кремав кант",
     "Кантът вече не е черешов, а кремав: така черешата остава свободна за цените, "
     "а бутонът си остава кехлибарен.",
     BODY_GLOSS, TEX["glaze"], "190px 190px",
     "inset 0 0 0 3px #FFF6E9, inset 0 0 0 4px hsl(34 60% 45% / .35), "
     "inset 0 -9px 15px -11px hsl(30 70% 28% / .40)", None),

    ("m-marble", "Бял мрамор → кехлибарен оникс",
     "Жилките му са само в албедото, затова тук минават като СИВА карта и се тонират. "
     "Вече не е студен камък — същият кехлибар, с мрамора като релеф по ръба.",
     BODY_SPOT, MARBLE_M, "230px 230px", RIM_WARM, None),

    ("m-opal", "Опал / седеф → кехлибар",
     "Иризацията идва като релеф, не като цвят. Пази „магическото\" усещане, но в нашия тон.",
     BODY_GLOSS, OPAL_M, "240px 240px", RIM_GLOSS, None),

    ("m-ply", "Шперплат → кехлибар",
     "Правата шарка на фурнира, тонирана. Спокойна и топла, без да е кафява.",
     BODY_MATTE, PLY_M, "250px 250px", RIM_WARM, None),

    ("m-paper", "Хартия",
     "Матово тяло, влакното само по краищата. Най-тихият вариант в списъка.",
     BODY_MATTE, TEX["paper"], "170px 170px",
     "inset 0 0 0 1px hsl(34 60% 35% / .35), inset 0 -7px 13px -10px hsl(30 60% 25% / .35)", None),

    ("m-linen", "Лен",
     "Тъканта се вижда в падинга и по ръба, а под надписа е гладко — точно проблемът, "
     "който посочи миналия път.",
     BODY_MATTE, TEX["linen"], "130px 130px", RIM_WARM, None),

    ("m-terra", "Теракота",
     "Грубото зърно на печената глина, но само там, където не пречи.",
     BODY_MATTE, TEX["terra"], "180px 180px", RIM_WARM, None),

    ("m-stone", "Камък",
     "Студеният камък от миналия кръг, вече в кехлибар — за да се види колко от „скъпото\" "
     "усещане идва от шарката, а колко идваше от студения тон.",
     BODY_SPOT, TEX["stone"], "200px 200px", RIM_WARM, None),

    ("m-liquid", "Течен кехлибар — огледално",
     "Крайната точка на гланца: остър тесен блясък, дълбока сянка. Тук зърното почти не "
     "се вижда, и това е нарочно.",
     BODY_MIRROR, TEX["glaze"], "190px 190px",
     "inset 0 1px 0 rgb(255 255 255/.65), inset 0 -10px 18px -12px rgb(0 0 0/.5), "
     "inset 0 0 0 1px rgb(255 255 255/.25)", None),
]

pages = []
for key, title, note, body, tex, tsz, rim, textsurface in MATS:
    style = (f"{AMBER};--surface:{body};--tile:none;--tsz:auto;--blend:normal;"
             f"--ink:#3A1D20;--rim:{rim};--bg:var(--g-core);"
             f"--acc-tex:url({tex});--acc-size:{tsz}")
    pages.append(page(key, title, note, style, True, textsurface or body))

intro = ('<div class="intro"><h1>Единайсет материала, един цвят, едно поведение</h1>'
 '<p>Две неща се промениха спрямо предишния кръг, и двете по твоята забележка:</p>'
 '<p><b>1. Всичко е кехлибар.</b> Никой материал вече не носи собствения си цвят. '
 'Шперплатът, опалът, емайлът и белият мрамор влизат само като <b>сиви карти на релефа</b> '
 'и се тонират от рампата 36/88/−2. Затова дървото не е кафяво, а мраморът не е студен — '
 'те дават шарката, тонът е наш.</p>'
 '<p><b>2. Всяка текстура е вече само акцент.</b> Същата маска като при метала: зърното '
 'живее на <code>::after</code>, маскирано „ръб + краища\", така че под надписа е гладко, '
 'а шарката се вижда в падинга и по ръбовете. Тялото отдолу се мени само по гланц — '
 'от матово (хартия, лен, теракота, шперплат) през гланц (глазура, емайл, опал) до '
 'огледално (течен кехлибар).</p>'
 '<p><small>Тоест механизмът е един и същ за всички единайсет, и остават само два избора: '
 '<b>коя сива карта</b> и <b>колко гланц</b>.</small></p></div>')

open("palette22.html", "w", encoding="utf-8").write(HEAD + intro + "".join(pages) + "</html>")
# the accent size must follow the material, not the metal's 190px
extra = ("<style>.acc--metal::after{background-size:var(--acc-size,190px 190px)}</style>")
h = open("palette22.html", encoding="utf-8").read().replace("</style>", "</style>" + extra, 1)
open("palette22.html", "w", encoding="utf-8").write(h)
print("palette22.html", os.path.getsize("palette22.html") // 1024, "KB")
