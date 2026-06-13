# YummyDog 🌭

Mobile-first hot dog stand SPA built with **Nuxt 3** — customer ordering and an admin dashboard.

## Customer app

- Browse menu with prices (hot dogs, sides, drinks)
- Add items to cart and adjust quantities
- Checkout with name, notes, and payment method
- Order confirmation with order number

## Admin dashboard

Sign in at `/admin/login`

- **Orders** — Kanban board (New → Preparing → Ready → Completed)
- **Transactions** — Sales log with payment method and timestamps
- **Accounting** — Revenue, expenses, net profit; record business expenses
- **Stats** — Today's revenue/orders, averages, top sellers

Data persists in **MongoDB** for orders, transactions, expenses, inventory, and equipment. Projector assumptions remain in browser `localStorage`. Admin auth uses `sessionStorage`.

On first load after this update, any existing expense/inventory/equipment data in `localStorage` is migrated into MongoDB automatically when those collections are empty.

## MongoDB

Add your connection string to `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/yummydog
# Or Atlas: mongodb+srv://user:pass@cluster.mongodb.net/yummydog
```

The app uses database **`yummydog`** (override with `MONGODB_DB_NAME`). Collections are created on server start: `orders`, `transactions`, `expenses`, `inventory`, `equipment`, `counters`.

Or use a [MongoDB Atlas](https://www.mongodb.com/atlas) URI. Restart the dev server after changing `.env`.

Collections: `orders`, `transactions`, `counters` (daily pickup numbers).

## Order tracking

After checkout, customers land on `/waiting/:id` with live status:

1. Order accepted
2. Dogs on the grill
3. Preparing
4. Order ready (pickup number)

Admin moves orders through the kanban; the waiting page polls every 4 seconds.

## Browser notifications

On the waiting page, customers can enable **browser notifications** (free). Alerts fire when the order moves to:

- Dogs on the grill
- Preparing
- Order ready (with pickup number)

Keep the waiting page open (or in a background tab). On mobile, add YummyDog to your home screen for the best experience. No third-party service or API keys required.

## Stripe payments

Card payments use [Stripe Checkout](https://stripe.com/docs/payments/checkout). Copy `.env.example` to `.env` and add your keys:

```bash
cp .env.example .env
```

```env
STRIPE_SECRET_KEY=sk_test_...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- **Secret key** (`sk_`) — server only, never exposed to the browser
- **Publishable key** (`pk_`) — used to detect that Stripe is configured

Cash and mobile pay at the window skip Stripe and place orders directly.

Restart the dev server after changing `.env`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run preview
```
