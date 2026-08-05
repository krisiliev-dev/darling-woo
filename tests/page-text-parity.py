# Text-parity gate: rendered staging pages vs Shopify originals, modulo deliberate deltas.
import re, io, difflib

REND = r"C:\Users\lora_\darling\_scratch_woo\rendered.html"
EXT  = r"C:\Users\lora_\darling\_scratch_woo\port\extracted"

def textify(html):
    html = re.sub(r"(?s)<script.*?</script>", " ", html)
    html = re.sub(r"(?s)<style.*?</style>", " ", html)
    html = re.sub(r"(?s)<!--.*?-->", " ", html)
    html = re.sub(r"<[^>]+>", " ", html)
    html = html.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"')
    html = html.replace("&#8211;", "\u2013").replace("&#8212;", "\u2014").replace("&#039;", "'")
    return re.sub(r"\s+", " ", html).strip()

def norm(t):
    t = t.replace("\u201e", '"').replace("\u201c", '"').replace("\u201d", '"').replace("\u2033", '"')
    t = re.sub(r"\s+", " ", t)
    return t.strip().lower()

# --- load rendered pages, extract the content region ---
raw = io.open(REND, encoding="utf-8").read()
pages = {}
for chunk in raw.split("#####PAGE ")[1:]:
    name, _, body = chunk.partition("\n")
    name = name.strip()
    if name == "END":
        continue
    body = body.split("#####END")[0]
    # Woo theme content region: prefer entry-content, else <main>
    m = re.search(r'(?s)<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)</div>\s*(?:</main>|<footer|<div[^>]*class="[^"]*(?:site-footer|footer))', body)
    if m:
        content = m.group(1)
    else:
        mm = re.search(r"(?s)<main[^>]*>(.*?)</main>", body)
        content = mm.group(1) if mm else body
    pages[name] = textify(content)

# --- expected text from Shopify extracts, with deliberate deltas applied ---
def load(name):
    return io.open(EXT + "\\" + name, encoding="utf-8").read()

def expected(body_html, swaps):
    t = textify(body_html)
    for a, b in swaps:
        t = t.replace(a, b)
    return t

EMAIL = ("darling7.sv@gmail.com", "orders@darlinghome.bg")
exp = {}
exp["za-nas"]          = expected(load("pages_za-nas.body.html"), [EMAIL])
exp["pomosht"]         = expected(load("pages_pomosht.body.html"), [EMAIL])
exp["obshti-usloviya"] = expected(load("policies_terms-of-service.body.html"), [EMAIL])
exp["poveritelnost"]   = expected(load("policies_privacy-policy.body.html"),
                                  [EMAIL, ("Shopify (\u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430\u0442\u0430 \u043d\u0430 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430)",
                                           "\u0434\u043e\u0441\u0442\u0430\u0432\u0447\u0438\u043a\u0430 \u043d\u0430 \u0445\u043e\u0441\u0442\u0438\u043d\u0433 \u043d\u0430 \u043e\u043d\u043b\u0430\u0439\u043d \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430")])
exp["dostavka"]        = expected(load("policies_shipping-policy.body.html"), [EMAIL])
exp["vrashtane"]       = expected(load("policies_refund-policy.body.html"), [EMAIL])
# kontakti = pages_contact info block + merged legal ids (no form yet)
kon = expected(load("pages_contact.body.html"), [EMAIL])
exp["kontakti"] = kon

print("page | expected_words_found | ratio | notes")
fail = False
for name in ["za-nas", "pomosht", "kontakti", "obshti-usloviya", "poveritelnost", "dostavka", "vrashtane"]:
    got = norm(pages.get(name, ""))
    want = norm(exp[name])
    # word coverage: every expected word present in rendered text
    want_words = [w for w in re.findall(r"[\w@.\u0400-\u04FF-]+", want) if len(w) > 1]
    missing = [w for w in want_words if w not in got]
    ratio = difflib.SequenceMatcher(None, want, got).ratio()
    cov = 100.0 * (1 - len(missing) / max(1, len(want_words)))
    status = "OK" if cov >= 97 else "CHECK"
    if name == "kontakti":  # form labels etc. excluded by design
        status = "OK" if cov >= 90 else "CHECK"
    if status != "OK":
        fail = True
    print(f"{name}: coverage={cov:.1f}% ratio={ratio:.2f} missing={missing[:12]} {status}")
    # forbidden strings on rendered page
    for bad in ["darling7.sv@gmail.com", "shopify", "\u043f\u0440\u0435\u0434\u0441\u0442\u043e\u0438 \u0434\u0430 \u0431\u044a\u0434\u0435 \u043f\u043e\u043f\u044a\u043b\u043d\u0435\u043d\u043e"]:
        if bad in got:
            print(f"  !! FORBIDDEN on {name}: {bad}")
            fail = True
print("GATE:", "FAIL" if fail else "PASS")
