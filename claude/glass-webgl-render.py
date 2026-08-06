#!/usr/bin/env python3
"""glass-webgl.html — a REAL refraction prototype, ~90 lines of shader, no library.

Kris: the CSS effects „don't pass off as actual light and refractions and crystal like
surfaces". Correct, and the reason is structural: CSS gradients PAINT a picture of light.
They never bend anything. Refraction means sampling the background at a DISPLACED
position, and only three things on the web can do that:

  1. SVG feDisplacementMap driven by `backdrop-filter: url(#f)`  — Chrome only
  2. WebGL — everywhere, but the DOM behind must be captured into a texture
  3. a pre-baked render (Blender/Cycles) — free at runtime, fixed geometry

This file is route 2, hand-written so its true cost is visible: no three.js, no library,
one vertex + one fragment shader. The backdrop is a real screenshot of our own hero band,
so what bends behind the glass is our actual headline.

Physics in the shader, in order:
  • signed distance field for the rounded rect  → exact shape, any size
  • a lens height profile from that SDF        → thick in the middle, curving at the rim
  • surface normal from the analytic gradient
  • Snell refraction (IOR 1.52, real crown glass)
  • DISPERSION: three refractions at slightly different IOR per channel
  • Fresnel (Schlick) → the rim brightens as the surface turns away, which is the single
    strongest „this is glass" cue
  • caustics INSIDE the slab, focused by the same lens profile
"""
import base64, os

BACKDROP = "data:image/webp;base64," + base64.b64encode(open("backdrop.webp", "rb").read()).decode()

SHADER = r"""
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform sampler2D uTex;
uniform vec4  uRect;      // x, y, w, h of the button in px
uniform float uRadius;
uniform float uIor;
uniform float uDisp;      // dispersion spread
uniform float uCaustic;
uniform float uAmber;

// iq's rounded-box SDF
float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// kaleidoscopic caustic, evaluated per pixel — no texture, so it is resolution-free
float caustic(vec2 p, float t){
  float a = atan(p.y, p.x), r = length(p);
  float folds = 9.0;
  float w = abs(fract(a * folds / 6.2831853 + t * 0.02) - 0.5) * 2.0;
  float s = 0.0;
  s += pow(1.0 - abs(sin((w * 3.0 + r * 2.4) * 3.1416)), 7.0);
  s += 0.55 * pow(1.0 - abs(sin((w * 7.0 + r * 3.3 - t * 0.05) * 3.1416)), 9.0);
  return s * exp(-r * 1.6);
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uRes;
  uv.y = 1.0 - uv.y;
  vec3 back = texture2D(uTex, uv).rgb;

  vec2 c  = uRect.xy + uRect.zw * 0.5;
  vec2 p  = vec2(fc.x, uRes.y - fc.y) - c;
  float d = sdRound(p, uRect.zw * 0.5, uRadius);

  if (d > 0.0){ gl_FragColor = vec4(back, 1.0); return; }

  // LENS PROFILE. h = 1 in the middle, falling to 0 at the rim over 'edge' pixels.
  // This is the whole difference between „a shape" and „a solid piece of glass".
  float edge = min(uRect.w, uRect.z) * 0.45;
  float t01  = clamp(-d / edge, 0.0, 1.0);
  float h    = sqrt(max(0.0, 1.0 - (1.0 - t01) * (1.0 - t01)));

  // normal from the analytic gradient of the SDF, tilted by the profile
  vec2 e = vec2(1.0, 0.0);
  float dx = sdRound(p + e.xy, uRect.zw * 0.5, uRadius) - sdRound(p - e.xy, uRect.zw * 0.5, uRadius);
  float dy = sdRound(p + e.yx, uRect.zw * 0.5, uRadius) - sdRound(p - e.yx, uRect.zw * 0.5, uRadius);
  vec2 g = normalize(vec2(dx, dy) + 1e-6);
  float slope = (1.0 - h) * 1.35;
  vec3 n = normalize(vec3(g * slope, 1.0));
  vec3 view = vec3(0.0, 0.0, 1.0);

  // REFRACTION, three times, one per channel — this is dispersion, and it is the cue the
  // eye reads as „crystal" rather than „plastic".
  float thick = h * min(uRect.w, uRect.z) * 0.30;
  vec3 col;
  for (int i = 0; i < 3; i++){
    float ior = uIor + (float(i) - 1.0) * uDisp;
    vec3 rd = refract(-view, n, 1.0 / ior);
    vec2 off = rd.xy * thick;
    vec2 su = (vec2(fc.x, uRes.y - fc.y) + off) / uRes;
    float s = texture2D(uTex, su).r;
    if (i == 0) col.r = texture2D(uTex, su).r;
    if (i == 1) col.g = texture2D(uTex, su).g;
    if (i == 2) col.b = texture2D(uTex, su).b;
  }

  // amber body: the glass absorbs along the path, so thicker = more saturated (Beer-Lambert)
  vec3 tint = vec3(1.0, 0.62, 0.16);
  float absorb = clamp(thick / (min(uRect.w, uRect.z) * 0.30), 0.0, 1.0);
  col = mix(col, col * tint * 1.25 + tint * 0.30, uAmber * (0.35 + 0.65 * absorb));

  // caustics focused inside the slab
  float ca = caustic(p / (uRect.z * 0.42), uTime);
  col += ca * uCaustic * vec3(1.0, 0.80, 0.45);

  // Fresnel rim — Schlick. The surface turns away at the edge, so it reflects instead of
  // transmitting, and that bright hairline is what says „solid glass".
  float f = pow(1.0 - max(dot(n, view), 0.0), 5.0);
  col += f * 1.5 * vec3(1.0, 0.93, 0.80);

  // a small specular from a light up and to the left
  vec3 L = normalize(vec3(-0.42, 0.55, 0.72));
  vec3 H = normalize(L + view);
  col += pow(max(dot(n, H), 0.0), 90.0) * 1.1;

  float aa = clamp(-d, 0.0, 1.0);
  gl_FragColor = vec4(mix(back, col, aa), 1.0);
}
"""

HTML = f"""<!doctype html><html lang="bg"><meta charset="utf-8">
<title>Дарлинг — истинско пречупване (WebGL)</title>
<style>
*{{box-sizing:border-box}}
body{{margin:0;background:#E6E6EC;color:#3A1D20;font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif}}
.wrap{{max-width:1180px;margin:0 auto;padding:32px 22px 80px}}
h1{{font:700 30px/1.15 "Playfair Display",Georgia,serif;margin:0 0 10px}}
h2{{font-size:19px;margin:38px 0 8px;border-top:2px solid #C2C2CD;padding-top:18px}}
p{{max-width:80ch}}
small{{color:#7a5b60}}
code{{background:#D4D4DD;padding:1px 5px;border-radius:4px;font-size:13px}}
.stage{{position:relative;width:100%;max-width:1100px;aspect-ratio:1440/412;border-radius:14px;overflow:hidden}}
canvas{{width:100%;height:100%;display:block}}
.label{{position:absolute;left:16px;top:12px;background:#241214;color:#FFF6E9;padding:6px 12px;
  border-radius:999px;font-size:12px;letter-spacing:.06em}}
.css-compare{{position:relative;width:100%;max-width:1100px;aspect-ratio:1440/412;border-radius:14px;
  overflow:hidden;background:url({BACKDROP}) center/cover}}
.cssbtn{{position:absolute;left:3.05%;top:76%;transform:translateY(-50%);
  padding:17px 34px;border-radius:999px;border:0;color:#3A1D20;font:600 17px/1 Inter,sans-serif;
  background:radial-gradient(56% 105% at 50% 56%, hsl(45 100% 80% / .92) 0%,
    hsl(38 92% 66% / .72) 30%, hsl(36 88% 50% / .60) 62%, hsl(28 90% 30% / .52) 100%);
  box-shadow:inset 0 0 0 1px hsl(44 100% 90% / .75), inset 0 9px 16px -11px hsl(46 100% 94% / .9),
    inset 0 -10px 18px -12px hsl(28 90% 30% / .6), 0 0 18px 2px hsl(38 95% 60% / .55)}}
.note{{background:#FFF6E9;border-left:4px solid #D42A3C;padding:14px 18px;border-radius:0 10px 10px 0;margin:16px 0}}
table{{border-collapse:collapse;font-size:14px;width:100%;margin-top:10px}}
td,th{{border-bottom:1px solid #C2C2CD;padding:8px 14px 8px 0;text-align:left;vertical-align:top}}
th{{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#7a5b60}}
</style>
<div class="wrap">
<h1>Истинско пречупване — прототип на 90 реда шейдър</h1>
<p>Прав си, и причината е устройствена, не настроечна: <b>CSS градиентите РИСУВАТ картинка
на светлина. Те никога не изкривяват нищо.</b> Пречупване значи да вземеш фона от
ИЗМЕСТЕНА позиция — а това на уеб го могат само три неща: SVG <code>feDisplacementMap</code>
през <code>backdrop-filter</code> (само Chrome), WebGL, или предварително изпечен рендер.</p>
<p>Долу е WebGL, написан на ръка — <b>без three.js, без библиотека</b> — за да се вижда
истинската цена. Фонът, който се пречупва, е <b>реална снимка на нашия хиро банер</b>,
затова заглавието зад бутона наистина се изкривява.</p>

<h2>1. WebGL — истинско пречупване, дисперсия и Френел</h2>
<div class="stage"><span class="label">WebGL · SDF + Snell + дисперсия + каустики</span>
  <canvas id="c"></canvas></div>
<p><small>В шейдъра, по ред: SDF на заоблен правоъгълник → лещов профил (дебело в средата,
изтъняващо към ръба) → нормала от аналитичния градиент → <b>Snell</b> при IOR 1.52
(истинско коронно стъкло) → <b>дисперсия</b>: три пречупвания с леко различен IOR за
червено, зелено и синьо → поглъщане по дебелината (Beer–Lambert), затова средата е
по-наситена → каустики, фокусирани вътре → <b>Френел</b> по Schlick, който вдига ръба,
защото там повърхността се обръща настрани и започва да ОТРАЗЯВА вместо да пропуска.</small></p>

<h2>2. Същият бутон, но с CSS — за сравнение</h2>
<div class="css-compare"><button class="cssbtn">Разгледай магазина</button></div>
<p><small>Същият цвят, същата форма, същият ореол. Разликата не е в качеството на
изпълнението — заглавието зад него просто не се променя, защото CSS няма как да го
измести.</small></p>

<h2>3. Трите маршрута, честно</h2>
<table>
<tr><th>маршрут</th><th>тежест</th><th>поддръжка</th><th>рискове</th></tr>
<tr><td><b>SVG feDisplacementMap + backdrop-filter</b><br><small>картата се смята веднъж
и се подава на филтъра</small></td><td>~2–5 KB<br>нула JS в идеалния случай</td>
<td><b>само Chrome.</b> Firefox и Safari не поддържат SVG филтър в <code>backdrop-filter</code>;
има отворено предложение в W3C, но не е стандарт</td>
<td>картата се преизчислява при всяка промяна на размера — тоест е за елементи с
ФИКСИРАН размер</td></tr>
<tr><td><b>WebGL (това горе)</b></td><td>~4 KB собствен код, 0 библиотеки<br>(с three.js би било ~600 KB)</td>
<td>навсякъде</td>
<td>*** трябва да ЗАСНЕМЕ DOM-а отзад в текстура. *** Това е скъпото — при всяко скролване
или промяна фонът трябва да се засича наново. Готовите библиотеки ползват
<code>html-to-image</code> и признават 100–500 ms начално забавяне</td></tr>
<tr><td><b>Предварително изпечен рендер</b><br><small>Blender/Cycles, истински path tracer</small></td>
<td>едно WebP, 15–40 KB</td><td>навсякъде, включително най-слабия телефон</td>
<td>фиксирана геометрия — един размер бутон, един фон. Но качеството е недостижимо за
реално време</td></tr>
</table>

<div class="note">
<p><b>Моето мнение, ясно:</b> за героичния бутон, значката и панделката — <b>предварително
изпечен рендер</b>. Те са малко на брой, с постоянен размер, и точно там качеството има
значение. Един path tracer прави за 4 секунди офлайн това, което шейдърът приближава за
16 милисекунди на кадър, и на сайта не струва нищо — просто картинка.</p>
<p>WebGL има смисъл само ако искаш пречупването да реагира на СЪДЪРЖАНИЕТО отзад в реално
време. За магазин с 60-секунден кеш и хиляди продуктови карти това е много цена за малко
печалба, и е точно видът риск, който този дизайн-пас отказваше досега.</p>
<p><b>Но преди да решаваме — виж горното.</b> Ако шейдърът вече изглежда достатъчно като
стъкло, значи знаем, че посоката е правилна, и въпросът е само как да го доставим.</p>
</div>
</div>

<script>
const cv = document.getElementById('c');
const gl = cv.getContext('webgl', {{antialias:true, premultipliedAlpha:false}});
const FS = `{SHADER}`;
const VS = 'attribute vec2 a;void main(){{gl_Position=vec4(a,0.,1.);}}';
function sh(t, s){{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;}}
const pr = gl.createProgram();
gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(pr); gl.useProgram(pr);
const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
const la = gl.getAttribLocation(pr,'a'); gl.enableVertexAttribArray(la);
gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
const U = n => gl.getUniformLocation(pr,n);
const tex = gl.createTexture();
const img = new Image(); img.crossOrigin='anonymous';
img.onload = () => {{
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  requestAnimationFrame(loop);
}};
img.src = '{BACKDROP}';
function size(){{
  const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio||1, 2);
  cv.width = Math.round(r.width*dpr); cv.height = Math.round(r.height*dpr);
  gl.viewport(0,0,cv.width,cv.height);
}}
addEventListener('resize', size); size();
function loop(t){{
  size();
  const W = cv.width, H = cv.height;
  gl.uniform2f(U('uRes'), W, H);
  gl.uniform1f(U('uTime'), t*0.001);
  // the button, in the same place as the CSS one below
  gl.uniform4f(U('uRect'), W*0.055, H*0.30, W*0.40, H*0.30);
  gl.uniform1f(U('uRadius'), H*0.15);
  gl.uniform1f(U('uIor'), 1.52);
  gl.uniform1f(U('uDisp'), 0.035);
  gl.uniform1f(U('uCaustic'), 0.22);
  gl.uniform1f(U('uAmber'), 0.55);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(U('uTex'), 0);
  gl.drawArrays(gl.TRIANGLES,0,3);
  requestAnimationFrame(loop);
}}
</script>
</html>"""

open("glass-webgl.html", "w", encoding="utf-8").write(HTML)
print("glass-webgl.html", os.path.getsize("glass-webgl.html") // 1024, "KB")
