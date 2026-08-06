#!/usr/bin/env python3
"""Full-page mockups, two decks:
   palette18.html — the four remaining GOLDS on surface E (body + spot + real rim)
   palette19.html — ELEVEN MATERIALS: what the brand looks like if the accent is not gold
"""
import base64, os, sys
from PIL import Image

def uri(path, px=256, q=62):
    im = Image.open(path).resize((px, px), Image.LANCZOS)
    p = "/tmp/z_" + os.path.basename(path)
    im.save(p, quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(open(p, "rb").read()).decode()

TEX = {k: uri(f"mat-{k}.webp") for k in ("paper", "linen", "stone", "wood", "terra", "glaze")}
METAL = uri("tex-m65-map.webp", 256, 60)
ACC = uri("tex-et102-map.webp", 256, 58)
MASK = "radial-gradient(72% 210% at 50% 50%, transparent 0 38%, #000 100%)"

RAMP = """
	--g-vanilla: hsl(calc(var(--gh) + 9)  calc((var(--gs) + 8) * 1%) calc(93% + var(--gl) * 1%));
	--g-hi:      hsl(calc(var(--gh) + 6)  calc((var(--gs) + 6) * 1%) calc(82% + var(--gl) * 1%));
	--g-light:   hsl(calc(var(--gh) + 2)  calc(var(--gs) * 1%)       calc(68% + var(--gl) * 1%));
	--g-core:    hsl(var(--gh)            calc(var(--gs) * 1%)       calc(52% + var(--gl) * 1%));
	--g-shadow:  hsl(calc(var(--gh) - 9)  calc((var(--gs) + 6) * 1%) calc(38% + var(--gl) * 1%));
	--g-deep:    hsl(calc(var(--gh) - 17) calc((var(--gs) + 10) * 1%) calc(27% + var(--gl) * 1%));
	/* SURFACE E, the one Kris chose: even body, one specular, and the rim as inset shadow */
	--surface-E: radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%,
		transparent 74%), linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%,
		var(--g-shadow) 100%);
	--text-spot: radial-gradient(38% 120% at 22% 12%, var(--g-light) 0%, var(--g-core) 40%,
		transparent 72%), linear-gradient(180deg, var(--g-shadow) 0%, var(--g-deep) 100%);
	--rim-E:
		inset 0 0 0 1px hsl(var(--gh) calc(var(--gs)*1%) calc(34% + var(--gl)*1%) / .55),
		inset 0 9px 16px -11px var(--g-vanilla),
		inset 0 -11px 20px -11px var(--g-deep),
		inset 9px 0 18px -14px var(--g-deep),
		inset -9px 0 18px -14px var(--g-deep);
"""

# ── the golds ────────────────────────────────────────────────────────────────
GOLDS = [
    ("g5", "5. Наситен мед, по-тъмен — 38/84/−5", 38, 84, -5),
    ("g1", "1. Мед, вдигната наситеност — 40/86/0", 40, 86, 0),
    ("g2", "2. Кехлибар — 36/88/−2", 36, 88, -2),
    ("g6", "6. Тъмен мед — 39/70/−6", 39, 70, -6),
]

# ── the materials ────────────────────────────────────────────────────────────
# Each: (key, title, note, surface layers, tile, tile-size, blend, ink, rim, extra)
def M(key, title, note, surface, tile="none", tsz="150px 150px", blend="overlay, normal",
      ink="#3A1D20", rim="", extra="", bg="transparent"):
    return dict(key=key, title=title, note=note, surface=surface, tile=tile, tsz=tsz,
                blend=blend, ink=ink, rim=rim, extra=extra, bg=bg)

MATERIALS = [
    M("gold", "Злато — вариант 5, повърхност E (контролата)",
      "Това, до което стигнахме. Всичко останало долу се мери спрямо него.",
      "var(--surface-E)", f"url({METAL})", "150px 150px", "overlay, normal",
      "#3A1D20", "var(--rim-E)"),

    M("liquid", "Течно злато — стъклен блясък",
      "Същият цвят, но огледална повърхност: остър тесен блясък горе, дълбока сянка долу и "
      "ярък ръб. Прилича на емайл или на излято стъкло, не на кован метал.",
      "linear-gradient(180deg, rgb(255 255 255/.75) 0%, rgb(255 255 255/.10) 26%, "
      "rgb(0 0 0/.06) 52%, rgb(0 0 0/.30) 100%), "
      "radial-gradient(60% 40% at 30% 12%, rgb(255 255 255/.85), transparent 70%), "
      "linear-gradient(175deg, var(--g-light), var(--g-core) 55%, var(--g-deep))",
      "none", "auto", "normal, normal, normal", "#3A1D20",
      "inset 0 1px 0 rgb(255 255 255/.65), inset 0 -10px 18px -12px rgb(0 0 0/.55), "
      "inset 0 0 0 1px rgb(255 255 255/.28)"),

    M("frost", "Матово стъкло",
      "Полупрозрачно, размива каквото е отдолу. На кларета взема червен оттенък сам — "
      "затова изглежда различно в героя и във футъра, което е и чарът, и рискът.",
      "linear-gradient(180deg, rgb(255 255 255/.55), rgb(255 255 255/.22))",
      "none", "auto", "normal", "#3A1D20",
      "inset 0 1px 0 rgb(255 255 255/.7), inset 0 0 0 1px rgb(255 255 255/.35)",
      "backdrop-filter:blur(9px) saturate(1.3);-webkit-backdrop-filter:blur(9px) saturate(1.3)"),

    M("glaze", "Керамична глазура — порцелан",
      "Кремава глазура с мек, широк блясък. Най-близкото до това, което магазинът реално "
      "продава — и вероятно най-топлото на сивата страница.",
      "radial-gradient(70% 120% at 30% 8%, rgb(255 255 255/.9), transparent 62%), "
      "linear-gradient(180deg, #FFF8EE 0%, #F3E4CE 55%, #E3CDB0 100%)",
      f"url({TEX['glaze']})", "180px 180px", "overlay, normal, normal", "#3A1D20",
      "inset 0 1px 0 rgb(255 255 255/.9), inset 0 -8px 14px -10px rgb(120 90 60/.35), "
      "inset 0 0 0 1px rgb(150 120 90/.25)"),

    M("enamel", "Емайл — бяло с черешов кант",
      "Емайлирана посуда: плътно бяло, остър малък блясък и цветен кант. Много „домашно\", "
      "и кантът дава на черешата роля, вместо да я изхвърля.",
      "radial-gradient(38% 60% at 26% 14%, rgb(255 255 255/.95), transparent 66%), "
      "linear-gradient(180deg, #FFFFFF 0%, #F6F2EC 60%, #E6DED4 100%)",
      "none", "auto", "normal, normal", "#3A1D20",
      "inset 0 0 0 3px #D42A3C, inset 0 0 0 4px rgb(0 0 0/.10), "
      "inset 0 -8px 14px -10px rgb(0 0 0/.18)"),

    M("paper", "Хартия — матово, влакнесто",
      "Никакъв блясък. Държи се като етикет или като визитка, а не като бутон — "
      "виж дали още изглежда натиснаем.",
      "linear-gradient(180deg, #FFFBF2, #F4EADA)",
      f"url({TEX['paper']})", "160px 160px", "overlay, normal", "#3A1D20",
      "inset 0 0 0 1px rgb(120 100 80/.22), 0 1px 0 rgb(255 255 255/.8)"),

    M("linen", "Лен — тъкан текстил",
      "Тъканта чете като плат от два метра разстояние. Топло, но зърното спори с дребния текст.",
      "linear-gradient(180deg, #F0E6D6, #DFD0B9)",
      f"url({TEX['linen']})", "120px 120px", "overlay, normal", "#3A1D20",
      "inset 0 0 0 1px rgb(120 100 75/.28), inset 0 -6px 12px -10px rgb(90 70 50/.35)"),

    M("rubber", "Гума — матово, меко",
      "Никакъв спекулар, само мека вътрешна сянка. Изглежда като нещо, което се натиска — "
      "най-„бутоновият\" материал в целия списък, но е и най-далеч от лукс.",
      "linear-gradient(180deg, #4A4550 0%, #33303A 70%, #2A2831 100%)",
      "none", "auto", "normal", "#FFF6E9",
      "inset 0 1px 0 rgb(255 255 255/.10), inset 0 -6px 12px -8px rgb(0 0 0/.6), "
      "inset 0 0 0 1px rgb(0 0 0/.35)"),

    M("stone", "Камък / мрамор",
      "Студен и с жилки. Скъпо изглежда, но е СТУДЕН цвят до топъл кларет — вижда се "
      "най-добре точно на цяла страница.",
      "linear-gradient(180deg, #F2F1EE, #DAD8D3)",
      f"url({TEX['stone']})", "190px 190px", "overlay, normal", "#3A1D20",
      "inset 0 0 0 1px rgb(90 90 95/.28), inset 0 -8px 14px -10px rgb(60 60 65/.30)"),

    M("terra", "Теракота — печена глина",
      "Топло, матово, грубо. Много близо до цвета на кларета — рискът е, че бутонът "
      "престава да се отделя от червеното поле.",
      "linear-gradient(180deg, #C97B54, #A85C3C)",
      f"url({TEX['terra']})", "170px 170px", "overlay, normal", "#FFF6E9",
      "inset 0 1px 0 rgb(255 255 255/.22), inset 0 -8px 14px -10px rgb(70 30 15/.5), "
      "inset 0 0 0 1px rgb(90 45 25/.35)"),

    M("wood", "Дърво — орех",
      "Годишните кръгове са силни. На малка значка стават на каша; на широк бутон работят.",
      "linear-gradient(180deg, #A9764A, #7C5231)",
      f"url({TEX['wood']})", "200px 200px", "overlay, normal", "#FFF6E9",
      "inset 0 1px 0 rgb(255 255 255/.18), inset 0 -8px 14px -10px rgb(40 22 10/.55), "
      "inset 0 0 0 1px rgb(60 35 18/.4)"),
]

CSS_PAGE = """
*{box-sizing:border-box}
body{margin:0;background:#8d8d97;color:#3A1D20;font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif}
.label{position:sticky;top:0;z-index:50;background:#241214;color:#FFF6E9;padding:11px 20px;font-size:13px}
.label b{color:#F0BCC4}
.label i{font-style:normal;opacity:.75;display:block;font-size:12px;margin-top:2px}
.page{background:#E6E6EC;margin:0 0 44px;overflow:hidden}

.acc{position:relative;isolation:isolate;overflow:hidden;
	background-color:var(--bg);
	background-image:var(--tile),var(--surface);
	background-blend-mode:var(--blend);
	background-size:var(--tsz),100% 100%;background-repeat:repeat,no-repeat;
	color:var(--ink)}
.acc--metal::after{content:"";position:absolute;inset:0;pointer-events:none;
	background-image:var(--acc-tex);background-size:190px 190px;mix-blend-mode:overlay;
	-webkit-mask-image:var(--mask);mask-image:var(--mask);
	-webkit-mask-size:100% 100%;mask-size:100% 100%}

.hdr{background:#E6E6EC;border-bottom:1px solid #D4D4DD;display:flex;align-items:center;gap:26px;padding:16px 44px}
.word{font:700 30px/1 "Playfair Display",Georgia,serif;color:#3A1D20}
.word.clip{background-image:var(--tile),var(--textsurface);background-blend-mode:var(--blend);
	background-size:var(--tsz),100% 100%;background-repeat:repeat,no-repeat;
	-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.nav{display:flex;gap:22px;font-size:15px}
.search{margin-left:auto;background:#fff;border:1px solid #C2C2CD;border-radius:999px;
	padding:11px 20px;color:#8a7076;font-size:14px;min-width:290px}
.icons{display:flex;gap:14px;font-size:19px}

.hero{background:#9E1B32;color:#FFF6E9;padding:64px 44px 70px}
.hero h1{font:700 clamp(34px,4vw,54px)/1.08 "Playfair Display",Georgia,serif;margin:0 0 14px;max-width:660px}
.hero h1 i{display:block;font-style:italic}
.hero p{font-size:18px;opacity:.93;margin:0 0 26px;max-width:44ch}
.btn{display:inline-block;border:0;cursor:pointer;font:600 17px/1 Inter,sans-serif;
	padding:17px 34px;border-radius:999px;box-shadow:var(--rim),0 2px 0 rgb(0 0 0/.22),0 8px 18px rgb(0 0 0/.22)}
.btn-cherry{background:#D42A3C;color:#FFF6E9;box-shadow:0 2px 0 rgb(0 0 0/.14)}

.sect{padding:52px 44px}
.sect h2{font:700 27px/1.2 "Playfair Display",Georgia,serif;margin:0 0 20px}
.cats{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
.cat{border-radius:14px;overflow:hidden;aspect-ratio:3/4;position:relative;display:flex;
	align-items:flex-end;padding:12px;font-size:13px;font-weight:600;
	background:linear-gradient(160deg,#cfc7c0,#a89a92)}
.cat span{color:#fff;text-shadow:0 1px 3px rgb(0 0 0/.5)}
.prods{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.card{background:#fff;border-radius:16px;padding:14px}
.ph{aspect-ratio:1;border-radius:10px;background:linear-gradient(150deg,#eee9e4,#d8cec6);margin-bottom:12px;position:relative}
.badge{position:absolute;top:10px;left:10px;padding:6px 13px;border-radius:999px;font-size:11.5px;
	font-weight:700;box-shadow:var(--rim)}
.card h3{font-size:15px;margin:0 0 6px;line-height:1.35;height:2.7em;overflow:hidden}
.price{font-weight:700;color:#B01F30;font-variant-numeric:tabular-nums;margin-bottom:12px}
.price small{font-size:.72em;color:#7a5b60;font-weight:400}
.card .btn{width:100%;text-align:center;font-size:15px;padding:14px 10px}
.trust{background:#DEDEE6;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:34px 44px}
.trust b{display:block;font-size:15.5px}
.tick{display:inline-block;width:26px;height:26px;border-radius:50%;margin-right:9px;vertical-align:-7px;
	box-shadow:var(--rim)}
.news{background:#9E1B32;color:#FFF6E9;text-align:center;padding:56px 44px}
.news h2{font:700 30px/1.2 "Playfair Display",Georgia,serif;margin:0 0 8px}
.newsrow{display:flex;gap:12px;max-width:560px;margin:0 auto}
.newsrow input{flex:1;border:0;border-radius:999px;padding:16px 22px;font-size:15px}
.foot{background:#E6E6EC;padding:44px;display:grid;grid-template-columns:1fr auto 1fr;gap:40px;border-top:1px solid #D4D4DD}
.foot h4{font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#7a5b60}
.foot a,.foot span{display:block;font-size:14.5px;color:#3A1D20;text-decoration:none;padding:6px 0}
.footmid{text-align:center}
.footword{font:700 34px/1 "Playfair Display",Georgia,serif;margin-bottom:6px}
.bow{width:54px;height:54px;margin:0 auto 10px;border-radius:14px;box-shadow:var(--rim)}
.legal{grid-column:1/-1;border-top:1px solid #D4D4DD;padding-top:16px;display:flex;justify-content:space-between;
	font-size:13px;color:#7a5b60}
.rule{height:4px;border-radius:3px;margin:26px 0;box-shadow:var(--rim)}
.intro{background:#FFF6E9;padding:32px 44px;margin:0 0 28px}
.intro h1{font:700 30px/1.15 "Playfair Display",Georgia,serif;margin:0 0 10px}
.intro p{max-width:82ch}
.intro code{background:#EFE2D2;padding:1px 5px;border-radius:4px;font-size:13px}
"""

CATS = ["За кухнята", "За банята", "Текстил", "Свещи и аромати", "Съдове", "Подаръци"]
PRODS = [("Керамична купа „Роса\"", "24,90", "48,70"),
         ("Ленена кърпа за ръце, 50×70", "12,50", "24,45"),
         ("Ароматна свещ „Смокиня и кедър\"", "18,00", "35,20"),
         ("Стъклен буркан с бамбуков капак", "9,80", "19,17")]

def page(key, label, sub, style, metal_accent, textsurface, wordclip=True):
    cats = "".join(f'<div class="cat"><span>{c}</span></div>' for c in CATS)
    ac = "acc acc--metal" if metal_accent else "acc"
    wc = "clip" if wordclip else ""
    prods = "".join(f"""
      <div class="card"><div class="ph">{f'<span class="badge {ac}">Ново</span>' if i==0 else ''}</div>
        <h3>{t}</h3><div class="price">€{e} <small>/ {b} лв.</small></div>
        <button class="btn btn-cherry">Добавяне в количката</button></div>"""
      for i, (t, e, b) in enumerate(PRODS))
    return f"""
<div class="label"><b>{label}</b><i>{sub}</i></div>
<div class="page" data-page="{key}" style="{style}">
  <div class="hdr"><div class="word {wc}" style="--textsurface:{textsurface}">Дарлинг</div>
    <div class="nav"><span>Продукти</span><span>За нас</span><span>Помощ</span><span>Контакти</span></div>
    <div class="search">Какво търсиш, darling?</div><div class="icons">♡ ⌂ ⌕</div></div>
  <div class="hero"><h1>Красивите неща са за всеки ден,<i>не само за гости.</i></h1>
    <p>Подбрано за дома, честно обозначено, доставено от Свищов до вратата ти.</p>
    <button class="btn {ac}">Разгледай магазина</button></div>
  <div class="sect"><h2>Разгледай по категория</h2><div class="cats">{cats}</div>
    <div class="rule {ac}"></div>
    <h2>Изборът на Lady D</h2><div class="prods">{prods}</div></div>
  <div class="trust">
    <div><span class="tick {ac}"></span><b>Наложен платеж</b>Плащаш при доставка.</div>
    <div><span class="tick {ac}"></span><b>Връщане до 14 дни</b>Без обяснения.</div>
    <div><span class="tick {ac}"></span><b>Безплатно над €77</b>До офис или до адрес.</div></div>
  <div class="news"><h2>Остани наблизо, darling</h2>
    <p>Нови неща, малки идеи за дома и по някоя добра оферта.</p>
    <div class="newsrow"><input placeholder="твоята поща"><button class="btn {ac}">Записване</button></div></div>
  <div class="foot">
    <div><h4>Помощ</h4><a>Доставка</a><a>Връщане</a><a>Често задавани въпроси</a><a>Контакти</a></div>
    <div class="footmid"><div class="bow {ac}"></div>
      <div class="footword word {wc}" style="--textsurface:{textsurface}">Дарлинг</div>
      <span>Красиви неща за всеки ден.</span></div>
    <div><h4>Информация</h4><span>„Дарлинг 7\" ООД · ЕИК 206094211</span><span>ул. Хан Аспарух 1, Свищов</span>
      <a>+359 893 361 670</a><a>orders@darlinghome.bg</a></div>
    <div class="legal"><span>© 2026 Дарлинг</span><span>Правила и условия · 1 EUR = 1,95583 лв.</span></div></div>
</div>"""

HEAD = ('<!doctype html><html lang="bg"><meta charset="utf-8">\n'
        f'<style>:root{{--acc-tex:url({ACC});--mask:{MASK}}}\n'
        f'.page{{{RAMP}}}{CSS_PAGE}</style>\n')

# ── deck 1: the golds ────────────────────────────────────────────────────────
gold_pages = []
for key, name, h, s, l in GOLDS:
    style = (f"--gh:{h};--gs:{s};--gl:{l};--surface:var(--surface-E);--tile:url({METAL});"
             f"--tsz:150px 150px;--blend:overlay, normal;--ink:#3A1D20;--rim:var(--rim-E);"
             f"--bg:var(--g-core)")
    gold_pages.append(page(key, name, "повърхност E — тяло + петно + истински ръб",
                           style, True, "var(--text-spot)"))
intro1 = ('<div class="intro"><h1>Четирите злата, върху повърхност E</h1>'
          '<p>Повърхността вече е решена: тяло, едно петно и <b>ръб от inset сянки</b>, който '
          'следва формата. Логото е с петното, не с лента. Единственото, което се мени между '
          'страниците, са трите числа на рампата.</p></div>')
open("palette18.html", "w", encoding="utf-8").write(HEAD + intro1 + "".join(gold_pages) + "</html>")

# ── deck 2: the materials ────────────────────────────────────────────────────
mat_pages = []
for m in MATERIALS:
    style = (f"--gh:38;--gs:84;--gl:-5;--surface:{m['surface']};--tile:{m['tile']};"
             f"--tsz:{m['tsz']};--blend:{m['blend']};--ink:{m['ink']};"
             f"--rim:{m['rim'] or 'none'};--bg:{m['bg']};{m['extra']}")
    textsurface = "var(--text-spot)" if m["key"] == "gold" else m["surface"]
    PALE = {"frost", "glaze", "enamel", "paper", "linen", "stone"}
    mat_pages.append(page(m["key"], m["title"], m["note"], style, m["key"] == "gold",
                          textsurface, wordclip=m["key"] not in PALE))
intro2 = ('<div class="intro"><h1>Единайсет материала</h1>'
          '<p>Един и същ сайт, единайсет пъти — сменя се само материалът на акцентите: логото, '
          'героичният бутон, бутонът на нюзлетъра, значката, отметките, линията и панделката. '
          'Черешата и кларетът стоят непокътнати, за да е ясно кое се мени.</p>'
          '<p><b>Не се наложи да сваляш нищо.</b> Всички зърна тук са <b>генерирани</b> — '
          'хартия, лен, камък, дърво, теракота, глазура — като сиви карти по 0.6–29 KB, '
          'безшевни по построение и тонирани от CSS. Стъклото и емайлът нямат нужда дори от '
          'това: те са чист CSS.</p>'
          '<p><small>Ако след като видиш всичко искаш ФОТОГРАФСКИ мрамор или дърво — това е '
          'единственото, което не мога да сваля от тази сесия. Тогава ти теглиш от ambientCG '
          'или Poly Haven (и двете CC0) комплект с <code>color</code> + <code>roughness</code> '
          '+ <code>height</code>, слагаш го в папка, и го изпичам по същия конвейер.</small></p>'
          '</div>')
open("palette19.html", "w", encoding="utf-8").write(HEAD + intro2 + "".join(mat_pages) + "</html>")

print("palette18.html", os.path.getsize("palette18.html") // 1024, "KB")
print("palette19.html", os.path.getsize("palette19.html") // 1024, "KB")
