# Baha Buddy Web Revenue Features Roadmap

## Purpose

This document turns `docs/PRODUCT_REVENUE_BLUEPRINT.md` into a practical implementation roadmap for the public Baha Buddy web experience.

The admin portal is being handled separately. This document focuses on the traveler-facing and partner-facing web features that create revenue opportunities and feed clean operational data into the admin portal.

## Strategic Direction

The web app should not only market Baha Buddy as an AI chatbot. It should move users through this revenue path:

```text
Discover The Bahamas → Plan with Buddy → Save trip → Upgrade to Concierge → Cross-sell booking / visa / partner services
```

The first monetizable web offer is the **Concierge Trip Plan**, with a recommended launch price of **$149**.

## Revenue Feature Priorities

### Priority 1: Concierge Trip Plan

**Route:** `/concierge-trip-plan`

**Goal:** Convert high-intent trip planning users into paid concierge orders before full hotel, flight, activity, and partner booking inventory is complete.

**Launch offers:**

| Offer | Price | Use Case |
|---|---:|---|
| Quick Review | $49 | Review and improve an AI-generated itinerary |
| Concierge Trip Plan | $149 | Main launch offer for a 3-5 day Bahamas itinerary |
| Full Planning Support | $299 | Itinerary plus booking assistance handoff |
| Group / Corporate Plan | Custom | Larger or more complex trips |

**What the $149 plan includes:**

- 3-5 day itinerary structure
- Island selection recommendations
- Hotel and stay suggestions
- Activity and tour suggestions
- Dining suggestions
- Estimated budget range
- Weather and seasonal planning notes
- Airport arrival and transfer guidance
- Visa/travel-document checklist where relevant
- Optional booking assistance handoff

**Current implementation:**

- Added public page at `src/app/concierge-trip-plan/page.tsx`
- Added reusable CTA band at `src/components/revenue/ConciergeRevenueBand.tsx`
- Inserted CTA band into `src/app/page.tsx`
- Added footer link to Concierge Trip Plan
- Added `ConciergeInterestForm` for immediate request capture
- Added `TravelDocumentLeadForm` for Baha Visa cross-sell capture

**Current conversion method:**

- `/dashboard/chat?intent=concierge`
- `baha-buddy-concierge-interest` Netlify form
- `baha-buddy-travel-document-lead` Netlify form

**Next implementation steps:**

1. Confirm Netlify form submissions are being detected in production.
2. Apply the Supabase migration in `supabase/migrations/202606070001_web_revenue_capture.sql`.
3. Add Stripe Checkout integration for the three fixed-price offers.
4. Create a server route or action that creates orders after checkout.
5. Connect order creation to admin portal queue.
6. Add dashboard delivery state for completed concierge plans.

---

### Priority 2: Revenue CTAs Across Existing Web App

**Goal:** Place monetization CTAs where user intent is strongest.

**Current implementation:**

- Home page now includes a Concierge Trip Plan CTA band after app features and before deals.

**Recommended placements:**

| Area | CTA |
|---|---|
| Home page | View Concierge Trip Plan |
| Chat results | Have our local team refine this trip |
| Saved trip page | Upgrade to Concierge Trip Plan |
| Dashboard | Get a polished Bahamas itinerary |
| Explore pages | Plan this with Buddy |
| Island guide pages | Build a trip around this island |
| Deals pages | Add this deal to my trip |
| Travel document modules | Need visa or document help? |

**Next implementation steps:**

1. Add reusable `ConciergeRevenueBand` to trip dashboard and Explore pages.
2. Create a smaller `ConciergeUpgradeCard` for saved trip pages.
3. Track CTA source using query params, for example:
   - `/concierge-trip-plan?source=home`
   - `/concierge-trip-plan?source=chat`
   - `/concierge-trip-plan?source=trip_detail`
4. Send source values into analytics and order records.

---

### Priority 3: Partner Recruitment Page

**Route:** `/partners`

**Goal:** Recruit hotels, tours, restaurants, transport providers, and destination stakeholders without building a full partner portal too early.

**Current implementation:**

- Added public partner landing page at `src/app/partners/page.tsx`
- Added footer link under Company: `Partner with us`
- Page explains early partner categories, tiers, benefits, and minimum intake fields
- Added `PartnerApplicationForm` for immediate Netlify form capture

**Partner categories:**

- Hotels and resorts
- Boutique stays and villas
- Tour operators
- Restaurants and bars
- Transportation providers
- Boat charters
- Airport transfers
- Airlines and island connections
- Local guides and experience hosts
- Event organizers
- Visa and travel-document services
- Destination and island stakeholders

**Partner tiers:**

| Tier | Price | Purpose |
|---|---:|---|
| Free Listing | $0 | Ecosystem coverage |
| Verified Partner | $49-$99/month | Trust and enhanced discoverability |
| Featured Partner | $199-$499/month | Explore and deal placement |
| Premium / Strategic | Custom | Hotels, airlines, tourism bodies, major operators |

**Current conversion method:**

- `baha-buddy-partner-application` Netlify form

**Next implementation steps:**

1. Confirm Netlify form submissions are detected after deploy.
2. Apply the Supabase migration.
3. Add API-based Supabase capture when ready.
4. Feed applications into the admin portal partner queue.
5. Allow admin to approve application into a `partners` record.
6. Add partner source tracking for Explore clicks and concierge referrals.

---

### Priority 4: Baha Visa / Travel Document Cross-Sell

**Goal:** Connect Baha Buddy travel planning to Baha Visa and Baha Global Group services.

**Current implementation:**

- Added travel-document cross-sell section to `/concierge-trip-plan`
- Added `TravelDocumentLeadForm` to capture document support requests

**Recommended web placements:**

| Area | Cross-sell |
|---|---|
| Concierge page | Need visa or travel-document help? |
| Trip planning intake | Do you need help with travel documents? |
| Dashboard | Travel document checklist |
| Confirmation page | Add visa/document support |
| Group/corporate trip page | Group travel document support |

**Next implementation steps:**

1. Confirm Netlify form notification routing.
2. Apply `travel_document_leads` migration.
3. Pass leads to Baha Visa CRM/workflow.
4. Add source attribution: `baha_buddy_concierge`, `trip_dashboard`, `chat`, `group_travel`, etc.

---

## Recommended Supabase Data Models

These are prepared in:

```text
supabase/migrations/202606070001_web_revenue_capture.sql
```

The admin portal can expand these models as fulfillment workflows mature.

### concierge_orders

Prepared for:

- Concierge requests
- Stripe payment status
- Trip linkage
- Fulfillment status
- Delivered plan URL
- Admin queue sorting

Recommended statuses:

- `pending`
- `paid`
- `in_review`
- `needs_info`
- `delivered`
- `cancelled`
- `refunded`

### partner_applications

Prepared for:

- Partner intake
- Tier interest
- Island/service area
- Manual qualification
- Admin queue conversion to partner records

Recommended statuses:

- `new`
- `contacted`
- `qualified`
- `approved`
- `rejected`
- `converted_to_partner`

### travel_document_leads

Prepared for:

- Baha Visa cross-sell
- Nationality and lead type context
- Concierge order linkage
- Admin or CRM handoff

Recommended statuses:

- `new`
- `contacted`
- `in_progress`
- `converted`
- `closed`

---

## Analytics Events

Track these events in Mixpanel or the selected analytics layer.

### Concierge events

```text
concierge_page_viewed
concierge_cta_clicked
concierge_offer_selected
concierge_request_submitted
concierge_checkout_started
concierge_checkout_completed
concierge_order_created
concierge_order_delivered
```

Recommended properties:

- `source`
- `offer_type`
- `price_usd`
- `trip_id`
- `user_id`
- `island_interest`
- `party_size`
- `budget_range`

### Partner events

```text
partner_page_viewed
partner_apply_clicked
partner_application_submitted
partner_tier_interest_selected
```

Recommended properties:

- `category`
- `island_service_area`
- `interested_tier`
- `source`

### Baha Visa cross-sell events

```text
travel_document_cta_viewed
travel_document_cta_clicked
travel_document_lead_submitted
```

Recommended properties:

- `source`
- `trip_id`
- `concierge_order_id`
- `lead_type`

---

## Web / Admin Portal Handoff

The web app should capture demand. The admin portal should manage operations.

### Web responsibilities

- Show offer pages
- Capture user interest
- Start checkout
- Create orders/leads/applications
- Show user-facing confirmation
- Display delivery state in the user dashboard

### Admin portal responsibilities

- View concierge order queue
- Assign orders to team members
- Update status
- Upload or paste final itinerary
- Track revenue and fulfillment performance
- Manage partner application pipeline
- Approve partners into the live ecosystem
- Track partner leads, clicks, and revenue

---

## 30-Day Sprint Scope

### Week 1: Completed

- Concierge Trip Plan page
- Home page CTA band
- Footer navigation links
- Web revenue documentation

### Week 2: In progress / partially completed

- Concierge request form
- Partner application form
- Travel-document lead form
- Supabase revenue capture migration
- Netlify form submission capture

### Week 3

- Stripe checkout for fixed-price concierge offers
- Order confirmation page
- Admin order handoff requirements
- API-based Supabase capture if connector/environment allows

### Week 4

- Saved trip upgrade card
- Dashboard delivery status
- Analytics events and source attribution
- Admin portal queue alignment

---

## What Not To Build Yet

Do not prioritize these until revenue validation is stronger:

- Full self-service partner portal
- Complex loyalty points
- Premium traveler membership
- Dynamic flight/hotel/activity package builder
- Tourism intelligence sales dashboard
- Fully automated concierge fulfillment

The early product should stay manual-first, transparent, and revenue-focused.
