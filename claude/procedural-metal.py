#!/usr/bin/env python3
"""palette15.html — three answers in one page:
   A. the wordmark band fixed (a metal TEXT band must stay in the dark half of the ramp)
   B. saturated honey/orange variants, shown on grey as well as claret
   C. a REAL procedural metal: a CSS Paint Worklet that paints each element from its own
      geometry and its own seed, with a device gate and a static fallback.
"""
import base64, os
from PIL import Image

def uri(path, px=256, q=60):
    im = Image.open(path).resize((px, px), Image.LANCZOS)
    p = "/tmp/x_" + os.path.basename(path)
    im.save(p, quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(open(p, "rb").read()).decode()

BASE = uri("tex-m65-map.webp", 256, 60)
ACC = uri("tex-et102-map.webp", 256, 58)
MASK = "radial-gradient(72% 210% at 50% 50%, transparent 0 38%, #000 100%)"

# ── B. saturated honey / orange family ────────────────────────────────────────
FAMILY = [
    ("Тъмен мед (предишният)", 39, 70, -6, "reference"),
    ("Мед, вдигната наситеност", 40, 86, 0, ""),
    ("Кехлибар", 36, 88, -2, ""),
    ("Оранжев мед", 32, 90, 0, ""),
    ("Портокалово злато", 28, 92, 2, ""),
    ("Наситен мед, по-тъмен", 38, 84, -5, ""),
    ("Жълто (за сравнение — „твърде крещящо\")", 48, 82, 0, "reference"),
]

# ── C. the paint worklet ──────────────────────────────────────────────────────
WORKLET = r"""
// darling-metal — procedural metal that reads the element's OWN geometry.
// Deterministic: the same seed always paints the same surface, so a repaint or a
// re-render never flickers, and the browser can cache the raster per size.
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}

registerPaint('darling-metal', class {
  static get inputProperties(){return ['--seed','--m-core','--m-light','--m-vanilla',
    '--m-shadow','--m-deep','--m-dents','--m-strength']}
  paint(ctx, size, p){
    const W=size.width, H=size.height, S=Math.min(W,H), L=Math.max(W,H);
    const seed = parseFloat(p.get('--seed')) || 1;
    const rnd  = mulberry32(Math.floor(seed*2654435761)%2147483647);
    const col = k => (p.get(k).toString().trim() || '#caa04a');
    const core=col('--m-core'), light=col('--m-light'), van=col('--m-vanilla'),
          shadow=col('--m-shadow'), deep=col('--m-deep');
    const dents = parseFloat(p.get('--m-dents')) || 12;
    const str   = parseFloat(p.get('--m-strength'));
    const k     = isNaN(str) ? 1 : str;

    // 1. THE BAND FOLLOWS THE FORM. A wide pill gets a horizontal sweep; a square
    //    badge gets a diagonal one. The angle is jittered per seed so no two are equal.
    const wide = W >= H;
    const a = (wide ? 0 : Math.PI/2) + (rnd()-0.5)*0.5;
    const cx=W/2, cy=H/2, r=L*0.62;
    const g = ctx.createLinearGradient(cx-Math.cos(a)*r, cy-Math.sin(a)*r,
                                       cx+Math.cos(a)*r, cy+Math.sin(a)*r);
    const jitter = 0.06*(rnd()-0.5);
    g.addColorStop(0, deep);
    g.addColorStop(Math.max(0.02,0.16+jitter), core);
    g.addColorStop(0.32+jitter, light);
    g.addColorStop(0.50+jitter, van);
    g.addColorStop(0.68+jitter, light);
    g.addColorStop(0.86+jitter, core);
    g.addColorStop(1, deep);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

    // 2. EDGE LIGHT AND EDGE SHADE, on OPPOSITE sides, chosen by the seed.
    //    This is what makes a flat fill read as a solid object rather than a sticker.
    const side = rnd();
    const lin = (x0,y0,x1,y1,c,al)=>{const q=ctx.createLinearGradient(x0,y0,x1,y1);
      q.addColorStop(0,c); q.addColorStop(1,'transparent');
      ctx.globalAlpha=al*k; ctx.fillStyle=q; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;};
    const t = Math.max(3, S*0.30);
    if (side < 0.5){ lin(0,0,0,t, van, .45); lin(0,H,0,H-t, deep, .5); }
    else           { lin(0,H,0,H-t, van, .38); lin(0,0,0,t, deep, .45); }
    if (wide){ lin(0,0,t*1.2,0, deep, .30); lin(W,0,W-t*1.2,0, deep, .30); }

    // 3. DENTS — the nugget. Position, size and depth all from the seed, and the
    //    RADIUS is a fraction of the element's short side, so a badge gets small
    //    dents and a hero button gets big ones. That is the „adapts to the shape" part.
    for (let i=0;i<dents;i++){
      const px=rnd()*W, py=rnd()*H, rr=S*(0.055+rnd()*0.15);
      const lit = rnd()<0.5;
      const d=ctx.createRadialGradient(px-rr*0.32, py-rr*0.32, rr*0.05, px, py, rr);
      d.addColorStop(0, lit? van : deep);
      d.addColorStop(0.55, lit? light : shadow);
      d.addColorStop(1, 'transparent');
      ctx.globalAlpha=(0.09+rnd()*0.13)*k;
      ctx.fillStyle=d; ctx.beginPath(); ctx.arc(px,py,rr,0,6.2832); ctx.fill();
    }
    // 3b. A MICRO PASS — twice as many, a third the size. Two scales of dent is what
    //     separates a hammered surface from a blurred one.
    for (let i=0;i<dents*2;i++){
      const px=rnd()*W, py=rnd()*H, rr=S*(0.018+rnd()*0.05);
      const lit = rnd()<0.5;
      const d=ctx.createRadialGradient(px-rr*0.3, py-rr*0.3, rr*0.05, px, py, rr);
      d.addColorStop(0, lit? van : deep);
      d.addColorStop(1, 'transparent');
      ctx.globalAlpha=(0.07+rnd()*0.11)*k;
      ctx.fillStyle=d; ctx.beginPath(); ctx.arc(px,py,rr,0,6.2832); ctx.fill();
    }
    ctx.globalAlpha=1;

    // 4. A FEW SCRATCHES. Straight, thin, mostly along the long axis — the marks a
    //    real surface picks up. Kept sparse: this is the difference between „worked
    //    metal" and „dirty".
    const n = 2 + Math.floor(rnd()*3);
    for (let i=0;i<n;i++){
      const y=rnd()*H, len=L*(0.25+rnd()*0.5), x=rnd()*W - len/2;
      const dy=(rnd()-0.5)*S*0.35;
      ctx.strokeStyle = rnd()<0.5 ? van : deep;
      ctx.globalAlpha=(0.10+rnd()*0.14)*k;
      ctx.lineWidth=Math.max(0.6, S*0.012);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+len,y+dy); ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
});
"""

GATE = r"""
// DEVICE GATE. The worklet is progressive enhancement in the strict sense: if any of
// these is false, `paint()` is simply never registered, the CSS falls back to the
// static tile, and nothing else changes.
(function(){
  var reasons=[];
  var force = location.hash === '#force';   // за да го видиш и на слаба машина
  if(!('paintWorklet' in CSS)) reasons.push('няма CSS Paint API (Firefox/Safari)');
  var cores = navigator.hardwareConcurrency || 4;
  var mem   = navigator.deviceMemory || 4;
  if(!force && cores <= 2) reasons.push('≤2 ядра');
  if(!force && mem  <  2)  reasons.push('<2 GB памет');
  try{ if(!force && matchMedia('(prefers-reduced-data: reduce)').matches) reasons.push('пестене на данни'); }catch(e){}
  var el=document.getElementById('gate');
  if(reasons.length){
    document.documentElement.classList.add('no-paint');
    if(el) el.textContent='Процедурният слой е ИЗКЛЮЧЕН: '+reasons.join(', ')+
      '. Виждаш статичната плочка — това е резервният вариант.';
    return;
  }
  var url=URL.createObjectURL(new Blob([document.getElementById('worklet').textContent],
          {type:'text/javascript'}));
  CSS.paintWorklet.addModule(url).then(function(){
    document.documentElement.classList.add('has-paint');
    if(el) el.textContent='Процедурният слой е ВКЛЮЧЕН ('+(navigator.hardwareConcurrency||'?')+
      ' ядра, '+(navigator.deviceMemory||'?')+' GB). Всеки бутон долу е нарисуван от собствения си seed.';
  }).catch(function(e){
    document.documentElement.classList.add('no-paint');
    if(el) el.textContent='Процедурният слой не се зареди ('+e+') — статична плочка.';
  });
})();
"""

RAMP = """
	--g-vanilla: hsl(calc(var(--gh) + 9)  calc((var(--gs) + 8) * 1%) calc(93% + var(--gl) * 1%));
	--g-light:   hsl(calc(var(--gh) + 2)  calc(var(--gs) * 1%)       calc(68% + var(--gl) * 1%));
	--g-core:    hsl(var(--gh)            calc(var(--gs) * 1%)       calc(52% + var(--gl) * 1%));
	--g-shadow:  hsl(calc(var(--gh) - 9)  calc((var(--gs) + 6) * 1%) calc(38% + var(--gl) * 1%));
	--g-deep:    hsl(calc(var(--gh) - 17) calc((var(--gs) + 10) * 1%) calc(27% + var(--gl) * 1%));
	--band-quiet: linear-gradient(102deg, var(--g-deep) 0%, var(--g-core) 14%,
		var(--g-light) 30%, var(--g-vanilla) 50%, var(--g-light) 70%, var(--g-core) 86%,
		var(--g-deep) 100%);
	/* A METAL TEXT BAND MUST STAY IN THE DARK HALF. On a light page the vanilla stop
	   lands mid-word and the letters dissolve — which is exactly what Kris saw. */
	--band-text: linear-gradient(102deg, var(--g-deep) 0%, var(--g-shadow) 22%,
		var(--g-core) 40%, var(--g-shadow) 58%, var(--g-deep) 78%, var(--g-shadow) 100%);
"""

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#E6E6EC;color:#3A1D20;font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1200px;margin:0 auto;padding:34px 22px 90px}
h1{font-size:30px;margin:0 0 8px}
h2{font-size:20px;margin:46px 0 6px;border-top:2px solid #C2C2CD;padding-top:20px}
h3{font-size:13.5px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.09em;color:#7a5b60}
p{max-width:80ch;margin:6px 0 12px}
small{color:#7a5b60}
code{background:#D4D4DD;padding:1px 5px;border-radius:4px;font-size:13px}
.claret{background:#9E1B32;border-radius:14px;padding:20px}
.grey{background:#E6E6EC;border:1px solid #C2C2CD;border-radius:14px;padding:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cap{font-size:12px;margin:0 0 7px;min-height:3em}
.claret .cap{color:#F6DADE}.claret .cap b{color:#fff}
.stack{display:flex;flex-direction:column;gap:10px}

.metal{position:relative;isolation:isolate;overflow:hidden;
	background-color:var(--g-core);
	background-image:var(--base),var(--band-quiet);
	background-blend-mode:overlay,normal;background-size:150px 150px,auto}
.metal::after{content:"";position:absolute;inset:0;pointer-events:none;
	background-image:var(--acc);background-size:190px 190px;mix-blend-mode:overlay;
	-webkit-mask-image:var(--mask);mask-image:var(--mask);
	-webkit-mask-size:100% 100%;mask-size:100% 100%}

/* the procedural surface replaces the two static layers entirely */
.has-paint .proc{background-image:paint(darling-metal);background-color:transparent;
	background-size:100% 100%;background-repeat:no-repeat}
.has-paint .proc::after{content:none}
.proc{--m-core:var(--g-core);--m-light:var(--g-light);--m-vanilla:var(--g-vanilla);
	--m-shadow:var(--g-shadow);--m-deep:var(--g-deep)}

.btn{display:block;width:100%;border:0;cursor:pointer;font:600 16px/1 Inter,sans-serif;
	padding:16px 14px;border-radius:999px;color:#3A1D20;
	box-shadow:0 2px 0 rgb(0 0 0/.22),0 8px 18px rgb(0 0 0/.22)}
.word{font:700 34px/1.1 "Playfair Display",Georgia,serif;display:inline-block;
	background-image:var(--base),var(--bandw);background-blend-mode:overlay,normal;
	background-size:220px 220px,auto;
	-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
	color:var(--g-core)}
.badge{display:inline-block;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;color:#3A1D20}
.tile{height:92px;border-radius:14px}
.gate{background:#241214;color:#FFF6E9;border-radius:10px;padding:12px 16px;font-size:13.5px;margin:12px 0}
table{border-collapse:collapse;font-size:13.5px;width:100%;margin-top:8px}
td,th{border-bottom:1px solid #C2C2CD;padding:7px 12px 7px 0;text-align:left}
th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#7a5b60}
.note{background:#FFF6E9;border-left:4px solid #D42A3C;padding:14px 18px;border-radius:0 10px 10px 0;margin:14px 0}
"""

def vars_(hue, sat, lift, extra=""):
    return f"--gh:{hue};--gs:{sat};--gl:{lift};{extra}"

# section A — the wordmark
words = "".join(f"""
  <div><p class="cap"><b>{n}</b><br>{h}/{s}/{l}</p>
    <div style="{vars_(h,s,l)}--bandw:var(--band-quiet)"><span class="word">Дарлинг</span></div>
    <div style="{vars_(h,s,l)}--bandw:var(--band-text)"><span class="word" data-fix="1">Дарлинг</span></div>
  </div>""" for n, h, s, l, _ in FAMILY[:4])

# section B — the family on both grounds
fam_claret, fam_grey = [], []
for n, h, s, l, tag in FAMILY:
    st = vars_(h, s, l)
    mark = " ⟵ за сравнение" if tag else ""
    fam_claret.append(f'<div style="{st}"><p class="cap"><b>{n}</b>{mark}<br>{h}/{s}/{l}</p>'
                      f'<div class="stack"><button class="btn metal">Купи сега</button>'
                      f'<div class="tile metal"></div></div></div>')
    fam_grey.append(f'<div style="{st}"><p class="cap" style="color:#7a5b60"><b style="color:#3A1D20">{n}</b><br>{h}/{s}/{l}</p>'
                    f'<div class="stack"><span class="badge metal">Ново</span>'
                    f'<div style="--bandw:var(--band-text)"><span class="word">Дарлинг</span></div>'
                    f'<div class="tile metal"></div></div></div>')

# section C — procedural, many seeds
proc = "".join(f"""
  <div style="{vars_(36,88,-2)}--seed:{seed};--m-dents:{d};--m-strength:1">
    <p class="cap"><b>seed {seed}</b></p>
    <div class="stack"><button class="btn metal proc">Купи сега</button>
      <button class="btn metal proc" style="--seed:{seed+0.5}">Добавяне в количката</button>
      <div class="tile metal proc" style="--seed:{seed+0.25}"></div></div>
  </div>""" for seed, d in [(3, 9), (11, 12), (27, 7), (48, 14)])

html = f"""<!doctype html><html lang="bg"><meta charset="utf-8">
<title>Дарлинг — процедурен метал</title>
<style>:root{{--base:url({BASE});--acc:url({ACC});--mask:{MASK}}}
[style*="--gh"]{{{RAMP}}}{CSS}</style>
<script type="text/worklet" id="worklet">{WORKLET}</script>
<div class="wrap">

<h1>Три отговора</h1>

<h2>1. Логото — ти беше прав, и причината е конкретна</h2>
<p>Лентата има <b>ванилово</b> стъпало в средата. Върху светла страница това стъпало пада
точно в средата на думата и буквите се разтварят. Металният текст не бива да ползва същата
лента като бутоните: <b>текстът трябва да остане в тъмната половина на рампата</b>. Долният
ред във всяка двойка е поправеният (<code>--band-text</code>).</p>
<div class="grey"><div class="g4">{words}</div></div>

<h2>2. По-наситен мед и оранжево — на сиво И на кларет</h2>
<p>Оплакването ти е за <b>сивото</b>, затова тук семейството е показано на двата фона.
Крайните два реда са референции: предишният тъмен мед и жълтото, което определи като
твърде крещящо.</p>
<h3>върху кларет</h3>
<div class="claret"><div class="g4">{''.join(fam_claret)}</div></div>
<h3>върху сивата страница</h3>
<div class="grey"><div class="g4">{''.join(fam_grey)}</div></div>

<h2>3. Процедурен метал — всеки елемент рисува себе си</h2>
<p>Да, възможно е, и то без картинки. <b>CSS Paint API</b> (Houdini): регистрира се
worklet, който получава <b>размера на самия елемент</b> и рисува повърхността му на място.
Затова лентата ляга по дългата ос на бутона, а на квадратна значка минава по диагонал;
вдлъбнатините са с радиус спрямо късата страна, тоест значката получава малки, а героичният
бутон — едри. Светлината е на единия ръб, сянката на срещуположния, и коя страна е коя се
решава от <b>seed</b>.</p>
<p><b>Seed-ът е детерминиран, не случаен.</b> Един и същ seed рисува една и съща
повърхност винаги — иначе всяко пре-рисуване щеше да трепка и кешът нямаше да работи. На
сайта seed-ът идва от ID-то на продукта, значи всеки бутон е уникален, но <i>същият</i>
уникален при всяко зареждане.</p>
<div class="gate" id="gate">Проверявам устройството…</div>
<p><small>Ако горе пише „ИЗКЛЮЧЕН" заради устройството, добави <code>#force</code> накрая на
адреса и презареди — така ще видиш процедурния слой въпреки гейта.</small></p>
<div class="claret"><div class="g4">{proc}</div></div>

<div class="note">
<p><b>За слабите устройства — да, и решението е вградено в самия механизъм.</b> Ако
<code>paint()</code> не се регистрира, правилото <code>background-image:paint(darling-metal)</code>
е просто невалидно и си остава статичната плочка. Тоест резервният вариант не се строи —
той вече е там. Изключвам процедурния слой при: липса на Paint API
(<b>Firefox и Safari нямат</b>), ≤2 ядра, &lt;2 GB памет, или включено пестене на данни.</p>
<p><b>Честно за риска:</b> paint() се изпълнява при всяко пре-рисуване с нов размер.
Кеширан е за даден размер, но категорийна страница с двайсет карти означава двайсет
рисунки при първо оформление. Не мога да го измеря надеждно от тази машина —
headless Chromium не дава време, на което бих се доверил — затова го казвам като модел,
не като бенчмарк. Предпазливото решение: процедурно за героичния бутон, логото,
панделката и значката; статична плочка за мрежата от карти. Това е същото разделение,
което направихме и за SVG филтъра.</p>
<p><b>И за „безвкусно\":</b> рискът не е в уникалността, а в <i>обхвата</i> ѝ. Тук seed-ът
мести само геометрията — ъгъл, вдлъбнатини, драскотини — и НИКОГА цвета. Затова двайсет
бутона изглеждат като двайсет парчета от един и същи метал, а не като двайсет различни
материала.</p>
</div>
</div>
<script>{GATE}</script>
</html>"""

open("palette15.html", "w", encoding="utf-8").write(html)
print("palette15.html", os.path.getsize("palette15.html") // 1024, "KB")
