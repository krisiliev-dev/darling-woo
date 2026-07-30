# Self-hosted mail for @darlinghome.bg

Runs on the **woo box** (`169.58.89.40`), not the panel box. The panel holds the
Barsy credentials and courier keys — it is the system of record for the business —
and a mail server is a permanently internet-facing daemon and a standing target.
Putting it on the storefront box keeps that exposure away from the credentials that
matter most, and WordPress can then hand mail to `localhost` with no cross-box auth.

## Order of operations

The steps depend on each other. Doing them out of order mostly produces errors that
look like something else.

### 1. DNS — A record (you)

```
mail    A    169.58.89.40    TTL 300
```

Everything else waits on this: the TLS certificate is issued by HTTP challenge
against that name, and the MX record has to point at a name that resolves.

### 2. Contabo — two requests (you)

Both are account-level and cannot be done from inside the server.

- ~~Unblock outbound port 25~~ — **NOT needed.** Verified working on this box over
  both IPv4 and IPv6, with Gmail returning a live SMTP banner:
  `220 mx.google.com ESMTP …`. An earlier claim that it was blocked came from a
  bash `/dev/tcp` probe, which gives false negatives; always confirm a port with
  `curl -v telnet://host:25` or by reading the banner, never with `/dev/tcp`.
- **Set reverse DNS (PTR)** for `169.58.89.40` to `mail.darlinghome.bg`, in the
  Contabo panel. Most large receivers reject mail from an IP whose PTR does not
  match its HELO name. This is not optional; it is one of the first things Gmail
  and Outlook check.

### 3. Certificate + DKIM key (me, once step 1 lands)

Issue a certificate for `mail.darlinghome.bg` with the existing certbot setup, then
start the container and generate the DKIM key. The key is created on the server —
it cannot be written by hand, and its public half becomes a DNS record.

### 4. DNS — the rest (you, once step 3 produces the DKIM value)

```
@                      MX     mail.darlinghome.bg   priority 10   TTL 300
@                      TXT    v=spf1 mx -all
mail._domainkey        TXT    (generated in step 3 — long, starts v=DKIM1;)
_dmarc                 TXT    v=DMARC1; p=none; rua=mailto:orders@darlinghome.bg
```

Note `-all` rather than `~all` in SPF: once mail comes only from our own server,
a hard fail is correct and more protective against someone spoofing the domain.
Keep DMARC at `p=none` until the reports confirm SPF and DKIM both pass.

**Removing the old `mx2.bgdns.net` record cuts over mail delivery.** Do it only
once this server is confirmed accepting mail, and keep it as a lower-priority
fallback for a while if you want a safety net.

### 5. Point WordPress at it (me)

`SMTP_HOST` becomes the mail container, `SMTP_USER` becomes `orders@darlinghome.bg`.

## Verifying

In order, because each depends on the previous:

1. `openssl s_client -connect mail.darlinghome.bg:25 -starttls smtp` — TLS presents
   a valid certificate for the right name.
2. Send **to** `orders@darlinghome.bg` from an outside account — receiving works.
3. Send **from** it to a Gmail address, then in Gmail use *Show original*: SPF,
   DKIM and DMARC must all read **PASS**. Any one failing means it goes to spam.
4. Check `https://mxtoolbox.com/blacklists.aspx` for the IP. A fresh hosting IP is
   sometimes already listed through no fault of ours; delisting is usually a form.

## The honest risk

This was chosen over a relay knowing the trade-off. The failure mode is not "mail
stops" — it is **order confirmations silently landing in spam**, which shows up as
customers phoning to ask where their receipt is. If that starts happening, the
fallback is to keep this server for receiving and send through a relay on port 587,
which needs no port-25 unblock and inherits an established sending reputation.
