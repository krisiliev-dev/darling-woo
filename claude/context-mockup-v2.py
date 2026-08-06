#!/usr/bin/env python3
"""palette16.html — SEVEN full-page mockups, one per gold, saturated honey/orange family.

Locked by Kris this round: mask = rim + ends, accent strength = 1, quiet-centre band.
Open: the colour. So everything else is identical across the four pages and only the
three ramp numbers change — which is the only fair way to compare them.
"""
import base64, os
from PIL import Image

def uri(path, px=256, q=60):
    im = Image.open(path).resize((px, px), Image.LANCZOS)
    p = "/tmp/w_" + os.path.basename(path)
    im.save(p, quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(open(p, "rb").read()).decode()

BASE = uri("tex-m65-map.webp", 256, 60)
ACC = uri("tex-et102-map.webp", 256, 58)
MASK = "radial-gradient(72% 210% at 50% 50%, transparent 0 38%, #000 100%)"

GOLDS = [
    ("honeysat",  "1. Мед, вдигната наситеност", 40, 86,  0),
    ("amber",     "2. Кехлибар",                 36, 88, -2),
    ("orangehon", "3. Оранжев мед",              32, 90,  0),
    ("orangegold","4. Портокалово злато",        28, 92,  2),
    ("honeydark", "5. Наситен мед, по-тъмен",    38, 84, -5),
    ("deephoney", "6. Тъмен мед (предишният, за сравнение)", 39, 70, -6),
    ("yellow",    "7. Жълто (отхвърленото, за сравнение)",   48, 82,  0),
]

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#8d8d97;color:#3A1D20;
	font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif}
.label{position:sticky;top:0;z-index:50;background:#241214;color:#FFF6E9;
	padding:11px 20px;font-size:13px;letter-spacing:.10em;text-transform:uppercase}
.label b{color:#F0BCC4}
.page{background:#E6E6EC;margin:0 0 44px;overflow:hidden}

/* ── the metal primitive, exactly as decided ─────────────────────────────── */
.d-metal{position:relative;isolation:isolate;overflow:hidden;
	background-color:var(--g-core);
	background-image:var(--base),var(--band-quiet);
	background-blend-mode:overlay,normal;
	background-size:150px 150px,auto}
.d-metal::after{content:"";position:absolute;inset:0;pointer-events:none;
	background-image:var(--acc);background-size:190px 190px;
	mix-blend-mode:overlay;opacity:1;
	-webkit-mask-image:var(--mask);mask-image:var(--mask);
	-webkit-mask-size:100% 100%;mask-size:100% 100%}
.d-metal--text{background-image:var(--base),var(--band-text);
	background-blend-mode:overlay,normal;   /* WITHOUT this the grey map covers the ramp
	                                           and the wordmark renders grey in every variant */
	-webkit-background-clip:text;background-clip:text;
	-webkit-text-fill-color:transparent;color:var(--g-core);
	background-size:220px 220px,auto}
.d-metal--text::after{content:none}

.hdr{background:#E6E6EC;border-bottom:1px solid #D4D4DD;
	display:flex;align-items:center;gap:26px;padding:16px 44px}
.word{font:700 30px/1 "Playfair Display",Georgia,serif;letter-spacing:.01em}
.nav{display:flex;gap:22px;font-size:15px;margin-left:8px}
.nav span{padding:8px 0}
.search{margin-left:auto;background:#fff;border:1px solid #C2C2CD;border-radius:999px;
	padding:11px 20px;color:#8a7076;font-size:14px;min-width:290px}
.icons{display:flex;gap:14px;font-size:19px}

.hero{background:#9E1B32;color:#FFF6E9;padding:64px 44px 70px}
.hero-in{max-width:660px}
.hero h1{font:700 clamp(34px,4vw,54px)/1.08 "Playfair Display",Georgia,serif;margin:0 0 14px}
.hero h1 i{display:block;font-style:italic}
.hero p{font-size:18px;opacity:.93;margin:0 0 26px;max-width:44ch}
.btn{display:inline-block;border:0;cursor:pointer;font:600 17px/1 Inter,sans-serif;
	padding:17px 34px;border-radius:999px;color:#3A1D20;
	box-shadow:0 2px 0 rgb(0 0 0/.22),0 8px 18px rgb(0 0 0/.22)}
.btn-cherry{background:#D42A3C;color:#FFF6E9;box-shadow:0 2px 0 rgb(0 0 0/.14)}

.sect{padding:52px 44px}
.sect h2{font:700 27px/1.2 "Playfair Display",Georgia,serif;margin:0 0 20px}
.cats{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
.cat{border-radius:14px;overflow:hidden;background:#D4D4DD;aspect-ratio:3/4;
	position:relative;display:flex;align-items:flex-end;padding:12px;font-size:13px;font-weight:600}
.cat i{position:absolute;inset:0;background:linear-gradient(160deg,#cfc7c0,#a89a92)}
.cat span{position:relative;color:#fff;text-shadow:0 1px 3px rgb(0 0 0/.5)}

.prods{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.card{background:#fff;border-radius:16px;padding:14px;box-shadow:0 1px 0 #D4D4DD}
.ph{aspect-ratio:1;border-radius:10px;background:linear-gradient(150deg,#eee9e4,#d8cec6);margin-bottom:12px;position:relative}
.badge{position:absolute;top:10px;left:10px;padding:5px 12px;border-radius:999px;
	font-size:11.5px;font-weight:700;letter-spacing:.05em;color:#3A1D20}
.card h3{font-size:15px;margin:0 0 6px;line-height:1.35;height:2.7em;overflow:hidden}
.price{font-weight:700;color:#B01F30;font-variant-numeric:tabular-nums;margin-bottom:12px}
.price small{font-size:.72em;color:#7a5b60;font-weight:400}
.card .btn{width:100%;text-align:center;font-size:15px;padding:14px 10px}

.trust{background:#DEDEE6;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:34px 44px}
.trust div{font-size:14.5px}
.trust b{display:block;font-size:15.5px;margin-bottom:2px}
.tick{display:inline-block;width:26px;height:26px;border-radius:50%;margin-right:9px;vertical-align:-7px}

.news{background:#9E1B32;color:#FFF6E9;text-align:center;padding:56px 44px}
.news h2{font:700 30px/1.2 "Playfair Display",Georgia,serif;margin:0 0 8px}
.news p{opacity:.9;margin:0 0 22px}
.newsrow{display:flex;gap:12px;max-width:560px;margin:0 auto}
.newsrow input{flex:1;border:0;border-radius:999px;padding:16px 22px;font-size:15px}

.foot{background:#E6E6EC;padding:44px;display:grid;grid-template-columns:1fr auto 1fr;gap:40px;
	border-top:1px solid #D4D4DD}
.foot h4{font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#7a5b60}
.foot a,.foot span{display:block;font-size:14.5px;color:#3A1D20;text-decoration:none;padding:6px 0}
.footmid{text-align:center}
.footword{font:700 34px/1 "Playfair Display",Georgia,serif;margin-bottom:6px}
.bow{width:54px;height:54px;margin:0 auto 10px;border-radius:14px}
.legal{grid-column:1/-1;border-top:1px solid #D4D4DD;padding-top:16px;display:flex;
	justify-content:space-between;font-size:13px;color:#7a5b60}
.rule{height:3px;border-radius:2px;margin:26px 0}
"""

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
	/* metal TEXT stays in the dark half — the sprint-46 fix */
	--band-text: linear-gradient(102deg, var(--g-deep) 0%, var(--g-shadow) 22%,
		var(--g-core) 40%, var(--g-shadow) 58%, var(--g-deep) 78%, var(--g-shadow) 100%);
"""

CATS = ["За кухнята", "За банята", "Текстил", "Свещи и аромати", "Съдове", "Подаръци"]
PRODS = [("Керамична купа „Роса\"", "24,90", "48,70"),
         ("Ленена кърпа за ръце, 50×70", "12,50", "24,45"),
         ("Ароматна свещ „Смокиня и кедър\"", "18,00", "35,20"),
         ("Стъклен буркан с бамбуков капак", "9,80", "19,17")]

def page(key, name, hue, sat, lift):
    cats = "".join(f'<div class="cat"><i></i><span>{c}</span></div>' for c in CATS)
    prods = "".join(f"""
      <div class="card"><div class="ph">{'<span class="badge d-metal" data-metal="1">Ново</span>' if i == 0 else ''}</div>
        <h3>{t}</h3><div class="price">€{e} <small>/ {b} лв.</small></div>
        <button class="btn btn-cherry">Добавяне в количката</button></div>"""
        for i, (t, e, b) in enumerate(PRODS))
    return f"""
<div class="label">Вариант: <b>{name}</b> &nbsp;·&nbsp; hue {hue} / sat {sat} / lift {lift}
 &nbsp;·&nbsp; ръб+краища, сила 1, тиха среда на лентата</div>
<div class="page" data-page="{key}" style="--gh:{hue};--gs:{sat};--gl:{lift}">

  <div class="hdr">
    <div class="word d-metal--text" data-metal="1">Дарлинг</div>
    <div class="nav"><span>Продукти</span><span>За нас</span><span>Помощ</span><span>Контакти</span></div>
    <div class="search">Какво търсиш, darling?</div>
    <div class="icons">♡ ⌂ ⌕</div>
  </div>

  <div class="hero"><div class="hero-in">
    <h1>Красивите неща са за всеки ден,<i>не само за гости.</i></h1>
    <p>Подбрано за дома, честно обозначено, доставено от Свищов до вратата ти.</p>
    <button class="btn d-metal" data-metal="1">Разгледай магазина</button>
  </div></div>

  <div class="sect"><h2>Разгледай по категория</h2><div class="cats">{cats}</div>
    <div class="rule d-metal" data-metal="1"></div>
    <h2>Изборът на Lady D</h2><div class="prods">{prods}</div>
  </div>

  <div class="trust">
    <div><span class="tick d-metal" data-metal="1"></span><b>Наложен платеж</b>Плащаш при доставка.</div>
    <div><span class="tick d-metal" data-metal="1"></span><b>Връщане до 14 дни</b>Без обяснения.</div>
    <div><span class="tick d-metal" data-metal="1"></span><b>Безплатно над €77</b>До офис или до адрес.</div>
  </div>

  <div class="news"><h2>Остани наблизо, darling</h2>
    <p>Нови неща, малки идеи за дома и по някоя добра оферта.</p>
    <div class="newsrow"><input placeholder="твоята поща"><button class="btn d-metal" data-metal="1">Записване</button></div>
  </div>

  <div class="foot">
    <div><h4>Помощ</h4><a>Доставка</a><a>Връщане</a><a>Често задавани въпроси</a><a>Контакти</a></div>
    <div class="footmid">
      <div class="bow d-metal" data-metal="1"></div>
      <div class="footword d-metal--text" data-metal="1">Дарлинг</div>
      <span>Красиви неща за всеки ден.</span>
    </div>
    <div><h4>Информация</h4><span>„Дарлинг 7\" ООД · ЕИК 206094211</span><span>ул. Хан Аспарух 1, Свищов</span>
      <a>+359 893 361 670</a><a>orders@darlinghome.bg</a></div>
    <div class="legal"><span>© 2026 Дарлинг</span><span>Правила и условия · 1 EUR = 1,95583 лв.</span></div>
  </div>
</div>"""

body = "".join(page(*g) for g in GOLDS)
html = f"""<!doctype html><html lang="bg"><meta charset="utf-8">
<title>Дарлинг — четирите злата в контекст</title>
<style>:root{{--base:url({BASE});--acc:url({ACC});--mask:{MASK}}}
.page{{{RAMP}}}{CSS}</style>
{body}
</html>"""
open("palette16.html", "w", encoding="utf-8").write(html)
print("palette16.html", os.path.getsize("palette16.html") // 1024, "KB")
