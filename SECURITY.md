# Security (soft launch)

Visitor ideas, chat, share text, offer notes, and monetization suggestions are **untrusted data**. They never become Git, never become HTML, and never become executable URLs.

## What visitors cannot do

- **No path to the GitHub repo.** Submitting *Vos idées*, chatting with the avatar, or sharing an offer only writes to the visitor’s `localStorage` and (if they consented) to the anonymous `/stats` worker. Nothing auto-opens a pull request, commit, or GitHub issue.
- **GOV + owner review only.** Product changes land in git after a human reviews a PR. Visitor suggestions are never merged automatically.
- **No file uploads.** This MVP has no visitor file, image, or attachment input. Pasted “ideas” that look like binaries, PEM blocks, or long base64 blobs are neutralized to `[removed-binary]`.
- **No HTML execution.** User strings are React text nodes / `textarea` values (`textContent`), never `dangerouslySetInnerHTML`. Idea-wall URLs are **not** auto-linked. `javascript:`, `data:`, `vbscript:`, and `file:` schemes are stripped on input and again before analytics POST.

## What we sanitize

| Surface | Stored as | Emails | Length |
| --- | --- | --- | --- |
| Vos idées | Plain text in `localStorage` | Redacted | 500 |
| Avatar chat | Plain text in the session; worker JSON | Kept (Interac talk) | 4000 |
| Share / invite text | Plain text (clipboard + `localStorage`) | Kept (site URLs) | 2500 |
| Offer notes / titles | Plain text | Notes kept; neighborhood redacted | 800 / 80 |
| Interac / PayPal | Contact string or `https://www.paypal.me/…` handle | Interac emails kept | 80 |
| `idea_submit` / `monetize_suggestion` | Plain text in D1 `suggestion` | Redacted | 80 / 280 |

Analytics also drops GPS-looking strings and forbidden keys (`lat`, `email`, `name`, …). The stats worker rejects non-JSON `Content-Type`, bodies over 16 KiB, and unknown event types.

Outbound links built from visitor fields:

- PayPal: handle `[A-Za-z0-9._-]+` only → `https://www.paypal.me/…` with `rel="noopener noreferrer nofollow"`.
- `mailto:` / `sms:` only after email/phone validation (never `javascript:`).
- First-party mission links (Prolific, UserTesting, micro1) are hardcoded HTTPS, not user content.

## Content-Security-Policy

GitHub Pages **cannot** set CSP HTTP headers. The app ships a `<meta http-equiv="Content-Security-Policy">` tag (`src/lib/csp.ts`): `object-src 'none'`, `base-uri 'self'`, `connect-src` / `frame-src` allow `https:` and `wss:` so RainbowKit / WalletConnect and the Cloudflare worker keep working. Next.js static hydration needs `script-src 'unsafe-inline'`. Treat the meta CSP as defense-in-depth, not a substitute for never rendering user HTML.

## Worker deploy

Sanitize + Content-Type checks live in `workers/xsnow-chat`. After merging, redeploy:

```bash
cd workers/xsnow-chat
npx wrangler deploy
```
