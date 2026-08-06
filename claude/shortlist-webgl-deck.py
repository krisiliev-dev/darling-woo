#!/usr/bin/env python3
"""palette26.html — the shortlist, with the textures turned UP, plus the WebGL glass.

Four materials × three levels of light = twelve full pages:
  метал · кехлибарен мрамор · шперплат · WebGL стъкло
  без светлина · сияние + светещ ръб · + искри

Two changes Kris asked for:
  1. THE TEXTURES ARE STRONGER. The grey maps were re-normalised at 2.1–2.6× their old
     contrast, the accent runs at full opacity, and the mask clears a smaller island in the
     middle — so the grain is visible in the padding and along the rim while the label stays
     on clean ground.
  2. WEBGL IS IN THE COMPARISON. Its hero band is drawn by the shader from a captured image
     of our own hero, which is exactly how it would work in production — WebGL cannot read
     the DOM, so the backdrop has to be a texture either way.
"""
import base64, os, re
from page8 import uri, page, HEAD

ET = uri("strong-et102.webp", 256, 70)
MAR = uri("strong-marble.webp", 256, 70)
PLY = uri("strong-ply.webp", 256, 70)
BACKDROP = "data:image/webp;base64," + base64.b64encode(open("backdrop.webp", "rb").read()).decode()

AMBER = "--gh:36;--gs:88;--gl:-2"
BODY = ("radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, "
        "transparent 74%), linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, "
        "var(--g-shadow) 100%)")
RIM_WARM = ("inset 0 0 0 1px hsl(36 88% 32% / .55), inset 0 9px 16px -11px var(--g-vanilla), "
            "inset 0 -11px 20px -11px var(--g-deep), inset 9px 0 18px -14px var(--g-deep), "
            "inset -9px 0 18px -14px var(--g-deep)")
RIM_LIT = ("inset 0 0 0 1px hsl(42 100% 88% / .8), inset 0 8px 16px -10px hsl(45 100% 92% / .9), "
           "inset 0 -10px 20px -12px hsl(30 90% 55% / .8), "
           "inset 12px 0 22px -16px hsl(45 100% 90% / .7), "
           "inset -12px 0 22px -16px hsl(45 100% 90% / .7)")
GLOW = ("0 0 0 1px rgb(255 214 140/.30), 0 0 18px 2px hsl(38 95% 60% / .55), "
        "0 0 46px 10px hsl(36 95% 58% / .30)")
GLINTS = ("radial-gradient(closest-side circle at 21% 25%, hsl(48 100% 96%) 0%, "
          "hsl(45 100% 88% / .6) 20%, transparent 58%), "
          "radial-gradient(closest-side circle at 76% 69%, hsl(48 100% 96%) 0%, "
          "hsl(45 100% 88% / .5) 16%, transparent 52%), ")
# a tighter island: the grain now comes closer to the label than before, but still clears it
MASK_STRONG = "radial-gradient(64% 190% at 50% 50%, transparent 0 26%, #000 86%)"

MATS = [
    ("met", "Метал", ET, "210px 210px"),
    ("mar", "Кехлибарен мрамор", MAR, "240px 240px"),
    ("ply", "Шперплат", PLY, "260px 260px"),
]
LEVELS = [
    ("0", "без светлина", RIM_WARM, ""),
    ("1", "сияние + светещ ръб", RIM_LIT + ", " + GLOW, ""),
    ("2", "сияние + светещ ръб + искри", RIM_LIT + ", " + GLOW, GLINTS),
]

pages = []
for mk, mname, tex, tsz in MATS:
    for lk, lname, rim, glints in LEVELS:
        style = (f"{AMBER};--surface:{glints}{BODY};--tile:none;--tsz:auto;--blend:normal;"
                 f"--ink:#3A1D20;--rim:{rim};--bg:var(--g-core);"
                 f"--acc-tex:url({tex});--acc-size:{tsz};--acc-op:1;--mask2:{MASK_STRONG}")
        pages.append(page(f"{mk}-{lk}", f"{mname} — {lname}",
                          "Текстурата е усилена: контрастът на картата е вдигнат 2.1–2.6 пъти, "
                          "акцентът е на пълна сила, а маската отваря по-малък гладък остров "
                          "в средата.", style, True, "var(--text-spot)"))

# ── the WebGL pages: the hero band becomes a canvas ──────────────────────────
GL_LEVELS = [
    ("0", "без светлина", 0.0, 0.0),
    ("1", "сияние", 1.0, 0.0),
    ("2", "сияние + искри", 1.0, 1.0),
]
HERO_RE = re.compile(r'<div class="hero">.*?</div>\s*<div class="sect">', re.S)

for lk, lname, glow, spark in GL_LEVELS:
    style = (f"{AMBER};--surface:{BODY};--tile:none;--tsz:auto;--blend:normal;"
             f"--ink:#3A1D20;--rim:{RIM_WARM};--bg:var(--g-core);"
             f"--acc-tex:url({ET});--acc-size:210px 210px;--acc-op:1;--mask2:{MASK_STRONG}")
    p = page(f"gl-{lk}", f"WebGL стъкло — {lname}",
             "Хиро лентата тук е нарисувана от шейдъра върху заснето изображение на нашия "
             "собствен хиро — точно както би работило и на живо, защото WebGL не може да чете "
             "DOM-а. Значката, отметките и панделката остават CSS.",
             style, True, "var(--text-spot)")
    p = HERO_RE.sub(
        f'<div class="hero glhero"><canvas class="glc" data-glow="{glow}" '
        f'data-spark="{spark}"></canvas>'
        f'<span class="gllabel">Разгледай магазина</span></div>\n  <div class="sect">', p)
    pages.append(p)

SHADER = r"""
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform sampler2D uTex;
uniform vec4 uRect; uniform float uRadius, uGlow, uSpark, uEmit;

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
float caustic(vec2 p, float t){
  float a = atan(p.y, p.x), r = length(p);
  float w = abs(fract(a * 9.0 / 6.2831853 + t * 0.015) - 0.5) * 2.0;
  float s = pow(1.0 - abs(sin((w * 3.0 + r * 2.4) * 3.1416)), 7.0);
  s += 0.55 * pow(1.0 - abs(sin((w * 7.0 + r * 3.3 - t * 0.04) * 3.1416)), 9.0);
  return s * exp(-r * 1.6);
}
float star(vec2 p, float s){          // the site's own four-point glint, in the glass
  vec2 q = abs(p) / s;
  float d = pow(q.x, 0.55) + pow(q.y, 0.55);
  return clamp(1.0 - d, 0.0, 1.0);
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = vec2(fc.x, uRes.y - fc.y) / uRes;
  vec3 back = texture2D(uTex, uv).rgb;

  vec2 c = uRect.xy + uRect.zw * 0.5;
  vec2 p = vec2(fc.x, uRes.y - fc.y) - c;
  float d = sdRound(p, uRect.zw * 0.5, uRadius);

  // OUTER BLOOM — light leaving the object and landing on the page behind it
  if (uGlow > 0.0 && d > 0.0){
    float g = exp(-d / (uRect.w * 0.55)) * 0.55 + exp(-d / (uRect.w * 1.8)) * 0.25;
    back += g * uGlow * vec3(1.0, 0.72, 0.34);
  }
  if (d > 0.0){ gl_FragColor = vec4(back, 1.0); return; }

  float edge = min(uRect.w, uRect.z) * 0.45;
  float t01 = clamp(-d / edge, 0.0, 1.0);
  float h = sqrt(max(0.0, 1.0 - (1.0 - t01) * (1.0 - t01)));

  vec2 e = vec2(1.0, 0.0);
  float dx = sdRound(p + e.xy, uRect.zw*0.5, uRadius) - sdRound(p - e.xy, uRect.zw*0.5, uRadius);
  float dy = sdRound(p + e.yx, uRect.zw*0.5, uRadius) - sdRound(p - e.yx, uRect.zw*0.5, uRadius);
  vec3 n = normalize(vec3(normalize(vec2(dx, dy) + 1e-6) * (1.0 - h) * 1.35, 1.0));
  vec3 view = vec3(0.0, 0.0, 1.0);

  float thick = h * min(uRect.w, uRect.z) * 0.30;
  vec3 col;
  for (int i = 0; i < 3; i++){
    float ior = 1.52 + (float(i) - 1.0) * 0.035;
    vec2 su = (vec2(fc.x, uRes.y - fc.y) + refract(-view, n, 1.0/ior).xy * thick) / uRes;
    vec3 t = texture2D(uTex, su).rgb;
    if (i == 0) col.r = t.r; if (i == 1) col.g = t.g; if (i == 2) col.b = t.b;
  }
  vec3 tint = vec3(1.0, 0.62, 0.16);
  float absorb = clamp(thick / (min(uRect.w, uRect.z) * 0.30), 0.0, 1.0);
  col = mix(col, col * tint * 1.35 + tint * 0.40, 0.88 * (0.35 + 0.65 * absorb));
  // EMISSION: the light is inside the glass, so the slab is bright regardless of
  // what is behind it. Without this, amber glass over a red field is simply red.
  col += uEmit * h * vec3(1.0, 0.74, 0.34) * 0.95;

  col += caustic(p / (uRect.z * 0.42), uTime) * (0.22 + 0.18 * uGlow) * vec3(1.0, 0.80, 0.45);

  if (uSpark > 0.0){
    float s = 0.0;
    s += star(p - vec2(-uRect.z*0.28,  uRect.w*0.16), uRect.w*0.30);
    s += star(p - vec2( uRect.z*0.24, -uRect.w*0.20), uRect.w*0.22);
    float tw = 0.65 + 0.35 * sin(uTime * 0.8);
    col += s * uSpark * tw * vec3(1.0, 0.95, 0.82) * 1.1;
  }

  float f = pow(1.0 - max(dot(n, view), 0.0), 5.0);
  col += f * 1.5 * vec3(1.0, 0.93, 0.80);
  vec3 L = normalize(vec3(-0.42, 0.55, 0.72));
  col += pow(max(dot(n, normalize(L + view)), 0.0), 90.0) * 1.1;

  gl_FragColor = vec4(mix(back, col, clamp(-d, 0.0, 1.0)), 1.0);
}
"""

GL_JS = """
<script>
const FS = `%SHADER%`;
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const IMG = new Image();
IMG.onload = () => document.querySelectorAll('canvas.glc').forEach(setup);
IMG.src = '%BACKDROP%';
function setup(cv){
  const gl = cv.getContext('webgl', {antialias:true});
  if(!gl){ cv.style.background = 'url(%BACKDROP%) center/cover'; return; }
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;};
  const pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(pr); gl.useProgram(pr);
  const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const la=gl.getAttribLocation(pr,'a'); gl.enableVertexAttribArray(la);
  gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
  const U=n=>gl.getUniformLocation(pr,n);
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,IMG);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const glow=parseFloat(cv.dataset.glow)||0, spark=parseFloat(cv.dataset.spark)||0;
  function frame(t){
    const r=cv.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    const W=Math.round(r.width*dpr), H=Math.round(r.height*dpr);
    if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    gl.viewport(0,0,W,H);
    gl.uniform2f(U('uRes'),W,H); gl.uniform1f(U('uTime'),t*0.001);
    gl.uniform4f(U('uRect'), W*0.0306, H*0.7355, W*0.1642, H*0.1115);
    gl.uniform1f(U('uRadius'), H*0.0557);
    gl.uniform1f(U('uGlow'), glow); gl.uniform1f(U('uSpark'), spark);
    gl.uniform1f(U('uEmit'), 0.55);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,tex); gl.uniform1i(U('uTex'),0);
    gl.drawArrays(gl.TRIANGLES,0,3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
</script>"""

EXTRA_CSS = """<style>
.acc--metal::after{background-size:var(--acc-size,190px 190px);opacity:var(--acc-op,1);
	-webkit-mask-image:var(--mask2,var(--mask));mask-image:var(--mask2,var(--mask))}
.glhero{padding:0;height:457px;position:relative;overflow:hidden}
.glhero canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.gllabel{position:absolute;left:3.06%;top:73.55%;width:16.42%;height:11.15%;
	display:flex;align-items:center;justify-content:center;color:#3A1D20;
	font:600 17px/1 Inter,sans-serif;pointer-events:none}
</style>"""

intro = ('<div class="intro"><h1>Четири материала, три нива светлина</h1>'
 '<p><b>Текстурите са усилени.</b> Контрастът на сивите карти е вдигнат 2.1–2.6 пъти, '
 'акцентът е на пълна сила, а маската отваря по-малък гладък остров в средата — така зърното '
 'се вижда в падинга и по ръба, но надписът пак стъпва на чисто.</p>'
 '<p><b>WebGL е в сравнението.</b> При него хиро лентата е нарисувана от шейдъра върху '
 'заснето изображение на нашия собствен хиро — точно както би било и на живо, защото WebGL '
 'не чете DOM. Значката, отметките и панделката остават CSS, за да се вижда контрастът '
 'между двата подхода на една и съща страница.</p>'
 '<p><small>CSS вариантът остава като резерва за слаби устройства и за Firefox/Safari, '
 'точно както предложи.</small></p></div>')

html = (HEAD.replace("</style>", "</style>" + EXTRA_CSS, 1) + intro + "".join(pages)
        + GL_JS.replace("%SHADER%", SHADER).replace("%BACKDROP%", BACKDROP) + "</html>")
open("palette26.html", "w", encoding="utf-8").write(html)
print("palette26.html", os.path.getsize("palette26.html") // 1024, "KB")
