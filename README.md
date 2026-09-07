# Chola Atelier — cloud-powered mobile store

Next.js 14 + Supabase (cloud database, auth, storage) + Razorpay. Mobile-first,
matches the approved app mockups: Home, Product (multi-shot gallery + video +
swipe gestures), Cart (swipe-to-delete), Checkout (with direct "Buy now"),
Order confirmation, Tracking, Account, Admin.

## What's built

- **Storefront**: Home (pull-to-refresh), Shop (all products), Search,
  Product detail (colour/size, swipeable image+video gallery, wishlist
  heart, Add to bag, Buy now), Cart (swipe left to remove an item),
  Checkout, Order confirmation, Wishlist, Account with order history,
  Addresses (list + add), Order tracking, Contact, Login/Signup.
- **Cloud backend**: Supabase Postgres database (`supabase/schema.sql`) with
  every table from the spec — products, variants, media, categories,
  collections, customers, addresses, cart, wishlist, orders, order items,
  coupons, reviews, store settings — plus Row Level Security so customers can
  only ever see their own cart/orders/addresses, and a database trigger that
  reliably creates each customer's profile row right at signup.
- **Payments**: Razorpay order creation and signature verification happen
  only in server routes (`app/api/orders/create`, `app/api/razorpay/verify`)
  — the secret key never reaches the browser, and is only touched at all for
  online payments (Cash on Delivery works with zero Razorpay setup).
- **Buy now**: skips the cart entirely — a single-item order is created
  directly from the product page.
- **Admin**: `/admin/products` to list products, `/admin/products/new` to
  add a product with its first variant and upload images/video straight to
  Supabase Storage. Only accounts with `is_admin = true` in the `customers`
  table can reach `/admin` — and only those accounts can actually write to
  the products/variants/media tables or the storage bucket, enforced at the
  database level.
- **Inventory**: stock is decremented server-side via the
  `decrement_variant_stock` Postgres function only after payment is verified
  (or immediately for COD), and the order route rejects checkout if stock
  ran out in the meantime.

## What you still need to add

- Category/collection listing pages, reviews UI, coupon apply logic at
  checkout, admin edit/delete for existing products, admin order and coupon
  management screens, about/policy pages. They all follow the same pattern
  as the pages that exist — copy `app/shop/page.tsx` or `app/cart/page.tsx`
  as a template and query the relevant table from `supabase/schema.sql`.

## 1. Set up Supabase (cloud database + auth + storage)

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the SQL editor, paste the entire contents of `supabase/schema.sql` and
   run it. This creates every table, security rule, and the stock-decrement
   function. **If you already ran an earlier version of this file**, run it
   again — this version adds a signup trigger and several missing security
   policies that earlier drafts were missing (`create table`/`create
   policy` statements that already exist will just error harmlessly and
   can be ignored, or drop the tables first for a totally clean slate).
3. Go to **Storage** → create a new bucket called `product-media` → set it
   to **public**.
4. Go to **Project settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret,
     never put it in frontend code)
5. To make your own account an admin: sign up on the site once, then in
   Supabase's **Table editor → customers**, find your row and set
   `is_admin` to `true`.

## 2. Set up Razorpay

1. Create an account at [razorpay.com](https://razorpay.com), switch to
   **Test mode** first.
2. Go to **Settings → API keys**, generate a key pair.
3. Copy the Key ID → `NEXT_PUBLIC_RAZORPAY_KEY_ID` and Key Secret →
   `RAZORPAY_KEY_SECRET`.
4. Only go live (real payments) after testing fully in test mode.

## 3. Run locally

```bash
cp .env.example .env.local
# fill in the values from steps 1 and 2 above
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Deploy (free)

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. In Vercel's project settings → Environment Variables, paste in the same
   values from your `.env.local`.
4. Deploy. Vercel gives you a live HTTPS URL immediately; you can attach a
   custom domain later from the same settings page.

Your cloud backend (Supabase) and frontend (Vercel) are now both live —
the store works on any Android phone browser, and you can keep adding
products from `/admin` without touching any code.

## Project structure

```
app/                 pages (Next.js App Router)
  product/[slug]/    product detail page
  checkout/          cart checkout + buy-now checkout
  api/               server-only routes (Razorpay, order creation)
  admin/             admin dashboard (product CRUD)
components/          shared UI (ProductCard, gallery, nav)
lib/supabase/        cloud database client setup
supabase/schema.sql  full database schema — run this once in Supabase
```
