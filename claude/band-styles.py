#!/usr/bin/env python3
"""palette17.html — band styles. A band says SHEET; an object says BODY + SPECULAR.

Kris: „the big bands make it look like we have taken a cutout of a piece of metal,
whereas I want it to look like a piece of gold on its own. Can it not be highlights
instead of bands?"

He is describing a real difference in how light works. Banding across a form is the
reflection of a WIDE environment — a rolled sheet, a mirror, a car panel. A small solid
object is lit by a comparatively small source, so it shows a BODY TONE, one or two
SPECULAR HIGHLIGHTS, and a DARKER RIM where the surface turns away. So the six styles
below move along exactly that axis: from sheet to nugget.
"""
import base64, os
from PIL import Image

def uri(path, px=256, q=60):
    im = Image.open(path).resize((px, px), Image.LANCZOS)
    p = "/tmp/y_" + os.path.basename(path)
    im.save(p, quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(open(p, "rb").read()).decode()

BASE = uri("tex-m65-map.webp", 256, 60)
ACC = uri("tex-et102-map.webp", 256, 58)
MASK = "radial-gradient(72% 210% at 50% 50%, transparent 0 38%, #000 100%)"

COLOURS = [
    ("v5", "5. Наситен мед, по-тъмен (харесваш го)", 38, 84, -5),
    ("v1", "1. Мед, вдигната наситеност", 40, 86, 0),
    ("v2", "2. Кехлибар", 36, 88, -2),
    ("v6", "6. Тъмен мед (предишният)", 39, 70, -6),
]

# ── the six surfaces, sheet → nugget ─────────────────────────────────────────
STYLES = [
    ("band", "A. Сегашната лента (контрола)",
     "Отражение на широка среда — точно това чете като „изрязано от лист\".",
     "var(--band-quiet)"),

    ("bevel", "B. Скосяване: светло горе, тъмно долу",
     "Едно направление на светлината вместо шест. Вече е предмет, но още е плосък предмет.",
     "linear-gradient(180deg, var(--g-vanilla) 0%, var(--g-light) 16%, var(--g-core) 50%, "
     "var(--g-shadow) 86%, var(--g-deep) 100%)"),

    ("spec1", "C. Тяло + едно петно",
     "Тонът на тялото е равен; светлината е ЕДНО петно горе вляво. Най-близкото до „парче метал\".",
     "radial-gradient(58% 130% at 24% 18%, var(--g-vanilla) 0%, var(--g-light) 34%, transparent 72%), "
     "linear-gradient(180deg, var(--g-light) 0%, var(--g-core) 55%, var(--g-shadow) 100%)"),

    ("spec2", "D. Тяло + две петна",
     "Голямо меко петно и второ, малко и остро, на срещуположната страна — както се държи "
     "неравна повърхност с една лампа.",
     "radial-gradient(46% 120% at 22% 20%, var(--g-vanilla) 0%, var(--g-light) 38%, transparent 74%), "
     "radial-gradient(20% 60% at 78% 74%, var(--g-hi) 0%, transparent 70%), "
     "linear-gradient(170deg, var(--g-light) 0%, var(--g-core) 52%, var(--g-shadow) 100%)"),

    ("rim", "E. Тяло + петно + ИСТИНСКИ ръб  ⟵ препоръката",
     "Ръбът е inset сянка, не градиент — затова следва точно заоблянето на формата, било то "
     "хапче, кръг или квадрат. Това е разликата между „предмет\" и „прозорец към материал\".",
     "radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, transparent 74%), "
     "linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, var(--g-shadow) 100%)"),

    ("streak", "F. Надлъжен отблясък",
     "Едно източено петно по дългата ос — както четкан метал улавя светлината. "
     "Няма повтаряне, значи няма „лист\".",
     "radial-gradient(70% 15% at 50% 32%, var(--g-vanilla) 0%, var(--g-light) 45%, transparent 78%), "
     "linear-gradient(180deg, var(--g-light) 0%, var(--g-core) 48%, var(--g-shadow) 100%)"),
]

RAMP = """
	--g-vanilla: hsl(calc(var(--gh) + 9)  calc((var(--gs) + 8) * 1%) calc(93% + var(--gl) * 1%));
	--g-hi:      hsl(calc(var(--gh) + 6)  calc((var(--gs) + 6) * 1%) calc(82% + var(--gl) * 1%));
	--g-light:   hsl(calc(var(--gh) + 2)  calc(var(--gs) * 1%)       calc(68% + var(--gl) * 1%));
	--g-core:    hsl(var(--gh)            calc(var(--gs) * 1%)       calc(52% + var(--gl) * 1%));
	--g-shadow:  hsl(calc(var(--gh) - 9)  calc((var(--gs) + 6) * 1%) calc(38% + var(--gl) * 1%));
	--g-deep:    hsl(calc(var(--gh) - 17) calc((var(--gs) + 10) * 1%) calc(27% + var(--gl) * 1%));
	--band-quiet: linear-gradient(102deg, var(--g-deep) 0%, var(--g-core) 14%,
		var(--g-light) 30%, var(--g-vanilla) 50%, var(--g-light) 70%, var(--g-core) 86%,
		var(--g-deep) 100%);
	--band-text: linear-gradient(102deg, var(--g-deep) 0%, var(--g-shadow) 22%,
		var(--g-core) 40%, var(--g-shadow) 58%, var(--g-deep) 78%, var(--g-shadow) 100%);
	/* text lit by ONE highlight instead of a band: the spot sits at the top-left of the
	   word, so the letters stay dark enough to read and only their shoulders catch light */
	--text-spot: radial-gradient(38% 120% at 22% 12%, var(--g-light) 0%, var(--g-core) 40%,
		transparent 72%), linear-gradient(180deg, var(--g-shadow) 0%, var(--g-deep) 100%);
"""

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#E6E6EC;color:#3A1D20;font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1200px;margin:0 auto;padding:34px 22px 90px}
h1{font-size:30px;margin:0 0 8px}
h2{font-size:20px;margin:46px 0 6px;border-top:2px solid #C2C2CD;padding-top:20px}
p{max-width:82ch;margin:6px 0 12px}
.lede{font-size:17px;color:#4a2a2e}
small{color:#7a5b60}
code{background:#D4D4DD;padding:1px 5px;border-radius:4px;font-size:13px}
.claret{background:#9E1B32;border-radius:14px;padding:20px}
.grey{background:#E6E6EC;border:1px solid #C2C2CD;border-radius:14px;padding:20px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.cap{font-size:12.5px;margin:0 0 8px;min-height:5.4em;color:#F6DADE}
.cap b{color:#fff;font-size:13.5px}
.grey .cap{color:#7a5b60}.grey .cap b{color:#3A1D20}
.row{display:flex;flex-direction:column;gap:11px}
.shapes{display:flex;gap:11px;align-items:center}

.metal{position:relative;isolation:isolate;overflow:hidden;
	background-color:var(--g-core);
	background-image:var(--tex),var(--surface);
	background-blend-mode:overlay,normal;
	background-size:150px 150px,100% 100%;background-repeat:repeat,no-repeat}
.metal::after{content:"";position:absolute;inset:0;pointer-events:none;
	background-image:var(--acc);background-size:190px 190px;mix-blend-mode:overlay;
	-webkit-mask-image:var(--mask);mask-image:var(--mask);
	-webkit-mask-size:100% 100%;mask-size:100% 100%}

/* THE RIM. An inset shadow follows border-radius exactly, so one declaration works on a
   pill, a circle and a square alike — which a radial-gradient can never do. */
.rimmed{box-shadow:
	inset 0 0 0 1px hsl(var(--gh) calc(var(--gs)*1%) calc(34% + var(--gl)*1%) / .55),
	inset 0 9px 16px -11px var(--g-vanilla),
	inset 0 -11px 20px -11px var(--g-deep),
	inset 9px 0 18px -14px var(--g-deep),
	inset -9px 0 18px -14px var(--g-deep),
	0 2px 0 rgb(0 0 0/.22), 0 8px 18px rgb(0 0 0/.22) !important}
.btn{display:block;width:100%;border:0;cursor:pointer;font:600 16px/1 Inter,sans-serif;
	padding:16px 14px;border-radius:999px;color:#3A1D20;
	box-shadow:0 2px 0 rgb(0 0 0/.22),0 8px 18px rgb(0 0 0/.22)}
.badge{display:inline-block;padding:7px 15px;border-radius:999px;font-size:12px;font-weight:700;color:#3A1D20}
.chip{width:52px;height:52px;border-radius:14px;flex:0 0 auto}
.disc{width:52px;height:52px;border-radius:50%;flex:0 0 auto}
.tile{height:86px;border-radius:14px}
.word{font:700 34px/1.1 "Playfair Display",Georgia,serif;display:inline-block;
	background-image:var(--tex),var(--surface);background-blend-mode:overlay,normal;
	background-size:220px 220px,100% 100%;background-repeat:repeat,no-repeat;
	-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
	color:var(--g-core)}
table{border-collapse:collapse;font-size:13.5px;width:100%;margin-top:8px}
td,th{border-bottom:1px solid #C2C2CD;padding:7px 12px 7px 0;text-align:left}
th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#7a5b60}
.ok{color:#1d7a3a;font-weight:700}.no{color:#B01F30;font-weight:700}
.note{background:#FFF6E9;border-left:4px solid #D42A3C;padding:14px 18px;border-radius:0 10px 10px 0;margin:14px 0}
"""

def vars_(h, s, l, surface, extra=""):
    return f"--gh:{h};--gs:{s};--gl:{l};--surface:{surface};{extra}"

# 1. the six styles, all on variant 5
style_cells = []
for key, name, why, surface in STYLES:
    rim = "rimmed" if key == "rim" else ""
    style_cells.append(f"""
  <div style="{vars_(38,84,-5,surface)}" data-style="{key}">
    <p class="cap"><b>{name}</b><br>{why}</p>
    <div class="row">
      <button class="btn metal {rim}" data-probe="{key}">Купи сега</button>
      <button class="btn metal {rim}" data-probe="{key}-long">Добавяне в количката</button>
      <div class="shapes"><span class="badge metal {rim}">Ново</span>
        <span class="chip metal {rim}"></span><span class="disc metal {rim}"></span></div>
      <div class="tile metal {rim}"></div>
    </div>
  </div>""")

# 1b. the rim as an independent switch
toggle = []
for key, name, why, surface in STYLES:
    if key not in ("bevel", "spec1", "spec2", "streak"):
        continue
    toggle.append(f"""
  <div style="{vars_(38,84,-5,surface)}"><p class="cap"><b>{name.split('.')[0]} без ръб / с ръб</b></p>
    <div class="row">
      <button class="btn metal">Купи сега</button>
      <button class="btn metal rimmed">Купи сега</button>
      <div class="shapes"><span class="chip metal"></span><span class="chip metal rimmed"></span>
        <span class="disc metal"></span><span class="disc metal rimmed"></span></div>
    </div></div>""")

# 2. the three most object-like, across the colours he is still weighing
best = [s for s in STYLES if s[0] in ("spec1", "rim", "streak")]
cross = []
for key, name, why, surface in best:
    cells = "".join(f"""
    <div style="{vars_(h,s,l,surface)}"><p class="cap"><b>{cn}</b></p>
      <button class="btn metal rimmed">Купи сега</button></div>"""
      for cid, cn, h, s, l in COLOURS)
    cross.append(f'<h3 style="margin:22px 0 6px">{name}</h3>'
                 f'<div class="claret"><div class="g4">{cells}</div></div>')

# 3. the wordmark, banded vs spot-lit
words = "".join(f"""
  <div><p class="cap"><b>{cn}</b></p>
    <div style="{vars_(h,s,l,'var(--band-text)')}"><span class="word">Дарлинг</span></div>
    <div style="{vars_(h,s,l,'var(--text-spot)')}"><span class="word" data-spot="1">Дарлинг</span></div>
  </div>""" for cid, cn, h, s, l in COLOURS)

html = f"""<!doctype html><html lang="bg"><meta charset="utf-8">
<title>Дарлинг — лента или отблясък</title>
<style>:root{{--tex:url({BASE});--acc:url({ACC});--mask:{MASK}}}
[style*="--gh"]{{{RAMP}}}{CSS}</style>
<div class="wrap">

<h1>Лента или отблясък</h1>
<p class="lede">Ти описваш реална разлика в поведението на светлината, не вкусова.
<b>Лентата напряко на формата е отражение на ШИРОКА среда</b> — валцован лист, огледало,
капак на кола. Затова чете като „изрязано от нещо по-голямо\". Малък плътен предмет се
осветява от сравнително малък източник, затова показва <b>тон на тялото</b>, едно-две
<b>петна</b> и <b>по-тъмен ръб</b> там, където повърхността се извива настрани.
Шестте варианта долу вървят точно по тази ос: от лист към късче.</p>
<p><small>Всички са с цвят 5 (38/84/−5), със същата основа metal_0065 и същия маскиран
акцент по ръба. Мени се само повърхността отдолу. Показани са и върху различни форми —
кръгла значка, квадратно чипче, диск — защото формата е част от въпроса.</small></p>

<h2>1. Шестте повърхности</h2>
<div class="claret"><div class="g3">{''.join(style_cells)}</div></div>

<h2>1б. Ръбът като отделен ключ</h2>
<p>Ръбът не е част от повърхността — той е <b>отделен слой</b>, който може да се сложи
върху коя да е от тях. Всяка двойка долу е една и съща повърхност без и с него.</p>
<div class="claret"><div class="g4">{''.join(toggle)}</div></div>

<h2>2. Трите най-„предметни\", върху цветовете, които още обмисляш</h2>
<p><small>3 и 4 отпаднаха — прекалено оранжеви, както каза.</small></p>
{''.join(cross)}

<h2>3. И логото: лента срещу едно петно</h2>
<p>Горният ред във всяка двойка е сегашната тъмна лента; долният е <b>едно петно</b>,
поставено горе вляво, така че буквите остават тъмни и само раменете им хващат светлина.</p>
<div class="grey"><div class="g4">{words}</div></div>

<div class="note">
<p><b>Моята препоръка е E — тяло + едно петно + истински ръб</b>, и причината е конкретна:
ръбът е единственото нещо в целия списък, което казва „този предмет свършва тук\". Без него
всяка повърхност изглежда като прозорец към по-голям материал, колкото и красива да е.
Петното дава ПОСОКАТА на светлината; ръбът дава ГРАНИЦАТА. Заедно правят късче.</p>
<p><b>И технически ръбът е по-добър, отколкото очаквах:</b> направен е с <code>inset</code>
сянки, не с градиент, затова следва <code>border-radius</code> точно — една и съща
декларация работи върху хапче, кръг и квадрат, без да знае формата предварително. Точно
това искаше от текстурата и се оказа, че ръбът го дава по-чисто от нея.</p>
<p><b>Едно наблюдение, което не бях очаквал:</b> върху кръгла значка и диск лентата
изглежда най-зле — там „изрязаният лист\" е най-очевиден, защото очакваме малък предмет.
Върху широк бутон разликата е по-мека. Ако тръгнем по ръб+петно, най-много печели значката.</p>
</div>
</div></html>"""

open("palette17.html", "w", encoding="utf-8").write(html)
print("palette17.html", os.path.getsize("palette17.html") // 1024, "KB")
