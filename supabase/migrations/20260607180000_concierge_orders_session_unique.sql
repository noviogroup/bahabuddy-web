-- Ensure concierge webhook upserts are idempotent per Stripe Checkout Session.
create unique index if not exists concierge_orders_stripe_checkout_session_id_uidx
  on public.concierge_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists concierge_orders_stripe_payment_intent_id_idx
  on public.concierge_orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
