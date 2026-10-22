# As You Can See — Showroom Rentals

Rental system for the As You Can See showroom. [asyoucansee.com](https://asyoucansee.com) (Shopify) stays the store; this app handles member accounts, rental quotes, cards on file, late fees, and notifications.

**Stack:** Next.js 15 (App Router) · Supabase (auth + Postgres) · Stripe (saved cards, off-session charges) · Shopify Admin API · Resend (email) · Twilio (SMS) · Vercel (hosting + cron)

## How it works

- **Members** sign up with name, address, email, phone, and social, then save a card through Stripe.
- **Pieces** are mirrored from Shopify (`POST /api/shopify/sync`). You mark which ones are rentable and can override the daily rate.
- **Quotes** (`src/lib/pricing.ts`) = daily rate × duration discount × weekend/rush/peak timing × relationship tier (public, member, friend, family, comp). All knobs live in `PRICING`.
- **Sold out on Shopify:** when a piece goes out, its Shopify inventory drops by 1. It goes back up on return (`adjustAvailable`).
- **Late fees:** $30/day. A daily Vercel cron (`/api/cron/late-fees`) charges the card on file for each new late day and texts/emails the member.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
npm test
```

Apply the schema with `supabase/migrations/0001_init.sql` (Supabase SQL editor or `supabase db push`).
