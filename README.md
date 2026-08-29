# BinderBuddy

Track your Pokémon TCG collection — official sets pulled live from
[pokemontcg.io](https://pokemontcg.io), plus your own custom sets/cards. Log
every variant you own (holofoil, reverse holo, 1st edition, alt art, promo…),
what you paid, and current market value, with card images throughout.

Built as a mobile-first responsive web app (Next.js) with an eye toward a
native app later — the plan is to reuse this same Supabase backend with a
React Native client down the road.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** — Postgres database, auth (email/password, multi-user), row-level
  security so every user only sees their own collection
- **pokemontcg.io** — official set/card data, images, and TCGplayer market
  prices per variant

## Setup

### 1. Create a Supabase project

Sign up / log in at [supabase.com](https://supabase.com) and create a new
project (the free tier is enough to start).

In the SQL editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql)
once — this creates all tables, indexes, and row-level-security policies.

Go to **Project Settings → API** and copy the **Project URL** and **anon
public key**.

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
POKEMONTCG_API_KEY=   # optional, see below
```

`POKEMONTCG_API_KEY` is optional — the API works without a key at a lower
rate limit (30 req/min) and, in practice, is noticeably less reliable
(intermittent 500s) without one. For a free key with a much higher limit,
sign up at [dev.pokemontcg.io](https://dev.pokemontcg.io/) — recommended
before using the "Import Excel" flow for official cards, since it looks up
every row against the API.

### 3. Install and run

```bash
npm install
npm run dev
```

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
- **Custom sets/cards/variations** you create live in Supabase
  (`custom_sets`, `custom_cards`, `custom_variations`), scoped to your
  account.
- **`collection_entries`** is the one table that actually represents "what
  you own" — quantity, condition, price paid, a market-price snapshot, and a
  denormalized image/name so your collection still renders correctly even if
  a card's source data changes later. It points at either an official card
  (`external_card_id`) or a custom variation (`custom_variation_id`).

## Bulk import from Excel

Two separate importers, both under **Import Excel** buttons in the UI:

- **Custom set → Import Excel** ([`/sets/custom/[setId]/import`](src/app/sets/custom/%5BsetId%5D/import)):
  bulk-creates cards/variations in one of your own custom sets. You supply
  the market price yourself (there's no external pricing source for homebrew
  cards). Re-importing the same file updates existing cards instead of
  duplicating them.
- **Collection → Import Excel** ([`/collection/import`](src/app/collection/import)):
  bulk-adds *official* Pokémon cards straight to your collection. You list
  Card Name (+ ideally Set Name and Card Number), and each row is matched
  against the pokemontcg.io API to fetch the image and current market price
  automatically. Set Name and Card Number matter — many card names are
  reprinted across sets, and some sets reprint the same name more than once
  (alt art, secret rare); without both, the importer picks the first match
  and flags the row so you can double check it.

Both flows return a results summary with per-row warnings (unmatched cards,
ambiguous matches, bad price values) rather than failing the whole file.

## Deploying

The app deploys cleanly to [Vercel](https://vercel.com/new) — connect the
repo and add the same environment variables from `.env.local` in the
project settings.

## Roadmap

- Native app (React Native / Expo) sharing this Supabase backend
- Price refresh job so `market_price` snapshots stay current over time
- Search across sets, wishlist, image upload for custom cards (currently
  URL-based)
