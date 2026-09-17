# Owner: list visitor ideas (`GET /ideas`)

Visitors keep ideas on-device. A sanitized copy is also `POST`ed to the Worker
inbox (`/ideas`) so you can compile and review. Email to
`opencommunity.opc@gmail.com` (Resend) is the primary live inbox.

The mail body is idea text, city/place if known, ISO date, and OPC member
number if the visitor is registered on that device. Visitor phone and email
are **never** included on this mail (they stay on-device unless the visitor
opted in via Mon profil, which uses a separate `POST /register` notice).

If Resend or the network fails, the idea still stays in `localStorage` and on
the device wall. The Worker returns `{ ok: true, emailed: false }`.

## Later: WhatsApp (optional)

WhatsApp Business is **out of scope** for this soft launch (cost and setup).
Do not add a WhatsApp sender, Cloud API token, or Business number on this
Worker. A later optional channel could forward the **same** sanitized payload
(idea text, city, date, OPC id — never visitor phone/email unless they opted
in) to WhatsApp. It would not replace Gmail.

## Secret

Set once on the Worker (never commit):

```bash
cd workers/xsnow-chat
npx wrangler secret put IDEAS_OWNER_SECRET
```

Without this secret, `GET /ideas` is denied. Deploy is separate (`npx wrangler deploy`); do not redeploy from this doc alone if another agent owns wrangler login.

## List / compile

Base URL: `https://xsnow-chat.xsnowopc.workers.dev`

| Format | How |
| --- | --- |
| HTML compile page | `GET /ideas?secret=YOUR_SECRET` |
| JSON | `GET /ideas?secret=YOUR_SECRET&format=json` |
| Bearer | `Authorization: Bearer YOUR_SECRET` on the same paths (query `secret` optional) |
| App helper (unlisted) | `https://opencommunity.app/proprietaire/idees/?secret=…` |

Examples:

```bash
# HTML in the browser
open "https://xsnow-chat.xsnowopc.workers.dev/ideas?secret=$IDEAS_OWNER_SECRET"

# JSON for scripting
curl -sS -H "Authorization: Bearer $IDEAS_OWNER_SECRET" \
  "https://xsnow-chat.xsnowopc.workers.dev/ideas?format=json"
```

The empty inbox does **not** invent ideas. Local device copies remain even if
Worker/email soft-fails (client shows confirmation after on-device save).

## Related

- Soft-launch flow: README « Boîte d’idées (propriétaire) »
- Security wall: `SECURITY.md` (no last name / phone in the inbox payload)
- Worker handlers: `workers/xsnow-chat/src/ideas.ts`
