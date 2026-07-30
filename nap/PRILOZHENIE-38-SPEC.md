# Приложение 38 — стандартизиран одиторски файл: implementation spec

**Source of truth:** `nap/spec/XSD_XML/dec_audit.xsd` + `vik_simple.xml`, downloaded from
[НАП](https://nra.bg/wps/wcm/connect/agency/site/programni-produkti/specifikaciq-za-podavane-na-danni/e_magazini/elektronni_magazini)
on 2026-07-30. Page lists the file as **06.06.2022** — no newer version published there.
**Field names below are verbatim from the XSD. Nothing here is invented.**

---

## 0. The scope question — SETTLED BY THE SCHEMA

Secondary sources (including НАП's own e-service *title*) suggest this file belongs only to
merchants electing the **чл. 3, ал. 17** alternative regime. **The schema contradicts that**, and
the schema wins:

```
paym = 6  →  "плащане, отразено с фискален бон"
```

There is an explicit payment code for *payment reflected in a fiscal receipt*, and the official
sample file uses it. A file that only covered the alternative regime would have no need for it.
⇒ **Дарлинг's accountant is right: the obligation is not avoided by issuing a бон.**
Дарлинг issues бон **and** takes card payments, so it files.

---

## 1. Hard implementation facts

| | |
|---|---|
| **Encoding** | **WINDOWS-1251** (not UTF-8). The XSD and sample both declare it. Cyrillic product names must be transcoded, and characters outside cp1251 will fail. |
| Root element | `<audit>` |
| Dates | `xs:date` → `YYYY-MM-DD` |
| Decimals | `fractionDigits=2` |
| Period | Monthly. Filed **1st–15th of the month following the month of DELIVERY** (not order date) |
| Submission | НАП portal `inetdec.nra.bg`, **КЕП required**. **No public API found** — see §4 |
| Corrections | Multiple submissions allowed per period; **the last file in the window is authoritative** |

⚠️ **UNRESOLVED — currency.** Every money field is documented **„в лв."** and the schema predates
Bulgaria's euro adoption (2026-01-01). Whether amounts are now expected in EUR, and whether a
revised XSD exists elsewhere, **must be confirmed with НАП or the accountant before the first
filing**. Do not guess: a whole file in the wrong currency is worse than a late one.

---

## 2. Header (all required, `xs:all`)

| Field | Type / limit | Meaning | Source |
|---|---|---|---|
| `eik` | string 9–13 | ЕИК на ЗЛ | Дарлинг 7 ООД |
| `e_shop_n` | string ≤10 | **Уникален номер на електронния магазин — the УИН** (sample `RF0000000`) | ⚠️ obtained by filing чл. 52т, ал. 2 — **one УИН per domain**. Blocks genuine filings until issued |
| `domain_name` | string ≤200 | Уеб адрес | `darlinghome.bg` |
| `e_shop_type` | int, `1` or `2` | own domain vs using an online platform | `1` (own domain) |
| `creation_date` | date | Дата на създаване на файла | generation date |
| `mon` | string(2), `01`–`12` | reporting month | |
| `god` | int, 4 digits | reporting year | |

## 3. Orders — `<order>` → repeating `<orderenum>`

| Field | Type / limit | Meaning |
|---|---|---|
| `ord_n` | string ≤300 | Уникален номер на поръчка в софтуера на е-магазина → **Woo order number** |
| `ord_d` | date | Дата на поръчка |
| `doc_n` | **integer** | Номер на документа по **чл. 52о, ал. 1, т. 1** |
| `doc_date` | date | Дата на същия документ |

`<art>` → repeating `<artenum>`:

| Field | Type | Meaning |
|---|---|---|
| `art_name` | string ≤200 | Наименование на стоката/услугата — ⚠️ **truncate at 200 chars, in cp1251** |
| `art_quant` | decimal(2) | Количество |
| `art_price` | decimal(2) | Единична цена (без отстъпка) **без ДДС** |
| `art_vat_rate` | integer | ДДС-ставка (20) |
| `art_vat` | decimal(2) | ДДС — обща сума |
| `art_sum` | decimal(2) | Обща сума **с ДДС** |

Order totals:

| Field | Meaning |
|---|---|
| `ord_total1` | Обща стойност на доставените стоки/услуги (net) |
| `ord_disc` | Отстъпка (сума) |
| `ord_vat` | ДДС — сума |
| `ord_total2` | Обща стойност **с ДДС** |

Payment:

| Field | Meaning |
|---|---|
| `paym` | **1** освободено по чл. 3 без ППП · **2** виртуален ПОС-терминал · **3** наложен платеж с ППП · **4** доставчик на платежни услуги · **5** друг вид плащане без фискален бон · **6** плащане, отразено с фискален бон |
| `pos_n` | string ≤200 — номер на виртуален ПОС-терминал |
| `trans_n` | string ≤200 — референтен номер на финансовата транзакция |
| `proc_id` | string ≤200 — идентификатор на доставчика на платежни услуги |

**Дарлинг mapping (to confirm with the accountant):**
- **COD via Econt/Speedy ППП** → `paym 3`
- **Card via Borica virtual POS** → `paym 2`, with `pos_n` = terminal number
- **Card via Stripe** (a payment service provider, not a virtual POS) → likely `paym 4`, with
  `proc_id` identifying Stripe and `trans_n` = the Stripe charge/payment-intent id
- Any of the above that also produce a бон may instead be `paym 6` — **this overlap is exactly
  what the accountant should rule on**, because `6` is defined by the *receipt*, while `2`/`3`/`4`
  are defined by the *payment channel*.

## 4. Returned orders — `<rorder>` → repeating `<rorderenum>`

| Field | Type | Meaning |
|---|---|---|
| `r_ord` | integer | Брой изцяло или частично върнати поръчки през периода *(header-level count)* |
| `r_ord_n` | string ≤300 | Номер на върнатата поръчка |
| `r_amount` | decimal(2) | Върната сума на клиента |
| `r_date` | date | Дата на връщане на сумата |
| `r_paym` | int | **1** по платежна сметка · **2** по карта · **3** в брой · **4** друг |
| `r_total` | decimal(2) | Обща стойност с ДДС на всички върнати поръчки |

⚠️ A **2025 amendment** reportedly changed the returned-orders handling. The XSD we hold is 2022 —
verify before relying on this section.

## 5. „Send automatically every month" — what is actually possible

**Submission is portal upload with a qualified electronic signature (КЕП). No public API was found.**
So a fully unattended monthly filing is **not** achievable as things stand. The honest design is:

1. **Generate** the file automatically on the 1st for the previous month — fully automated.
2. **Validate** it against `dec_audit.xsd` locally, and refuse to present an invalid file.
3. **Arithmetic self-check** — НАП validates that the file is *„логически и аритметически коректна"*,
   so totals must reconcile before upload, not after rejection.
4. **Notify** the owner/accountant that it is ready, with the deadline (15th) — and **escalate if
   still unfiled**, since a silent generator that nobody uploads is the same failure class as an
   untested backup.
5. **Human uploads** it with the КЕП.

If a machine-to-machine channel does exist, it would need confirming with НАП; worth asking in the
same conversation as the УИН.

## 5a. Implementation constraints (panel session — adopted)

**1. 🔴 Confirm the current XSD *version* before trusting our own validator.**
The published schema is dated **06.06.2022** and predates euro adoption. If НАП has since revised
it, our generator validates **green against a stale copy** and НАП rejects the upload anyway — a
false green in the worst possible place, discovered at the filing deadline. *Trusting our validator
requires first knowing the schema is current.* Chase this before the currency question; it may
answer it.

**2. 🔴 The cp1251 transcode must FAIL LOUDLY — never `errors="replace"`.**
Product names come from the AI enrichment pipeline and routinely contain em-dashes and curly
quotes. `encode("cp1251", errors="replace")` would put literal `?` characters into a **legal
filing** and exit zero. Required order:
1. **Deliberately** normalise typographic characters to ASCII equivalents (— → -, " " → ", … → ...).
2. **Error** on anything still un-encodable, naming the product.
Same discipline for the **200-char `art_name` cap**: truncate **on purpose and log it**, rather
than letting the XSD reject the file at upload time.

**3. The arithmetic self-check must reconcile against BARSY's booked totals**, not merely against
itself. A file whose lines sum correctly to its own totals is **self-confirming** — it can be
internally perfect and built entirely from wrong numbers. Barsy is the system of record, so that is
what the totals must agree with.

**4. Escalation keys on the FILING, not the file.**
- A human **"mark as filed"** action, with a date.
- An issue raised if the **15th** passes without it.
- 🚫 **No auto-resolve on generation.** If generating the file closes the alert, we have built a
  generator that congratulates itself while nothing reaches НАП.

## 6. Blocking prerequisites

- [ ] **УИН** — file чл. 52т, ал. 2 with НАП (the e-shop declaration already on the checklist).
      Until then `e_shop_n` cannot be populated and no genuine file can be produced.
      🚨 **The УИН is ONE PER DOMAIN — declare the FINAL PRODUCTION domain (`darlinghome.bg`), NOT
      `staging.darlinghome.bg`.** With the Woo migration in flight this is a live risk, not a
      theoretical one: declaring against a staging hostname means correcting it with НАП later.
- [ ] **Currency question** (§1) resolved.
- [ ] **`paym` mapping** for Stripe vs Borica vs COD confirmed by the accountant.
- [ ] Confirm whether a **post-2022 XSD** exists (euro + the 2025 returned-orders amendment).
