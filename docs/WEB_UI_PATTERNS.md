# Baha Buddy Web UI Patterns

## Purpose

This document defines the reusable UI/UX patterns for the Baha Buddy web experience. It keeps the public site, revenue pages, partner pages, and future dashboard-facing conversion components visually consistent.

## Design Principles

1. **Travel-first, not SaaS-first**
   - Use strong destination photography, island language, and trip-planning context.
   - Avoid generic software copy where travel-specific language is clearer.

2. **AI plus local trust**
   - Position Buddy as the planning engine and the Baha Buddy team as the local review layer.
   - Use trust signals such as “Built in The Bahamas,” “Local concierge review,” and “Visa/document support.”

3. **Conversion without pressure**
   - Every major page should lead users toward one of four actions:
     - Plan with Buddy
     - Pay for Concierge Trip Plan
     - Submit partner application
     - Request travel-document support

4. **Manual operations can sit behind polished UX**
   - Early fulfillment may be manual, but the user-facing experience should feel intentional, paid, and trustworthy.

---

## 1. Hero Pattern

### Purpose

Create emotional travel intent and route visitors into planning, booking/search, or concierge conversion.

### Required Elements

- Full-width destination visual or gradient
- Small credibility badge
- Large emotional headline
- Short planning-focused subcopy
- Primary CTA or search module
- Secondary concierge CTA where relevant
- Trust support immediately below hero where possible

### Current Example

`src/components/HeroSection.tsx`

### Recommended CTAs

- Primary: `Plan with Buddy`
- Secondary: `Pay for Concierge Trip Plan`
- Utility: `Stays`, `Flights`, `Things to Do`

---

## 2. Trust Band Pattern

### Purpose

Quickly communicate why users should trust Baha Buddy.

### Current Example

`src/components/TrustBand.tsx`

### Trust Points

- Built in The Bahamas
- AI-powered planning
- Local concierge review
- Visa/document support
- Partner-backed recommendations

### Placement

- Directly under homepage hero
- Optional on Concierge page and partner page

---

## 3. CTA Band Pattern

### Purpose

Bridge educational content into revenue conversion.

### Current Example

`src/components/revenue/ConciergeRevenueBand.tsx`

### Required Elements

- Short offer label
- Direct benefit headline
- 1 paragraph explanation
- Primary CTA
- Secondary CTA
- Price or proof-point card

### CTA Rules

- Use one primary conversion action.
- Keep secondary CTA less visually dominant.
- Use source tracking query params when reused across pages.

Example:

```tsx
<Link href="/concierge-trip-plan?source=explore">
  View Concierge Trip Plan
</Link>
```

---

## 4. Pricing Card Pattern

### Purpose

Let travelers immediately select and pay for a concierge service.

### Current Example

`src/app/concierge-trip-plan/page.tsx`

### Required Elements

- Offer name
- Price
- Short description
- Feature list
- Recommended badge when applicable
- Stripe checkout button
- Trust note: `Secure checkout powered by Stripe`

### Current Offers

| Offer | Price | Offer ID |
|---|---:|---|
| Quick Review | $49 | `quick_review` |
| Concierge Trip Plan | $149 | `concierge_trip_plan` |
| Full Planning Support | $299 | `full_planning_support` |

---

## 5. Form Pattern

### Purpose

Capture details after interest, payment, or partner intent.

### Current Examples

- `src/components/revenue/PartnerApplicationForm.tsx`
- `src/components/revenue/TravelDocumentLeadForm.tsx`
- `src/app/concierge-trip-plan/success/page.tsx`

### Rules

- Keep required fields minimal.
- Explain what happens after submission.
- Use success state query params where possible.
- Use honeypot fields for public forms.
- Keep payment separate from data collection when Stripe Checkout is used.

### Success Message Pattern

Use a soft green/palm card:

```text
Request received. The Baha Buddy team can now review and follow up.
```

---

## 6. Destination Card Pattern

### Purpose

Turn destination inspiration into trip-planning action.

### Current Example

`src/components/DestinationShowcase.tsx`

### Required Elements

- Image
- Category badge
- Trust label, not fake ratings
- Island/location meta
- Short description
- Tags
- CTA: `Plan this trip →`

### Approved Trust Labels

- Buddy Pick
- Popular
- Best for Families
- Great First Trip
- Local Favorite
- Easy to Plan

---

## 7. Partner Card Pattern

### Purpose

Explain partner tiers and business value clearly.

### Current Example

`src/app/partners/page.tsx`

### Required Elements

- Tier name
- Price or custom label
- Business use case
- Feature list
- Clear apply CTA nearby

### Partner Value Points

- Visibility in Explore and island guide pages
- Recommendation eligibility inside Buddy planning flows
- Deal and featured placement opportunities
- Concierge referral opportunities for high-intent travelers
- Campaign inclusion for seasonal or island-specific promotions
- Performance reporting as partner analytics mature

---

## 8. Payment Flow Pattern

### Purpose

Allow users to pay immediately for concierge offers without a manual invoice.

### Current Example

`src/app/api/concierge-checkout/route.ts`

### Flow

```text
Concierge page pricing card → POST /api/concierge-checkout → Stripe Checkout → /concierge-trip-plan/success → paid trip details form
```

### Rules

- Prices must be server-defined, not trusted from the browser.
- Use Stripe Checkout for immediate payment.
- Collect trip details after successful payment.
- Pass Stripe session ID into the details form for reconciliation.
- Add webhook/order-table integration next.

---

## 9. Partner Page Pattern

### Purpose

Recruit early supply-side partners without overbuilding a self-service portal.

### Required Sections

1. Founding Partner hero
2. Why join early
3. What partners get
4. Placement examples
5. Partner categories
6. Partner tiers
7. Application form

---

## 10. Page Hierarchy Standard

Recommended page structure:

```text
Hero
Trust / proof
Primary conversion section
Educational support section
Secondary conversion section
Footer
```

For the homepage:

```text
Hero
Trust band
Destinations
Explore by vibe
App features
Concierge CTA
Deals
Footer
```

For the Concierge page:

```text
Hero
Pricing / immediate checkout
How it works
What is included
Why local review matters
Sample itinerary preview
Travel-document cross-sell
Footer
```

For the Partner page:

```text
Hero
What partners get
Placement examples
Partner categories
Partner tiers
Application form
Footer
```
