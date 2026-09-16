# OPC public catalog

Community-wide offers and ideas appear here **only after GOV + owner approval**, then ship in a numbered app release (`public/catalog/<version>.json`).

Personal Mes services offers, En demande requests, Interac/PayPal, chat, Vos idées, and the local registration profile stay on the visitor’s device until that happens. A sanitized copy of a submitted idea (text, city, timestamp — no name/email/OPC number) may also go to the owner Worker inbox. That inbox is not a public catalog.

## 0.3.3 — 2026-09-16

- Vos idées: stronger on-device wall + thank-you. Submitting sends a sanitized copy to `POST /ideas` on the Cloudflare Worker (plain text, city, timestamp).
- Owner (Politzer) compiles received ideas via `GET /ideas?secret=` (HTML or `&format=json`) or the unlisted page `/proprietaire/idees`. No invented sample ideas.
- Public catalog remains empty.

## 0.3.2 — 2026-09-16

- Device-local registration on Mon profil (first name, last name, email, phone) with a stable `OPC-XXXX` member number.
- Header shows a short first name or initials next to the logo. Email and phone stay off the chrome and off any server.
- Returning visits restore avatar, profile, and Vos idées from localStorage. Home skips the picker and does not auto-replay welcome speech.
- Public catalog remains empty.

## 0.3.1 — 2026-09-15

- Regional ambiance backgrounds after geolocation (Caribbean, Africa Sahel, Europe meadow, Asia terraces, South America Andes). Canada/USA keep the four-season calendar. First paint before geo stays autumn.
- Public catalog remains empty.

## 0.3.0 — 2026-09-15

- Soft-launch privacy gate: public catalog is empty.
- Removed the bundled “featured” Gatineau morning car loan that every install used to see.
- Demo `/services/*` listings are no longer written into `localStorage`.
- Fresh devices start with a blank personal slate.
