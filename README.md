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

## Deploy to Vercel

Import this GitHub repository into Vercel. Vercel builds the frontend and
deploys the `/api/*` Node.js function from `api/[...path].js`; the API stores
rooms, paid bookings, and newsletter subscriptions in Neon PostgreSQL instead
of the local JSON files.

Create a Neon PostgreSQL database and add these environment variables in the
Vercel project settings for Production (and Preview if needed):

- `DATABASE_URL`: Neon connection string.
- `STRIPE_SECRET_KEY`: Stripe secret key. This sample catalog deliberately
  accepts Stripe test keys only.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the Stripe webhook at
  `https://<your-vercel-domain>/api/stripe-webhook`.
- `CLERK_SECRET_KEY`: Clerk server secret.
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key.
- `PUBLIC_APP_URL`: canonical Vercel deployment origin, with no trailing
  slash (for example, `https://quick-stay.vercel.app`).
- `VITE_BASE_PATH`: `/`.
- `VITE_API_URL`: leave empty; the Vercel frontend and API share one origin.

Redeploy after configuring variables. Vercel's deployment filesystem is
ephemeral, so the local JSON stores are not used when `DATABASE_URL` is set.
Existing local JSON room and booking data are not automatically migrated; the
four sample catalog rooms are inserted into a new database on first use.

In Stripe test mode, use the test card `4242 4242 4242 4242`, any future
expiration date, and any three-digit CVC. Test mode does not charge real money.
Never put a Stripe secret key in frontend code or commit `.env`.

Paid bookings are verified with Stripe and written to a local JSON file during
development or to PostgreSQL when `DATABASE_URL` is set. This sample catalog
currently has four rooms; their IDs and prices are listed in
`server/roomCatalog.js`. Only Stripe test keys are accepted: live payments are
deliberately disabled while the project uses sample inventory.

Newsletter subscriptions are accepted by `POST /api/newsletter/subscribe` and
saved locally or to PostgreSQL when `DATABASE_URL` is set. This records
subscribers but does not send emails; connect a mailing-list provider before
using the form for an email campaign.

The GitHub Pages frontend can use a separately hosted Node.js API. Configure
`VITE_API_URL` to the API's HTTPS origin when building the frontend, and set
`PUBLIC_APP_URL` on the API to the deployed app URL, including its
`/Hotel-Booking/` base path. The API uses that app's origin for CORS. The
frontend variable is public; never put server secrets in `VITE_*` variables.
For example, the values have this shape:

```text
VITE_API_URL=https://your-api-host.example.com
PUBLIC_APP_URL=https://your-github-name.github.io/Hotel-Booking/
```

Set `VITE_API_URL` and `VITE_CLERK_PUBLISHABLE_KEY` in the frontend build
environment (for example, GitHub Actions repository variables), then rebuild
and redeploy the site. Do not add the API URL's `/api` suffix.

Set `STRIPE_SECRET_KEY` to a Stripe test key, `CLERK_SECRET_KEY` to the Clerk
server key, and `VITE_CLERK_PUBLISHABLE_KEY` when building the frontend. To
confirm bookings from webhooks, also configure `STRIPE_WEBHOOK_SECRET` and
point the Stripe webhook to `/api/stripe-webhook`. Rebuild and redeploy the
frontend after changing `VITE_API_URL`. Until it is set, the GitHub Pages
frontend remains in sample-data mode and disables API-backed actions.

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
