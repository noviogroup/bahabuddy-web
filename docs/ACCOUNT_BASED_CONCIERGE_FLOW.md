# Account-Based Concierge Flow

## Purpose

This document defines the preferred Concierge Trip Plan flow for Baha Buddy.

The current web flow supports immediate Stripe payment. The next product direction is to make Concierge primarily account-based so each paid order can be linked to a Baha Buddy customer account, delivered into the customer dashboard, and managed by the admin portal.

## Product Decision

The preferred Concierge flow should be:

```text
Customer creates/signs into Baha Buddy account
→ selects Concierge offer
→ pays with Stripe
→ concierge_orders row links to user_id
→ admin prepares itinerary
→ itinerary/proposed itinerary appears in customer dashboard
→ customer can view, approve, or request updates
```

## Why Account-Based Concierge Is Better

Concierge is not only a transaction. It is a service that should result in a living trip plan inside the Baha Buddy ecosystem.

Account-based checkout gives Baha Buddy the ability to:

- Keep the customer in the system.
- Link Stripe payments to `user_id`.
- Link Concierge orders to trips and itineraries.
- Add proposed itineraries directly to the customer dashboard.
- Allow customers to return, review, and continue planning.
- Support future changes, approvals, messages, and document requests.
- Cross-sell hotels, flights, tours, transfers, restaurants, partner offers, and Baha Visa services.
- Reduce disconnected records between Stripe, forms, email, and the admin portal.
- Improve support through a clear customer/order/trip history.

## Recommended User Experience

Do not block the marketing experience too early. Let users view the Concierge page and pricing first.

Gate the checkout step after the user selects an offer.

```text
/concierge-trip-plan
→ user selects Quick Review / Concierge Trip Plan / Full Planning Support
→ if not signed in, redirect to account creation/sign-in
→ after auth, return to checkout for selected offer
→ pay with Stripe
→ success page or dashboard order detail
→ submit/confirm trip details
→ admin prepares itinerary
→ itinerary is delivered in dashboard
```

## Recommended Routes

### Current route

```text
/concierge-trip-plan
```

Public marketing and pricing page.

### Proposed account-gated checkout route

```text
/concierge-trip-plan/checkout?offer=concierge_trip_plan
```

This route should:

1. Check whether the user is authenticated.
2. If not authenticated, redirect to login/signup with a return URL.
3. If authenticated, create or prepare a Concierge order record.
4. Start Stripe Checkout.

### Example auth redirect

```text
/login?redirect=/concierge-trip-plan/checkout?offer=concierge_trip_plan
```

or, if signup is preferred:

```text
/signup?redirect=/concierge-trip-plan/checkout?offer=concierge_trip_plan
```

### Proposed post-payment route

```text
/dashboard/concierge/[orderId]
```

Preferred future success destination once admin/order sync is implemented.

### Current post-payment route

```text
/concierge-trip-plan/success?session_id={CHECKOUT_SESSION_ID}&offer={offer_id}
```

This can remain temporarily while the dashboard order page is being built.

## Offer IDs

Use the same offer IDs already used by the Stripe Checkout route.

| Offer | Price | Offer ID |
|---|---:|---|
| Quick Review | $49 | `quick_review` |
| Concierge Trip Plan | $149 | `concierge_trip_plan` |
| Full Planning Support | $299 | `full_planning_support` |

## Data Model Requirements

The existing `concierge_orders` migration already includes:

```text
user_id uuid references auth.users(id)
```

This should become the preferred linkage field for Concierge orders.

Recommended order fields for account-based delivery:

```text
id
user_id
trip_id
offer_type
price_usd
status
payment_status
stripe_checkout_session_id
stripe_payment_intent_id
source
traveler_name
traveler_email
travel_dates
destination_interests
party_size
budget_range
notes
delivered_plan_url
created_at
updated_at
```

## Recommended Order Lifecycle

```text
selected
checkout_started
paid
details_needed
in_review
needs_info
in_progress
itinerary_proposed
delivered
cancelled
refunded
payment_failed
```

### Minimum operational statuses

```text
paid
in_review
needs_info
in_progress
delivered
cancelled
refunded
payment_failed
```

## Dashboard Delivery Model

The customer dashboard should eventually show a Concierge area with:

- Paid order status
- Offer purchased
- Travel dates
- Group size
- Budget range
- Preferred islands
- Notes submitted
- Proposed itinerary
- Delivered itinerary
- Next steps
- Support/contact option

## Proposed Itinerary Flow

Admin should be able to create a proposed itinerary and attach it to the customer account.

Recommended flow:

```text
Admin opens paid Concierge order
→ creates or uploads proposed itinerary
→ links itinerary to order and user_id
→ status changes to itinerary_proposed
→ customer sees itinerary in dashboard
→ customer can approve, request changes, or ask questions
→ final itinerary is marked delivered
```

## Guest Checkout Fallback

The primary flow should be account-based. However, guest checkout can remain as a fallback if conversion drops.

Recommended guest fallback behavior:

```text
Guest pays with Stripe
→ webhook creates concierge_orders row with traveler_email
→ if email matches existing user, attach user_id
→ if no user exists, send magic-link invite to create account
→ once user signs in, attach order to user account
```

Guest checkout should be treated as a recovery path, not the primary long-term product flow.

## Stripe Checkout Implications

The account-based checkout route should pass user context into Stripe metadata.

Recommended metadata:

```text
metadata.product = concierge_trip_plan
metadata.offer_id = quick_review | concierge_trip_plan | full_planning_support
metadata.source = concierge_page | home | chat | trip_detail | dashboard
metadata.user_id = authenticated Supabase user id
metadata.order_id = concierge_orders id, if created before checkout
```

This makes webhook reconciliation easier and allows the admin portal to connect payments to users immediately.

## Webhook Implications

The Stripe webhook should:

1. Verify the Stripe signature.
2. Confirm `metadata.product = concierge_trip_plan`.
3. Read `metadata.user_id` and/or `metadata.order_id`.
4. Update the existing order if `order_id` exists.
5. Otherwise create a new `concierge_orders` row.
6. Set `payment_status = paid` and `status = paid`.
7. Store Stripe session and payment intent IDs.

## Admin Portal Implications

The admin portal should support:

- Viewing paid Concierge orders.
- Filtering by user, offer type, status, and payment status.
- Linking orders to user accounts.
- Linking orders to trips or itineraries.
- Creating proposed itineraries.
- Publishing itineraries to the customer dashboard.
- Tracking fulfillment status.
- Reconciling Stripe payments.

## Recommended Implementation Phases

### Phase 1 — Current State

Immediate Stripe Checkout is live from the public Concierge page.

```text
/concierge-trip-plan → Stripe Checkout → /concierge-trip-plan/success
```

### Phase 2 — Account-Gated Checkout

Add an account-gated checkout route.

```text
/concierge-trip-plan/checkout?offer=concierge_trip_plan
```

If the user is not signed in, redirect to login/signup with return URL.

### Phase 3 — Pre-Create Concierge Order

Before Stripe Checkout, create a `concierge_orders` record with:

```text
user_id
offer_type
price_usd
status = checkout_started
payment_status = unpaid
source
```

Then pass `order_id` and `user_id` into Stripe metadata.

### Phase 4 — Webhook Updates Order

Webhook updates the pre-created order after successful payment.

```text
payment_status = paid
status = paid
stripe_checkout_session_id = cs_...
stripe_payment_intent_id = pi_...
```

### Phase 5 — Dashboard Order Page

Add a customer-facing Concierge order detail page.

```text
/dashboard/concierge/[orderId]
```

This page shows order status, trip detail collection, proposed itinerary, and final delivered itinerary.

### Phase 6 — Admin Itinerary Delivery

Admin creates or attaches an itinerary to the order and publishes it to the customer dashboard.

## Recommended Final Flow

```text
Concierge page
→ Select offer
→ Sign in / create account
→ Create concierge_orders draft
→ Stripe Checkout
→ Webhook marks order paid
→ Customer lands in dashboard order page
→ Customer submits/edits trip details
→ Admin prepares itinerary
→ Admin publishes proposed itinerary
→ Customer reviews in dashboard
→ Admin marks delivered
```

## Decision Summary

Baha Buddy should use account-based Concierge checkout as the primary flow.

Guest checkout can remain as an optional fallback, but the long-term product should link every paid Concierge order to a customer account and deliver itineraries inside the Baha Buddy dashboard.
