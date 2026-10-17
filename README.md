# QuickStay

QuickStay is a React and Vite hotel-booking demo with a Node.js API for Stripe
Checkout.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY` to a Stripe test
   secret key (`sk_test_...`), plus `CLERK_SECRET_KEY` and
   `VITE_CLERK_PUBLISHABLE_KEY` from your Clerk application.
3. Run `npm run dev`. Vite serves the site on port 5173 and the payment API
   listens on port 4242.
4. For local webhook delivery, run the Stripe CLI in another terminal:
   `stripe listen --forward-to localhost:4242/api/stripe-webhook`, then copy
   its `whsec_...` signing secret to `STRIPE_WEBHOOK_SECRET` in `.env` and
   restart the app.

In Stripe test mode, use the test card `4242 4242 4242 4242`, any future
expiration date, and any three-digit CVC. Test mode does not charge real money.
Never put a Stripe secret key in frontend code or commit `.env`.

Paid bookings are verified with Stripe and written to
`server/data/bookings.json` (ignored by Git). This sample catalog currently has
four rooms; their IDs and prices are listed in `server/roomCatalog.js`. Only
Stripe test keys are accepted: live payments are deliberately disabled while
the project still uses sample inventory and a local JSON booking store. Update
the server-side catalog and add a persistent production database and
availability checks before enabling live charges.

Newsletter subscriptions are accepted by `POST /api/newsletter/subscribe` and
saved to `server/data/subscribers.json` (ignored by Git). This records
subscribers locally but does not send emails; connect a mailing-list provider
before using the form for an email campaign.

## Admin room dashboard

Open `/owner` and sign in with Clerk. The signed-in Clerk user must have
`publicMetadata.role` set to `admin` or `hotelOwner`; the API verifies both the
Clerk session token and this role before allowing room changes. Set the role in
the Clerk Dashboard under the user's public metadata, for example:
`{"role":"admin"}`.

Room listings are initialized from `server/roomCatalog.js` and then persisted
to `server/data/rooms.json` (ignored by Git). The dashboard supports adding,
editing, removing, searching, filtering, and changing room availability. Public
room listings and checkout use the same saved catalog.

The local JSON stores for rooms, bookings, and newsletter subscribers are for
development and are not suitable for a multi-instance production deployment.
Never put a Stripe secret key in frontend code or commit `.env`.
