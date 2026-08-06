#!/usr/bin/env python3
"""palette27.html — the winner, at four glow strengths.

Kris chose: ШПЕРПЛАТ + сияние + светещ ръб + искри. His one reservation was that the glow
is „a bit too strong and intense", so the only thing left to pick is how far the dial turns.
Everything else on these four pages is identical and final.
"""
import os
from page8 import uri, page, HEAD

PLY = uri("strong-ply.webp", 256, 70)
AMBER = "--gh:36;--gs:88;--gl:-2"
BODY = ("radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, "
        "transparent 74%), linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, "
        "var(--g-shadow) 100%)")
GLINTS = ("radial-gradient(closest-side circle at 21% 25%, hsl(48 100% 96%) 0%, "
          "hsl(45 100% 88% / .6) 20%, transparent 58%), "
          "radial-gradient(closest-side circle at 76% 69%, hsl(48 100% 96%) 0%, "
          "hsl(45 100% 88% / .5) 16%, transparent 52%), ")
MASK_STRONG = "radial-gradient(64% 190% at 50% 50%, transparent 0 26%, #000 86%)"

def rim_lit(k):
    """The lit rim, with its brightness scaled by k. At k=1 this is what he saw."""
    a = lambda v: round(v * k, 3)
    return (f"inset 0 0 0 1px hsl(42 100% 88% / {a(.80)}), "
            f"inset 0 8px 16px -10px hsl(45 100% 92% / {a(.90)}), "
            f"inset 0 -10px 20px -12px hsl(30 90% 55% / {a(.80)}), "
            f"inset 12px 0 22px -16px hsl(45 100% 90% / {a(.70)}), "
            f"inset -12px 0 22px -16px hsl(45 100% 90% / {a(.70)})")

def bloom(k, spread=1.0):
    a = lambda v: round(v * k, 3)
    return (f"0 0 0 1px rgb(255 214 140/{a(.30)}), "
            f"0 0 {round(18*spread)}px 2px hsl(38 95% 60% / {a(.55)}), "
            f"0 0 {round(46*spread)}px {round(10*spread)}px hsl(36 95% 58% / {a(.30)})")

LEVELS = [
    ("g100", "100% — това, което видя", 1.00, 1.00),
    ("g75", "75%", 0.75, 0.90),
    ("g55", "55%  ⟵ моята препоръка", 0.55, 0.80),
    ("g40", "40% — почти само намек", 0.40, 0.70),
]

pages = []
for key, name, k, spread in LEVELS:
    style = (f"{AMBER};--surface:{GLINTS}{BODY};--tile:none;--tsz:auto;--blend:normal;"
             f"--ink:#3A1D20;--rim:{rim_lit(k)}, {bloom(k, spread)};--bg:var(--g-core);"
             f"--acc-tex:url({PLY});--acc-size:260px 260px;--acc-op:1;--mask2:{MASK_STRONG}")
    pages.append(page(key, f"Шперплат + сияние — {name}",
                      "Всичко останало е еднакво и окончателно: кехлибар 36/88/−2, "
                      "повърхност E, шперплатената карта като акцент по ръба, искрите на "
                      "място. Мени се само силата на светлината.", style, True,
                      "var(--text-spot)"))

EXTRA = """<style>
.acc--metal::after{background-size:var(--acc-size,190px 190px);opacity:var(--acc-op,1);
	-webkit-mask-image:var(--mask2,var(--mask));mask-image:var(--mask2,var(--mask))}
</style>"""

intro = ('<div class="intro"><h1>Победителят, на четири сили на светлината</h1>'
 '<p>Избра <b>шперплат + сияние + светещ ръб + искри</b>. Всичко по тези четири страници е '
 'идентично и окончателно — кехлибар <b>36 / 88 / −2</b>, повърхност E, шперплатената карта '
 'като акцент само по ръба и в падинга, искрите на място. <b>Мени се единствено силата.</b></p>'
 '<p>Скалата пипа две неща заедно: прозрачността на светещия ръб и на двата ореола навън. '
 'На 55% ръбът още се чете като светлина, но ореолът спира да оцветява кларета около '
 'бутона — това е границата, на която сиянието престава да личи като ефект.</p>'
 '<p><small>Забележката ти беше за WebGL ореола, но същият дял важи и тук, затова '
 'предпочетох да го покажа върху избрания материал, а не върху отхвърления.</small></p>'
 '<p><small><b>За WebGL — съгласен съм и с причината:</b> прозрачността взема цвета отдолу, '
 'затова кехлибарът се червенее върху кларета. Точно затова му трябваше излъчване, за да '
 'изглежда правилно — а материал, който има нужда от изкуствено светене, за да не приема '
 'цвета на фона си, вече не е стъкло. Оставяме го.</small></p></div>')

html = HEAD.replace("</style>", "</style>" + EXTRA, 1) + intro + "".join(pages) + "</html>"
open("palette27.html", "w", encoding="utf-8").write(html)
print("palette27.html", os.path.getsize("palette27.html") // 1024, "KB")
