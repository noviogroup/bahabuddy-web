# Concierge Stripe Webhook Implementation

## Purpose

The public web app now supports immediate Stripe Checkout for Concierge Trip Plan offers. The next operational step is to create a webhook that turns successful Stripe payments into `concierge_orders` records for the admin portal.

## Current Checkout Flow

```text
/concierge-trip-plan
→ POST /api/concierge-checkout
→ Stripe Checkout
→ /concierge-trip-plan/success
→ paid trip details form
```

## Current Checkout Route

```text
src/app/api/concierge-checkout/route.ts
```

The route creates Stripe Checkout Sessions using server-defined offers.

## Server-Defined Offers

| Offer | Price | Offer ID |
|---|---:|---|
| Quick Review | $49 | `quick_review` |
| Concierge Trip Plan | $149 | `concierge_trip_plan` |
| Full Planning Support | $299 | `full_planning_support` |

## Checkout Metadata

The checkout route passes this metadata into Stripe:

```text
metadata.product = concierge_trip_plan
metadata.offer_id = quick_review | concierge_trip_plan | full_planning_support
metadata.source = concierge_page or another CTA source
```

This metadata should be used by the webhook and admin portal for order classification and reporting.

## Required Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_CONCIERGE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

`SUPABASE_SERVICE_ROLE_KEY` must only be used server-side. Do not expose it to client components.

## Required Stripe Events

The webhook should listen for:

```text
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

Minimum viable implementation only needs `checkout.session.completed`.

## Webhook Endpoint Recommendation

```text
POST /api/stripe/concierge-webhook
```

## Order Creation Logic

When `checkout.session.completed` is received:

1. Verify Stripe webhook signature.
2. Read the Checkout Session object.
3. Confirm the metadata product is `concierge_trip_plan`.
4. Extract:
   - session ID
   - payment intent ID
   - customer email
   - customer name
   - amount total
   - currency
   - payment status
   - offer ID
   - CTA source
5. Upsert or insert a `concierge_orders` record.
6. Return HTTP 200 to Stripe.

## Target Table

```text
concierge_orders
```

Prepared in:

```text
supabase/migrations/202606070001_web_revenue_capture.sql
```

## Recommended Insert Payload

```json
{
  "offer_type": "concierge_trip_plan",
  "price_usd": 149,
  "status": "paid",
  "payment_status": "paid",
  "stripe_checkout_session_id": "cs_test_...",
  "stripe_payment_intent_id": "pi_...",
  "source": "concierge_page",
  "traveler_email": "customer@example.com",
  "traveler_name": "Customer Name",
  "notes": "Stripe Checkout completed for Concierge Trip Plan."
}
```

## Recommended Status Mapping

| Stripe State | concierge_orders.status | concierge_orders.payment_status |
|---|---|---|
| checkout.session.completed + paid | `paid` | `paid` |
| payment failed | `payment_failed` | `failed` |
| refunded | `refunded` | `refunded` |

## Admin Queue Dependency

Once the webhook creates rows, the admin portal should display them in the Concierge Orders queue.

The admin issue has already been created:

```text
baha-buddy-admin #1 — Build concierge order queue for paid web checkout flow
```

## Important Reconciliation Fields

Admin should use these fields for Stripe reconciliation:

```text
stripe_checkout_session_id
stripe_payment_intent_id
payment_status
offer_type
price_usd
source
created_at
```

## Post-Payment Details Form

After payment, users land on:

```text
/concierge-trip-plan/success?session_id={CHECKOUT_SESSION_ID}&offer={offer_id}
```

The success page captures trip details through:

```text
baha-buddy-paid-concierge-details
```

Those trip details should eventually be attached to the same `concierge_orders` row using:

```text
stripe_checkout_session_id
```

## Implementation Notes

The GitHub connector blocked writing the full webhook route because the implementation required direct server-side credential handling. This document provides the exact contract so the route can be added locally or through a secure developer environment.

## Local Implementation Checklist

1. Apply the Supabase migration:

```bash
supabase db push
```

2. Create the webhook route:

```text
src/app/api/stripe/concierge-webhook/route.ts
```

3. Add environment variables:

```bash
STRIPE_SECRET_KEY=...
STRIPE_CONCIERGE_WEBHOOK_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Add webhook endpoint in Stripe Dashboard:

```text
https://your-domain.com/api/stripe/concierge-webhook
```

5. Subscribe to:

```text
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

6. Test using Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/concierge-webhook
stripe trigger checkout.session.completed
```

7. Confirm a row appears in:

```text
concierge_orders
```
