# Vendored fonts

Build-time downloads from Google Fonts (`next/font/google`) broke CI in
sandboxed environments without network access, so the four families used by
`src/app/layout.tsx` are vendored here as variable latin-subset woff2 files
and loaded with `next/font/local`. Same families, same weights, same CSS
variables as before.

| File | Family | Weights | Source |
| --- | --- | --- | --- |
| `inter-latin.woff2` | Inter | 100–900 | fonts.gstatic.com (Inter v20) |
| `outfit-latin.woff2` | Outfit | 100–900 | fonts.gstatic.com (Outfit v15) |
| `fraunces-latin.woff2` | Fraunces | 100–900 | fonts.gstatic.com (Fraunces v38) |
| `plus-jakarta-sans-latin.woff2` | Plus Jakarta Sans | 200–800 | fonts.gstatic.com (Plus Jakarta Sans v12) |

All four families are licensed under the SIL Open Font License 1.1, which
permits bundling and redistribution with the software.
