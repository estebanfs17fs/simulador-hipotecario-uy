---
name: awesome-design
description: Pull typography, colour, spacing and component references from real-world design systems (VoltAgent's awesome-design-md DESIGN.md files) before designing or restyling UI. Use when choosing a visual direction, building a design system or tokens, or when the user asks for a page to look like a known brand or "more premium".
---

# Awesome Design (DESIGN.md references)

[awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT, VoltAgent) is a collection
of DESIGN.md files, each one an analysis of a real product's design language: colour roles, type
scale, spacing, radius and depth, component styles, layout principles, do's and don'ts.

## Bundled references (offline)

Picked for this project, a mortgage simulator where trust, numbers and comparison tables matter:

| File | Why it is useful here |
| --- | --- |
| `design-md/stripe.md` | Financial infrastructure: navy ink, one indigo action, tabular figures for money |
| `design-md/wise.md` | Money transfer: calculators and rate comparisons front and centre |
| `design-md/nerdwallet.md` | Personal finance comparison: dense comparison tables, green ladder |
| `design-md/mercury.md` | Banking: calm light product pages, one confident action pill |
| `design-md/revolut.md` | Consumer banking app: cards, figures, mobile-first |
| `design-md/coinbase.md` | Institutional finance tone, single brand blue used sparingly |
| `design-md/airbnb.md` | Property listings: search, cards with photos, warm consumer feel |

## Any other system

The full catalogue lives upstream. Fetch one with:
`https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<name>/DESIGN.md`

Available names: 1win, airbnb, airtable, aljazeera, apple, binance, bmw, bmw-m, bugatti, cal, claude,
clay, clickhouse, cohere, coinbase, composio, cursor, dell-1996, dji, elevenlabs, expo, ferrari, figma,
framer, hashicorp, hp, ibm, intercom, jobright, kraken, lamborghini, linear.app, lovable, mastercard,
mercury, meta, minimax, mintlify, miro, mistral.ai, mongodb, mydealz, nerdwallet, nike, nintendo-2001,
notion, nvidia, ollama, opencode.ai, oracle, oura, pinterest, playstation, posthog, raycast, renault,
replicate, resend, revolut, runwayml, sanity, sap, sentry, shopify, slack, spacex, spotify, starbucks,
stripe, supabase, superhuman, tesla, theverge, together.ai, uber, vercel, vodafone, voltagent, warp,
webflow, wired, wise, x.ai, zapier. The list grows; check the repo if a name is missing.

## How to use a reference

1. Pick one or two references that fit the job (do not average five of them into mush).
2. Read the whole file. Note the colour roles, the type scale and weights, the spacing unit, radius,
   elevation and the do's and don'ts.
3. Translate it into this project's own tokens: CSS custom properties in `:root` of `css/styles.css`,
   layered on Bootstrap 5 variables. Keep the site's own brand (logo teal `#4fb3a9`, navy `#1b2a4e`)
   and borrow the system's structure, not its brand colours or proprietary fonts.
4. Check every text/background pair for WCAG AA contrast before shipping.
5. Never copy logos, product names, photography or proprietary typefaces. Swap a proprietary font for
   the closest free one (for example Inter, Manrope or IBM Plex Sans from Google Fonts).

Pairs well with `design-taste-frontend` (art direction), `image-to-code` (rebuild from a screenshot)
and `web-design-guidelines` (audit the result).
