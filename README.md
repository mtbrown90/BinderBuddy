# BinderBuddy

Track your Pokémon TCG collection — official sets pulled live from
[pokemontcg.io](https://pokemontcg.io). Log every variant you own (holofoil,
reverse holo, 1st edition, alt art, promo…), what you paid, and current
market value, with card images throughout. Build **master sets** — checklists
of every real printing of a Pokémon (e.g. "Piplup Masterset") — and track
your progress toward completing them.

Built as a mobile-first responsive web app (Next.js) with an eye toward a
native app later — the plan is to reuse this same Supabase backend with a
React Native client down the road.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** — Postgres database, auth (email/password, multi-user), row-level
  security so every user only sees their own collection
- **pokemontcg.io** — official set/card data, images, and TCGplayer market
  prices per variant
- **Stripe** — payment for the paid "auto-populate a master set" feature

## Setup

### 1. Create a Supabase project

Sign up / log in at [supabase.com](https://supabase.com) and create a new
project (the free tier is enough to start).

In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) once —
this creates all tables, indexes, and row-level-security policies. (If
you'd already run an older version of this file, run
[`supabase/migrations/0001_mastersets_pivot.sql`](supabase/migrations/0001_mastersets_pivot.sql)
instead — it upgrades an existing database without losing data.)

Go to **Project Settings → API**. You need two values from there:
- **Project URL**
- **anon public** key (or the newer **publishable** key — either works).

You'll also need the **service role** key (under **Legacy API Keys**, or the
newer **secret** key) for the Stripe webhook step below — keep this one out
of the browser entirely, it bypasses all row-level security.

### 2. Create a Stripe account (test mode)

Sign up at [stripe.com](https://stripe.com) — no business verification is
needed to use test mode. From the Stripe dashboard:

- Grab your **test mode secret key** (`sk_test_...`) under **Developers → API keys**.
- To receive webhooks locally, install the [Stripe CLI](https://docs.stripe.com/stripe-cli)
  and run:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```
  This prints a webhook signing secret (`whsec_...`) — use that for local dev.
  For a deployed app, create a webhook endpoint in the Stripe dashboard
  pointing at `https://your-domain/api/stripe/webhook` listening for the
  `checkout.session.completed` event, and use the signing secret it gives you.
- Decide your real price for auto-populating a master set (default is $2.99,
  set via `MASTERSET_AUTOPOPULATE_PRICE_CENTS`).
- To test a purchase, use [Stripe's test card numbers](https://docs.stripe.com/testing)
  — e.g. `4242 4242 4242 4242`, any future expiry, any CVC. No real charge
  occurs in test mode.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the Supabase URL/anon
key, service role key, and Stripe keys from the two steps above.

`POKEMONTCG_API_KEY` is optional — the API works without a key at a lower
rate limit (30 req/min) and, in practice, is noticeably less reliable
(intermittent 500s) without one. For a free key with a much higher limit,
sign up at [dev.pokemontcg.io](https://dev.pokemontcg.io/) — recommended
before using the "Import Excel" flow, since it looks up every row against
the API.

### 4. Install and run

```bash
npm install
npm run dev
```

If you're testing the auto-populate payment flow locally, also run
`stripe listen --forward-to localhost:3000/api/stripe/webhook` in a second
terminal so webhook events reach your dev server.

Open [http://localhost:3000](http://localhost:3000). Email confirmation is
on by default in Supabase — check the inbox for the address you sign up
with (or disable confirmation in **Authentication → Providers → Email** for
local testing).

## How data is modeled

- **Official cards** aren't duplicated into our own database — the app reads
  them live from pokemontcg.io (cached for 12h) so the catalog and images stay
  current. Each card's `tcgplayer.prices` object maps directly to variants
  (Normal, Holofoil, Reverse Holo, 1st Edition Holofoil, etc.) with market
  price per variant.
- **`collection_entries`** is the table that represents "what you own" —
  quantity, condition, price paid, a market-price snapshot, and a
  denormalized image/name so your collection still renders correctly even if
  a card's source data changes later. Always points at an official card via
  `external_card_id`.
- **Master sets** (`master_sets` + `master_set_cards`) are checklists you
  curate — a name plus a list of official cards, added either one at a time
  via search or automatically via the paid auto-populate feature.
  `master_set_cards` membership is independent of ownership: a master-set
  page cross-references its cards against your `collection_entries` (by
  `external_card_id`) to show which ones you already own.
- **`masterset_purchases`** tracks the paid auto-populate feature. A row is
  created `pending` when checkout starts; it only ever flips to `completed`
  from the Stripe webhook handler ([`src/app/api/stripe/webhook/route.ts`](src/app/api/stripe/webhook/route.ts)),
  using the service-role key to bypass RLS — the client is never trusted to
  self-report a successful payment. That handler also does the actual
  population (searching pokemontcg.io for every name on the purchase and
  inserting matches into `master_set_cards`).

## Bulk import from Excel

**Collection → Import Excel** ([`/collection/import`](src/app/collection/import))
bulk-adds official Pokémon cards straight to your collection. You list Card
Name (+ ideally Set Name and Card Number), and each row is matched against
the pokemontcg.io API to fetch the image and current market price
automatically. Set Name and Card Number matter — many card names are
reprinted across sets, and some sets reprint the same name more than once
(alt art, secret rare); without both, the importer picks the first match and
flags the row so you can double check it. Returns a results summary with
per-row warnings rather than failing the whole file.

## Deploying

The app deploys cleanly to [Vercel](https://vercel.com/new) — connect the
repo and add the same environment variables from `.env.local` in the
project settings, using **live** Stripe keys (and a live-mode webhook
endpoint) once you're ready to accept real payments instead of test ones.

## Roadmap

- Native app (React Native / Expo) sharing this Supabase backend
- Price refresh job so `market_price` snapshots stay current over time
- Bulk Excel import for building a master set's checklist
- Variation-level (not just card-level) completion tracking on master sets
