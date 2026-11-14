# Spotted

Places worth staying. Apartments and guest houses in Abuja, Nigeria, where power, water, wifi and security are spelled out before you book.

One repo, one database, one identity:

- `apps/mobile`: Expo app for Android and iOS
- `apps/web`: Next.js website
- `packages/tokens`: the logo, colours, fonts, icons and the 22-item amenity standard, shared by both
- `packages/core`: the data layer, formatting and payments, shared by both
- `supabase/`: the database (tables, rules, security, tests, demo data)

Start with **[docs/SETUP.md](docs/SETUP.md)**.

## What works in this release (guest side)
Browse and search with filters, listing pages with the amenity standard, saved places, dates and live server-side price, reserve with a 20-minute hold, pay (Paystack, Flutterwave or test mode behind one switch), confirmation with the booking code, address and wifi released to the guest only during their stay, cancel, trips, sign-in by phone code, email code or Google, claim an unclaimed place.
