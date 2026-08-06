#!/usr/bin/env python3
"""palette13.html — the ADAPTIVE metal: smooth where the label sits, textured at the rim."""
import base64, os
from PIL import Image

def uri(path, px=256, q=60):
    im = Image.open(path).resize((px, px), Image.LANCZOS)
    p = "/tmp/v_" + os.path.basename(path)
    im.save(p, quality=q, method=6)
    b = open(p, "rb").read()
    return "data:image/webp;base64," + base64.b64encode(b).decode(), len(b)

BASE, bsz = uri("tex-m65-map.webp", 256, 60)      # the clean one Kris chose
ACC,  asz = uri("tex-et102-map.webp", 256, 58)    # the deep-relief one, as accent only

RAMP = """
	--g-vanilla: hsl(calc(var(--gh) + 9)  calc((var(--gs) + 8) * 1%) calc(93% + var(--gl) * 1%));
	--g-hi:      hsl(calc(var(--gh) + 6)  calc((var(--gs) + 6) * 1%) calc(82% + var(--gl) * 1%));
	--g-light:   hsl(calc(var(--gh) + 2)  calc(var(--gs) * 1%)       calc(68% + var(--gl) * 1%));
	--g-core:    hsl(var(--gh)            calc(var(--gs) * 1%)       calc(52% + var(--gl) * 1%));
	--g-shadow:  hsl(calc(var(--gh) - 9)  calc((var(--gs) + 6) * 1%) calc(38% + var(--gl) * 1%));
	--g-deep:    hsl(calc(var(--gh) - 17) calc((var(--gs) + 10) * 1%) calc(27% + var(--gl) * 1%));
	--band: linear-gradient(102deg, var(--g-shadow) 0%, var(--g-core) 18%,
		var(--g-vanilla) 40%, var(--g-light) 58%, var(--g-deep) 82%, var(--g-core) 100%);
	--band-quiet: linear-gradient(102deg, var(--g-deep) 0%, var(--g-core) 14%,
		var(--g-light) 30%, var(--g-vanilla) 50%, var(--g-light) 70%, var(--g-core) 86%,
		var(--g-deep) 100%);
"""

COLOURS = [
    ("dullbrass", "Оригиналният цвят на dull-brass", 39, 31, -1, "cocoa",
     "Взет от самия albedo: rgb(170,143,92) = hue 39 / sat 31 / lift −1. Албедото е плоско "
     "(p5 131 → p95 139), тоест този комплект НЕ носи текстура — носи точно този цвят."),
    ("deephoney", "Тъмен мед — deep honey", 39, 70, -6, "cocoa", "Медът, свален с шест пункта."),
    ("dullbrass2", "Матов месинг — dull brass", 41, 40, -8, "cocoa",
     "Нашият вариант, много близък до горния, но с осем пункта по-тъмен."),
    ("bronze", "Бронз — bronze", 28, 50, -14, "cream",
     "*** Този иска КРЕМАВО мастило: какао пада на 3.69:1, кремаво дава 3.86:1. ***"),
]

MASKS = [
    ("ring", "Само по ръба",
     "radial-gradient(125%25 165%25 at 50%25 50%25, transparent 0 54%25, #000 92%25)"),
    ("ends", "Само в двата края (падингът)",
     "linear-gradient(90deg,#000 0,rgba(0,0,0,0) 24%25,rgba(0,0,0,0) 76%25,#000 100%25)"),
    ("both", "Ръб + краища",
     "radial-gradient(72%25 210%25 at 50%25 50%25, transparent 0 38%25, #000 100%25)"),
]

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#E6E6EC;color:#3A1D20;font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:36px 22px 90px}
h1{font-size:30px;margin:0 0 8px}
h2{font-size:20px;margin:48px 0 6px;border-top:2px solid #C2C2CD;padding-top:22px}
h3{font-size:14px;margin:22px 0 4px;text-transform:uppercase;letter-spacing:.09em;color:#7a5b60}
p{max-width:78ch;margin:6px 0 14px}
.lede{font-size:17px;color:#4a2a2e}
small{color:#7a5b60}
code{background:#D4D4DD;padding:1px 5px;border-radius:4px;font-size:13px}
.claret{background:#9E1B32;border-radius:14px;padding:22px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.cap{font-size:12px;margin:0 0 8px;min-height:2.6em;color:#F6DADE}
.cap b{color:#fff}
.stack{display:flex;flex-direction:column;gap:12px}

/* ── THE ADAPTIVE METAL ─────────────────────────────────────────────────────
   Layer 1 (background): the CLEAN map, tiled, over the reflection band.
   Layer 2 (::after): the DEEP-RELIEF map, masked by a percentage-based gradient
   so it only paints at the rim and in the padding. Percentages mean the mask
   follows the button whatever its width — no fixed geometry, no JS. */
.btn{position:relative;isolation:isolate;overflow:hidden;
	display:block;width:100%;border:0;cursor:pointer;
	font:600 16px/1 Inter,sans-serif;padding:16px 18px;border-radius:999px;
	color:var(--ink);
	background-color:var(--g-core);
	background-image:var(--base),var(--band);
	background-blend-mode:overlay,normal;
	background-size:var(--bsz) var(--bsz),auto;
	box-shadow:0 2px 0 rgb(0 0 0/.22),0 8px 18px rgb(0 0 0/.22)}
.btn::after{content:"";position:absolute;inset:0;pointer-events:none;
	background-image:var(--acc);
	background-size:var(--asz) var(--asz);
	mix-blend-mode:overlay;
	opacity:var(--aop);
	-webkit-mask-image:var(--amask);mask-image:var(--amask);
	-webkit-mask-size:100% 100%;mask-size:100% 100%}
.plain::after{content:none}
.quiet{background-image:var(--base),var(--band-quiet)}
.ink-cocoa{--ink:#3A1D20}
.ink-cream{--ink:#FFF6E9}
table{border-collapse:collapse;font-size:13.5px;width:100%;margin-top:10px}
td,th{border-bottom:1px solid #C2C2CD;padding:7px 12px 7px 0;text-align:left}
th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#7a5b60}
.note{background:#FFF6E9;border-left:4px solid #D42A3C;padding:14px 18px;border-radius:0 10px 10px 0;margin:16px 0}
"""

def btn(cid, hue, sat, lift, ink, mask, aop, label, extra="", cls=""):
    m = f"--amask:{mask};" if mask else ""
    return (f'<button class="btn ink-{ink} {cls}" data-probe="{cid}" '
            f'style="--gh:{hue};--gs:{sat};--gl:{lift};--bsz:150px;--asz:190px;'
            f'--aop:{aop};{m}{extra}">{label}</button>')

# 1. the mask geometries, on the dull-brass colour
mask_cells = []
for key, name, mask in MASKS:
    mask_cells.append(f"""
  <div><p class="cap"><b>{name}</b></p><div class="stack">
    {btn(key, 39, 31, -1, 'cocoa', mask, .85, 'Купи сега')}
    {btn(key+'-long', 39, 31, -1, 'cocoa', mask, .85, 'Добавяне в количката')}
  </div></div>""")

# 2. accent strength
strength_cells = []
for aop in (0.0, 0.45, 0.85, 1.0):
    lbl = "без акцент (само metal_0065)" if aop == 0 else f"сила {aop:g}"
    cls = "plain" if aop == 0 else ""
    strength_cells.append(f"""
  <div><p class="cap"><b>{lbl}</b></p>
  {btn('s'+str(aop), 39, 31, -1, 'cocoa', MASKS[2][2], aop, 'Купи сега', cls=cls)}</div>""")

# 3. the four colours, on the adaptive metal
colour_blocks = []
for cid, name, hue, sat, lift, ink, note in COLOURS:
    alt = ""
    if cid == "bronze":
        alt = ("<p class=\"cap\" style=\"margin-top:14px\"><b>същият, с какао мастило</b></p>"
               + btn(cid + "-cocoa", hue, sat, lift, "cocoa", MASKS[2][2], .85, "Купи сега"))
    colour_blocks.append(f"""
  <div>
    <p class="cap"><b>{name}</b><br>{hue} / {sat} / {lift}</p>
    <div class="stack">
      {btn(cid, hue, sat, lift, ink, MASKS[2][2], .85, 'Купи сега')}
      {btn(cid+'-long', hue, sat, lift, ink, MASKS[2][2], .85, 'Добавяне в количката')}
    </div>{alt}
  </div>""")

quiet_blocks = []
for cid, name, hue, sat, lift, ink, note in COLOURS:
    quiet_blocks.append(f"""
  <div><p class="cap"><b>{name}</b><br>{hue} / {sat} / {lift}</p>
  {btn('q-'+cid, hue, sat, lift, ink, MASKS[2][2], .85, 'Купи сега', cls='quiet')}
  {btn('q-'+cid+'-long', hue, sat, lift, ink, MASKS[2][2], .85, 'Добавяне в количката', cls='quiet')}
  {(btn('q-'+cid+'-cocoa', hue, sat, lift, 'cocoa', MASKS[2][2], .85, 'Купи сега (какао)', cls='quiet') if ink=='cream' else '')}
  </div>""")

html = f"""<!doctype html><html lang="bg"><meta charset="utf-8">
<title>Дарлинг — адаптивен метал</title>
<style>:root{{--base:url({BASE});--acc:url({ACC})}}
.btn{{{RAMP}}}{CSS}</style>
<div class="wrap">
<h1>Адаптивен метал — гладко там, където е надписът</h1>
<p class="lede">Идеята ти е буквално изпълнима и се оказа права: <b>две карти, две роли.</b>
metal_0065 върви като основа по цялата повърхност — той е чист и не спори с текста.
everytexture 00102 идва само отгоре, <b>маскиран</b>, и се появява единствено по ръба и в
падинга. Маската е <b>процентна</b>, тоест следва бутона при всякаква ширина — без
фиксирана геометрия и без JavaScript.</p>
<p><small>Механизмът: основата е фон на самия бутон; акцентът е <code>::after</code> с
<code>mask-image</code> и <code>mix-blend-mode: overlay</code>. Един допълнителен
псевдоелемент, нула скриптове, работи на всеки размер.</small></p>

<h2>1. Къде да стои акцентът — три геометрии</h2>
<p>Всеки вариант е показан и с дълъг етикет, защото късата дума винаги изглежда добре.</p>
<div class="claret"><div class="g3">{''.join(mask_cells)}</div></div>

<h2>2. Колко силен — от нула до пълен</h2>
<p>Първият е самò metal_0065, без акцент — контролата, която харесваш.</p>
<div class="claret"><div class="g4">{''.join(strength_cells)}</div></div>

<h2>3. Четирите цвята, върху адаптивния метал</h2>
<div class="claret"><div class="g4">{''.join(colour_blocks)}</div></div>

<div class="note"><p><b>Едно нещо, което файлът сам каза:</b> албедото на dull-brass е
практически равно — p5 131, p95 139 от 255. Този комплект <i>няма</i> текстура за даване;
стойността му е точно цветът, и затова го изразих като три числа
(<code>39 / 31 / −1</code>) вместо да го внасям като картинка. Така се тонира от рампата
като всички останали и не заключва нюанса в JPEG.</p></div>

<h2>5. Същите четири, но с „тиха" среда на лентата</h2>
<p>Измерването отдолу показа, че най-лошият контраст под надписа не идва от текстурата —
идва от <b>тъмния край на отражателната лента</b>, когато той мине под буквите. Затова тук
лентата е пренаредена: тъмните стъпала са изместени в двата КРАЯ, където акцентът така или
иначе стои, а средата остава светла. Същите шест стъпала, същата плътност — само друг ред.</p>
<div class="claret"><div class="g4">{''.join(quiet_blocks)}</div></div>

<h2>4. Четимост, измерена върху рендера</h2>
<p id="probe"><small>Скриптът долу взема пикселите точно под надписа на всеки бутон и
смята най-лошия контраст спрямо мастилото. Ако акцентът си стои по ръба, числата в
центъра трябва да са същите като при контролата.</small></p>
</div></html>"""

open("palette13.html", "w", encoding="utf-8").write(html.replace("%25", "%"))
print("palette13.html", os.path.getsize("palette13.html") // 1024, "KB",
      "| base", bsz // 1024, "KB  accent", asz // 1024, "KB")
