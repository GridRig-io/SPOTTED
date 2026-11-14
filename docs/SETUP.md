# Spotted: setup in about 30 minutes

> **Live now (14 Nov 2026)**
> - Website: https://spotted-gules.vercel.app (Vercel project `spotted`, team GridRig-io, root directory `apps/web`)
> - Database: Supabase project `spotted` (`xdczoryoeidjhvqmzlwd`, London). Migrations 0001 to 0005 and the demo seed are already loaded.
> - `.env` in this folder is already filled with the live public values. Only `SUPABASE_SERVICE_ROLE_KEY` is left blank on purpose: add it in Vercel, not here.
> - The app (`apps/mobile`) points at the same database and at the live website for payments. `eas.json` carries the public values, so `npx eas-cli build -p android --profile preview` works without extra setup.
> - To redeploy the website after changes: from this folder, `npx vercel deploy --prod` (after `npx vercel link --project spotted`).

You will do four things: make a Supabase project, load the database, fill in one `.env` file, and start the website and the app. Nothing here costs money to begin with.

## 1. Make the database (Supabase, free plan)

1. Sign up at supabase.com and create a project. Pick the region closest to Nigeria that is offered (Europe is usually fastest from Abuja). Save the database password somewhere safe.
2. Open **SQL Editor**. Run these four files **in this order**, each one pasted whole and run once:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_logic.sql`
   3. `supabase/migrations/0003_security.sql`
   4. `supabase/migrations/0004_reference_data.sql`
3. Optional, to see the app with something in it: run `supabase/seed/demo.sql`. It adds 9 demo places (12 rooms, 3 unclaimed) marked `is_demo`. Remove them any time with `delete from properties where is_demo;`
4. Open **Project settings > API** and copy the **Project URL**, the **anon public** key and the **service_role** key.

> The service_role key can read and write everything. It goes only in `.env` for the website's server. It is never copied into the app.

### Sign-in methods (Authentication > Providers)
- **Email code**: works straight away. In Authentication > Email Templates, put `{{ .Token }}` in the "Magic Link" template so the email carries the 6-digit code.
- **Phone code**: turn on Phone, then connect an SMS provider (Twilio, MessageBird, Vonage, or Termii through a custom setup). This is the one thing you must choose and pay for yourself. Until then guests can use email or Google.
- **Google**: create OAuth credentials in Google Cloud, paste the client ID and secret into Supabase.
- **Redirect URLs** (Authentication > URL Configuration): add your website address, and for the app add `spotted://auth-callback`. While testing in Expo Go, also add the `exp://…/--/auth-callback` address that Expo prints.

## 2. One `.env` file

```bash
cp .env.example .env      # fill in the values from step 1
npm install
npm run env               # copies the right values into the website and the app
```

`PAYMENT_PROVIDER` stays `test` until you are ready to take real money (step 5).

## 3. Run the website

```bash
npm run web               # http://localhost:3000
```

## 4. Run the app

```bash
npm run mobile            # then press "a" for Android, or scan the QR code with Expo Go
```

The app talks to the same Supabase database as the website, and for payments it calls the website's API. So set `SITE_URL` in `.env` to an address the **phone** can reach: when testing on a real phone, use your computer's network address (for example `http://192.168.1.20:3000`), then run `npm run env` again and restart both.

To build an installable Android file (an APK you can send to testers), from `apps/mobile` run `npx eas-cli init` once, then `npx eas-cli build -p android --profile preview`. This needs a free Expo account. Values from `apps/mobile/.env` are not uploaded automatically: add the three `EXPO_PUBLIC_*` values in your Expo project's environment variables first. iOS needs an Apple developer account ($99 a year) and the same build command with `-p ios`.

## 5. Put the website live (Vercel, free plan)

1. Push the repo to GitHub and import it in Vercel. Set **Root Directory** to `apps/web`.
2. Add these environment variables in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your live address), `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_PROVIDER`, and the keys for the gateway you pick.
3. Set `SITE_URL` in your local `.env` to the live address and run `npm run env` so the app points at it.

### Going live with payments
Pick **one** in `PAYMENT_PROVIDER`:

| Gateway | Set | Webhook to register in their dashboard |
|---|---|---|
| Paystack | `PAYMENT_PROVIDER=paystack`, `PAYSTACK_SECRET_KEY` | `SITE_URL/api/pay/webhook/paystack` |
| Flutterwave | `PAYMENT_PROVIDER=flutterwave`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH` (the same text you type as "secret hash" in their dashboard) | `SITE_URL/api/pay/webhook/flutterwave` |

Test mode (`test`) moves no money and must **never** be left on for real guests. Both gateways are checked server to server before a booking is confirmed, so a faked redirect cannot confirm anything.

## 6. Settings you can change without code

In the Supabase table editor, open `app_settings`:

| Key | Now | Meaning |
|---|---|---|
| `host_commission_pct` | 10 | **Placeholder.** Taken from the host after the free months. Decide your real number before launch. |
| `guest_service_fee_pct` | 0 | Extra fee shown to guests. Gateway fees and any state consumption tax are yours to price in. |
| `free_months_for_new_owners` | 2 | Months with no commission for a new host. |
| `booking_hold_minutes` | 20 | How long dates are held while a guest pays. |

## Where things are

```
apps/web         Next.js website (Vercel)
apps/mobile      Expo app (Android and iOS)
packages/tokens  Colours, fonts, logo, icons, the 22 amenities. Used by both.
packages/core    Data access, formatting, payments. Used by both.
supabase/        Database files, demo data, tests
assets/brand     Logo and app icon files
```

## Checks

```bash
npm run typecheck   # all four packages
npm run test        # unit tests + 31 database checks (runs a local Postgres in memory)
```

## Not built yet (next phases)
Host side (dashboard, photo upload with the 5-photo rule, amenity form, calendar), each host's own address (`name.spotted.ng`), the super-admin area, in-app messages, and App Store submission. The database already has the tables, security rules and publishing gate for the host side.
