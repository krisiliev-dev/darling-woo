#!/usr/bin/env python3
"""Two more full-page decks:
   palette20.html — every material on the CHOSEN colour, кехлибар 36/88/−2, plus the
                    three new sets Kris added (white marble, opal/misc-79, plywood)
   palette21.html — GLOW: tying the accent to the sparkle-and-magic theme
"""
import os
from page8 import uri, page, HEAD, TEX, METAL, ACC, MASK

MARBLE_C = uri("new-marble-col.webp", 256, 66)
MARBLE_M = uri("new-marble-map.webp", 256, 58)
OPAL_C = uri("new-opal-col.webp", 256, 66)
OPAL_M = uri("new-opal-map.webp", 256, 58)
PLY_C = uri("new-ply-col.webp", 256, 66)

AMBER = "--gh:36;--gs:88;--gl:-2"          # Кехлибар. Decided.

def S(key, title, note, surface, tile="none", tsz="150px 150px",
      blend="overlay, normal", ink="#3A1D20", rim="none", extra="", bg="transparent",
      metal=False, wordclip=True, textsurface=None):
    style = (f"{AMBER};--surface:{surface};--tile:{tile};--tsz:{tsz};--blend:{blend};"
             f"--ink:{ink};--rim:{rim};--bg:{bg};{extra}")
    return page(key, title, note, style, metal, textsurface or surface, wordclip=wordclip)

RIM_E = "var(--rim-E)"
SURF_E = "var(--surface-E)"

# ── DECK A: the chosen amber, in every material ──────────────────────────────
A = [
 S("a-gold", "Кехлибар, повърхност E — контролата",
   "Избраният цвят върху избраната повърхност. Всичко останало се мери спрямо това.",
   SURF_E, f"url({METAL})", "150px 150px", "overlay, normal", "#3A1D20", RIM_E,
   metal=True, textsurface="var(--text-spot)"),

 S("a-liquid", "Течен кехлибар — стъклен блясък",
   "Същият цвят, но огледално. Смола, стъкло, излят емайл — не кован метал.",
   "linear-gradient(180deg, rgb(255 255 255/.75) 0%, rgb(255 255 255/.10) 26%, "
   "rgb(0 0 0/.06) 52%, rgb(0 0 0/.30) 100%), "
   "radial-gradient(60% 40% at 30% 12%, rgb(255 255 255/.85), transparent 70%), "
   "linear-gradient(175deg, var(--g-light), var(--g-core) 55%, var(--g-deep))",
   "none", "auto", "normal, normal, normal", "#3A1D20",
   "inset 0 1px 0 rgb(255 255 255/.65), inset 0 -10px 18px -12px rgb(0 0 0/.55), "
   "inset 0 0 0 1px rgb(255 255 255/.28)"),

 S("a-onyx", "Кехлибарен оникс — камък с жилки, в цвета",
   "Мраморът на Крис, тониран в кехлибар през нашата рампа. Жилките остават, тонът е наш.",
   "linear-gradient(180deg, var(--g-light), var(--g-core) 60%, var(--g-shadow))",
   f"url({MARBLE_M})", "210px 210px", "overlay, normal", "#3A1D20",
   "inset 0 1px 0 rgb(255 255 255/.35), inset 0 -9px 16px -11px var(--g-deep), "
   "inset 0 0 0 1px rgb(90 60 20/.35)"),

 S("a-marble", "Бял мрамор — както е свален (за сравнение)",
   "Албедото на комплекта, недокоснато. Студен камък до топъл кларет — точно затова е тук.",
   "linear-gradient(180deg, #FAFAF8, #E9E8E4)", f"url({MARBLE_C})", "220px 220px",
   "normal, normal", "#3A1D20",
   "inset 0 0 0 1px rgb(90 90 95/.28), inset 0 -8px 14px -10px rgb(60 60 65/.28)",
   wordclip=False),

 S("a-opal", "Опал / седеф — новият комплект",
   "Бледо тяло с розово-сива иризация. *** Това е единственият материал в целия списък, "
   "който сам по себе си изглежда „магически\" — стои най-близо до искрите. ***",
   "linear-gradient(180deg, #FFFDFA, #F0E6E4)", f"url({OPAL_C})", "230px 230px",
   "normal, normal", "#3A1D20",
   "inset 0 1px 0 rgb(255 255 255/.85), inset 0 -8px 15px -10px rgb(120 90 95/.35), "
   "inset 0 0 0 1px rgb(150 120 125/.3)", wordclip=False),

 S("a-glaze", "Кехлибарена глазура — керамика в цвета",
   "Глазура в избрания тон: мек широк блясък, топло тяло. Материалът, който магазинът продава.",
   "radial-gradient(70% 120% at 30% 8%, rgb(255 255 255/.85), transparent 62%), "
   "linear-gradient(180deg, var(--g-hi) 0%, var(--g-light) 52%, var(--g-core) 100%)",
   f"url({TEX['glaze']})", "180px 180px", "overlay, normal, normal", "#3A1D20",
   "inset 0 1px 0 rgb(255 255 255/.85), inset 0 -8px 14px -10px rgb(120 80 30/.4), "
   "inset 0 0 0 1px rgb(140 100 45/.3)"),

 S("a-enamel", "Емайл — кремаво тяло с кехлибарен кант",
   "Обръщането на предишния: тялото е кремаво, кантът е в избрания цвят. Черешата остава "
   "свободна за цените.",
   "radial-gradient(38% 60% at 26% 14%, rgb(255 255 255/.95), transparent 66%), "
   "linear-gradient(180deg, #FFFFFF 0%, #F7F3EC 60%, #E9E1D6 100%)",
   "none", "auto", "normal, normal", "#3A1D20",
   "inset 0 0 0 3px var(--g-core), inset 0 0 0 4px rgb(0 0 0/.10), "
   "inset 0 -8px 14px -10px rgb(0 0 0/.18)", wordclip=False),

 S("a-ply", "Шперплат — новият комплект",
   "Права, спокойна шарка — далеч по-питомна от ореха отпреди. Топло и „работилнично\".",
   "linear-gradient(180deg, #C79A66, #A87845)", f"url({PLY_C})", "240px 240px",
   "normal, normal", "#FFF6E9",
   "inset 0 1px 0 rgb(255 255 255/.25), inset 0 -8px 14px -10px rgb(60 35 12/.5), "
   "inset 0 0 0 1px rgb(80 50 20/.4)"),

 S("a-paper", "Кехлибарена хартия — крафт",
   "Матово, влакнесто, в тона. Чете като етикет — виж дали още изглежда натиснаем.",
   "linear-gradient(180deg, var(--g-hi), var(--g-light))", f"url({TEX['paper']})",
   "160px 160px", "overlay, normal", "#3A1D20",
   "inset 0 0 0 1px rgb(120 90 40/.3), 0 1px 0 rgb(255 255 255/.6)"),

 S("a-linen", "Кехлибарен лен",
   "Тъканта в тона. Топло, но зърното още спори с дребния текст.",
   "linear-gradient(180deg, var(--g-light), var(--g-core))", f"url({TEX['linen']})",
   "120px 120px", "overlay, normal", "#3A1D20",
   "inset 0 0 0 1px rgb(110 80 35/.35), inset 0 -6px 12px -10px rgb(80 55 20/.4)"),

 S("a-terra", "Кехлибарена теракота",
   "Печена глина в тона — по-светла от предишната, затова се отделя по-добре от кларета.",
   "linear-gradient(180deg, var(--g-light), var(--g-shadow))", f"url({TEX['terra']})",
   "170px 170px", "overlay, normal", "#3A1D20",
   "inset 0 1px 0 rgb(255 255 255/.25), inset 0 -8px 14px -10px rgb(70 40 10/.45), "
   "inset 0 0 0 1px rgb(95 60 20/.4)"),
]

introA = ('<div class="intro"><h1>Кехлибар, в единайсет материала</h1>'
  '<p>Цветът е решен: <b>36 / 88 / −2</b>. Затова тук вече не се мени той — мени се '
  '<b>материалът</b>, а тонът се държи същият навсякъде, където материалът изобщо може да '
  'бъде тониран. Трите нови комплекта, които сложи в папката, са вътре: белият мрамор '
  '(и като студен камък, и тониран в кехлибар), опалът/седефът, и шперплатът.</p>'
  '<p><small><b>Едно, което не мога:</b> <code>SurfaceImperfectionsSubstance002.sbsar</code> '
  'е компилиран Substance файл — чете се само от Substance Designer/Player, не от този '
  'конвейер. Ако ти трябва точно той, изнеси го от Substance като PNG (base color, '
  'roughness, height) и го изпичам.</small></p>'
  '<p><small>Белият мрамор носи <b>празна</b> height карта (само нули) и почти плоска '
  'normal — цялата информация в комплекта е в албедото. Затова жилките идват от него, '
  'а не от геометрия.</small></p></div>')
open("palette20.html", "w", encoding="utf-8").write(HEAD + introA + "".join(A) + "</html>")

# ── DECK B: glow ─────────────────────────────────────────────────────────────
GLOW_HALO = ("0 0 0 1px rgb(255 214 140/.35), 0 0 18px 2px hsl(38 95% 60% / .55), "
             "0 0 46px 10px hsl(36 95% 58% / .30)")
B = [
 S("b-none", "Без сияние — контролата",
   "Кехлибар, повърхност E. Оттук нататък всичко добавя светлина.",
   SURF_E, f"url({METAL})", "150px 150px", "overlay, normal", "#3A1D20", RIM_E,
   metal=True, textsurface="var(--text-spot)"),

 S("b-bloom", "Външно сияние (bloom)",
   "Два меки ореола около елемента — един тесен и ярък, един широк и слаб. Само "
   "<code>box-shadow</code>: не размива нищо, не струва слой, работи и на слаб телефон.",
   SURF_E, f"url({METAL})", "150px 150px", "overlay, normal", "#3A1D20",
   RIM_E.replace("var(--rim-E)", "var(--rim-E)") + ", " + GLOW_HALO,
   metal=True, textsurface="var(--text-spot)"),

 S("b-litrim", "Светещ ръб вместо тъмен — „свети отвътре\"",
   "*** Обръщането на ръба е най-евтиният начин да изглежда полупрозрачно. *** Тъмният ръб "
   "казва „плътен предмет\"; светлият казва „светлината минава през мен\" — кехлибар, смола, "
   "стъкло. Същата една декларация, обърнати цветове.",
   "radial-gradient(60% 120% at 50% 60%, var(--g-vanilla) 0%, var(--g-light) 45%, "
   "var(--g-core) 100%)",
   f"url({METAL})", "150px 150px", "overlay, normal", "#3A1D20",
   "inset 0 0 0 1px hsl(42 100% 88% / .8), inset 0 8px 16px -10px hsl(45 100% 92% / .9), "
   "inset 0 -10px 20px -12px hsl(30 90% 55% / .8), "
   "inset 12px 0 22px -16px hsl(45 100% 90% / .7), "
   "inset -12px 0 22px -16px hsl(45 100% 90% / .7)", metal=True),

 S("b-backlit", "Подсветен оникс — светлина зад камъка",
   "Мраморът, тониран в кехлибар, но осветен ОТЗАД: ярко ядро, което гасне към ръбовете. "
   "Така изглежда алабастър или оникс с лампа зад него — и това е най-близкото до „течно "
   "злато с магия\".",
   "radial-gradient(52% 100% at 50% 55%, hsl(45 100% 82%) 0%, var(--g-light) 38%, "
   "var(--g-core) 72%, var(--g-shadow) 100%)",
   f"url({MARBLE_M})", "210px 210px", "overlay, normal", "#3A1D20",
   "inset 0 0 0 1px hsl(40 90% 70% / .55), inset 0 -10px 18px -12px var(--g-deep), " + GLOW_HALO),

 S("b-candle", "Свещ — топлина отдолу",
   "Светлината идва ОТДОЛУ, както от свещ в кехлибарен буркан. Магазинът продава точно "
   "това, така че жестът е на място, а не заимстван.",
   "radial-gradient(75% 130% at 50% 108%, hsl(45 100% 80%) 0%, var(--g-light) 32%, "
   "var(--g-core) 62%, var(--g-shadow) 100%)",
   f"url({METAL})", "150px 150px", "overlay, normal", "#3A1D20",
   "inset 0 -1px 0 hsl(45 100% 85% / .8), inset 0 -14px 22px -14px hsl(45 100% 80% / .9), "
   "inset 0 10px 18px -12px var(--g-deep), 0 0 22px 2px hsl(38 95% 58% / .40)", metal=True),

 S("b-glints", "Искри по повърхността",
   "Четирилъчните звезди на сайта, но <b>неподвижни</b> и вградени в самата повърхност — "
   "две-три на елемент. Мотивът вече е наш; тук просто спира да е само фон.",
   "radial-gradient(closest-side circle at 22% 26%, hsl(48 100% 96%) 0%, "
   "hsl(45 100% 88% / .55) 22%, transparent 62%), "
   "radial-gradient(closest-side circle at 74% 68%, hsl(48 100% 96%) 0%, "
   "hsl(45 100% 88% / .45) 18%, transparent 55%), "
   "radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, "
   "transparent 74%), "
   "linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, var(--g-shadow) 100%)",
   f"url({METAL})", "150px 150px", "overlay, normal, normal, normal, normal", "#3A1D20",
   RIM_E, metal=True, textsurface="var(--text-spot)"),

 S("b-full", "Всичко заедно — сияние + светещ ръб + искри",
   "Максимумът, за да се види къде е границата. Ако това изглежда прекалено, отговорът е "
   "някъде между него и контролата — а не че идеята е грешна.",
   "radial-gradient(closest-side circle at 20% 24%, hsl(48 100% 97%) 0%, "
   "hsl(45 100% 88% / .6) 20%, transparent 58%), "
   "radial-gradient(closest-side circle at 78% 70%, hsl(48 100% 97%) 0%, "
   "hsl(45 100% 88% / .5) 16%, transparent 52%), "
   "radial-gradient(60% 120% at 50% 60%, var(--g-vanilla) 0%, var(--g-light) 45%, "
   "var(--g-core) 100%)",
   f"url({METAL})", "150px 150px", "overlay, normal, normal, normal", "#3A1D20",
   "inset 0 0 0 1px hsl(42 100% 88% / .8), inset 0 8px 16px -10px hsl(45 100% 92% / .9), "
   "inset 0 -10px 20px -12px hsl(30 90% 55% / .8), " + GLOW_HALO, metal=True),
]

introB = ('<div class="intro"><h1>Сияние — да вържем акцента с искрите</h1>'
  '<p>Идеята ти е права и има точно име: досега правехме материала <b>отразяващ</b>, а '
  'магията идва от материал, който <b>излъчва</b>. Седем стъпки, от нула до много.</p>'
  '<p><b>Нищо тук не се движи.</b> Помитащият блясък беше отхвърлен като „хазартен\" и '
  'остава отхвърлен — това са статични светлини, не анимации.</p>'
  '<p><small><b>Цена, честно:</b> сиянието е <code>box-shadow</code> и вътрешни градиенти — '
  'композира се на GPU, не размива фон и не е слой в повече. Единственото скъпо нещо в '
  'целия списък би било <code>backdrop-filter</code>, който тук НЕ използвам.</small></p>'
  '<p><small>А ако нещо от това ти хареса, най-естественото място за него е героичният '
  'бутон, значката и панделката — не мрежата от карти, където двайсет ореола ще се '
  'превърнат в шум.</small></p></div>')
open("palette21.html", "w", encoding="utf-8").write(HEAD + introB + "".join(B) + "</html>")

print("palette20.html", os.path.getsize("palette20.html")//1024, "KB")
print("palette21.html", os.path.getsize("palette21.html")//1024, "KB")
