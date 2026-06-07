# Baha Buddy Web Revenue Build Log

## Date

2026-06-07

## Objective

Implement and document the first set of web-facing revenue features based on `docs/PRODUCT_REVENUE_BLUEPRINT.md`.

The admin portal is being developed separately. This build focuses on the public web app features that create traveler demand, partner interest, and future data handoff points for admin operations.

## Summary of Work Completed

### 1. Reusable Concierge Revenue CTA Component

**File added:**

```text
src/components/revenue/ConciergeRevenueBand.tsx
```

**Purpose:**

A reusable web CTA section that promotes the Concierge Trip Plan as the first monetizable offer.

**Where it can be used:**

- Home page
- Explore page
- Island guide pages
- Saved trip page
- Dashboard
- Chat result page
- Deal detail pages

**Current CTA paths:**

- `/concierge-trip-plan`
- `/dashboard/chat`

**Future improvement:**

Add source tracking query parameters when reusing this component in different placements.

Example:

```tsx
<Link href="/concierge-trip-plan?source=home">
  View Concierge Trip Plan
</Link>
```

---

### 2. Home Page Revenue CTA Placement

**File updated:**

```text
src/app/page.tsx
```

**Change made:**

Added `ConciergeRevenueBand` between `AppFeaturesSection` and `DealsSection`.

**Reason:**

The home page already includes trip inspiration, Explore content, app positioning, and deals. The Concierge CTA now bridges user interest into the first paid offer before users continue into deals.

**Current order:**

```tsx
<HeroSection />
<DestinationShowcase />
<ExploreSection />
<AppFeaturesSection />
<ConciergeRevenueBand />
<DealsSection />
<Footer />
<ChatWidget />
```

---

### 3. Concierge Trip Plan Landing Page

**File added:**

```text
src/app/concierge-trip-plan/page.tsx
```

**Purpose:**

A traveler-facing landing page for the first monetizable offer.

**Sections included:**

1. Hero section
2. Pricing cards
3. How it works
4. What is included
5. Baha Visa / travel-document cross-sell
6. Footer
7. Chat widget

**Pricing included:**

| Offer | Price |
|---|---:|
| Quick Review | $49 |
| Concierge Trip Plan | $149 |
| Full Planning Support | $299 |

**Current conversion method:**

- `/dashboard/chat?intent=concierge`
- `mailto:hello@bahabuddy.com`
- `mailto:hello@bahavisa.com`

**Reason for temporary mailto usage:**

Stripe checkout and Supabase order creation should be connected after the order schema and admin queue are confirmed.

**Future implementation requirement:**

Replace mailto CTAs with:

1. Auth-aware checkout flow
2. Stripe Checkout session
3. `concierge_orders` record
4. Confirmation page
5. Admin order queue
6. Dashboard order status

---

### 4. Partner Recruitment Landing Page

**File added:**

```text
src/app/partners/page.tsx
```

**Purpose:**

A public partner-facing landing page to recruit hotels, tour operators, restaurants, transportation providers, local guides, and tourism stakeholders.

**Sections included:**

1. Partner ecosystem hero
2. Early partner benefits
3. Partner categories
4. Early partner tiers
5. Minimum partner intake data
6. Footer

**Partner tiers included:**

| Tier | Price |
|---|---:|
| Free Listing | $0 |
| Verified Partner | $49-$99/month |
| Featured Partner | $199-$499/month |
| Premium / Strategic | Custom |

**Current conversion method:**

- `mailto:partners@bahabuddy.com`

**Reason for temporary mailto usage:**

The blueprint recommends avoiding a full self-service partner portal at this stage. Manual intake is appropriate until partner demand and paid placement interest are validated.

**Future implementation requirement:**

Replace mailto with:

1. Partner application form
2. `partner_applications` table
3. Admin partner application queue
4. Partner approval workflow
5. Partner profile creation
6. Lead/click tracking

---

### 5. Footer Revenue Navigation

**File updated:**

```text
src/components/Footer.tsx
```

**Changes made:**

Added footer links for:

- `/concierge-trip-plan` under `Plan your trip`
- `/partners` under `Company`

**Reason:**

Both new revenue pages need persistent discovery from the global footer.

---

### 6. Revenue Roadmap Documentation

**File added:**

```text
docs/WEB_REVENUE_FEATURES_ROADMAP.md
```

**Purpose:**

Developer and product roadmap for the web-side revenue features.

**Includes:**

- Strategic direction
- Concierge Trip Plan scope
- CTA placement plan
- Partner recruitment plan
- Baha Visa cross-sell plan
- Proposed Supabase data models
- Analytics events
- Web/admin handoff
- 30-day sprint scope
- What not to build yet

---

## Files Changed

```text
src/components/revenue/ConciergeRevenueBand.tsx
src/app/page.tsx
src/app/concierge-trip-plan/page.tsx
src/app/partners/page.tsx
src/components/Footer.tsx
docs/WEB_REVENUE_FEATURES_ROADMAP.md
docs/WEB_REVENUE_BUILD_LOG.md
```

## Recommended Immediate Follow-Up

### Technical

1. Run local build and lint:

```bash
npm install
npm run lint
npm run build
```

2. Confirm the new routes render:

```text
/concierge-trip-plan
/partners
```

3. Confirm Tailwind classes are included by the existing content paths.

4. Confirm mailto addresses are correct:

```text
hello@bahabuddy.com
partners@bahabuddy.com
hello@bahavisa.com
```

### Product

1. Confirm official launch price for Concierge Trip Plan.
2. Confirm whether Quick Review and Full Planning Support should launch immediately or remain secondary.
3. Confirm fulfillment owner for concierge requests.
4. Confirm whether Baha Visa leads should go to Baha Visa email, CRM, or admin queue.
5. Confirm first 10-20 founding partner targets.

### Admin Portal Dependency

The admin portal should eventually support:

- Concierge order queue
- Partner application queue
- Travel-document lead queue
- Partner record approval
- Revenue reporting
- CTA source attribution

## Known Limitations

- Stripe checkout is not yet connected.
- Supabase tables are proposed but not yet migrated.
- Partner application is not yet a real form.
- Concierge order fulfillment is not yet connected to the user dashboard.
- Analytics events are documented but not yet implemented.
- Build/lint could not be executed in this environment because the repository was modified through the GitHub connector rather than a local working tree with installed dependencies.

## Implementation Principle

Keep the first web revenue sprint manual-first.

The goal is not to overbuild a marketplace. The goal is to validate whether travelers will pay for concierge planning and whether partners will pay or commit for visibility, leads, campaigns, and future booking opportunities.
