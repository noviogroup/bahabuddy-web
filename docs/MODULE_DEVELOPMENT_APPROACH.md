# Baha Buddy Module Development Approach

## Purpose

This document defines how Baha Buddy should begin developing its next product layer around three key modules, with dedicated support for cruise travelers and self-guided tours.

The goal is to avoid random feature-building and instead develop in a way that supports product clarity, revenue, partner onboarding, and traveler adoption.

---

## Product Architecture Principle

Baha Buddy should not become separate products for each traveler type. Instead, it should operate as one ecosystem with modular traveler experiences.

Core product structure:

1. Traveler Experience
2. Partner / Inventory System
3. Admin + Revenue Operations

Cruise travelers and self-guided tours should be treated as high-value use cases inside the Traveler Experience module, powered by the same partner, content, booking, and admin systems.

---

## The Three Core Modules

## Module 1: Traveler Experience

This is the user-facing layer across web and mobile.

Primary users:

- Stayover visitors
- Cruise passengers
- Day visitors
- Families
- Couples / honeymooners
- Groups
- Business travelers
- Returning visitors

Core features:

- AI trip planning chat
- Saved trips
- Itinerary builder
- Explore content
- Island guides
- Hotel, activity, restaurant, and destination detail pages
- Booking prompts
- Concierge trip plan checkout
- Cruise day planner
- Self-guided tours
- In-country assistance
- Voice assistant later

Development goal:

Turn Baha Buddy into the first place a traveler goes to decide what to do, where to go, and what to book in The Bahamas.

## Module 2: Partner + Inventory System

This is the supply-side layer.

Primary users:

- Hotels
- Tour operators
- Restaurants
- Transportation providers
- Local guides
- Cruise-friendly vendors
- Attraction operators
- Experience creators
- Visa/travel service providers

Core features:

- Partner records
- Partner categories
- Service areas / islands
- Featured partner status
- Deal/promo records
- Commission model
- Lead tracking
- Booking/referral tracking
- Partner tier
- Admin approval flow

Development goal:

Create a controlled partner ecosystem that allows Baha Buddy to recommend, promote, track, and monetize local businesses.

## Module 3: Admin + Revenue Operations

This is the business control layer.

Primary users:

- Baha Buddy team
- Baha Global / Baha Visa team
- Operations staff
- Sales/partner managers
- Support team

Core features:

- Revenue dashboard
- AI/API cost tracking
- Booking tracking
- Concierge order queue
- High-intent traveler queue
- Partner management
- Partner lead tracking
- Cruise traveler analytics
- Self-guided tour analytics
- Content performance
- Baha Visa lead routing
- Support and fulfillment workflows

Development goal:

Give the team visibility into how the product is performing, where revenue is coming from, and which travelers or partners need action.

---

## Cruise Traveler Use Case

Cruise travelers should be treated as a major product segment because they have clear constraints and high purchase intent.

### Why cruise travelers matter

Cruise passengers usually have:

- Limited time on island
- Clear arrival/departure windows
- Strong demand for excursions
- Need for trusted local recommendations
- Fear of missing the ship
- Interest in quick food, culture, shopping, beach, and photo experiences
- High potential for self-guided tours and transportation upsells

### Product experience

Create a dedicated Cruise Day Planner experience.

Example entry points:

- "I am coming by cruise"
- "Plan my Nassau cruise day"
- "I have 6 hours in port"
- "What can I do near the cruise port?"
- "Give me a self-guided walking tour"

### Required data fields

For cruise planning, collect:

- Cruise line
- Ship name, optional
- Port: Nassau, Freeport, Bimini, etc.
- Arrival time
- All-aboard time
- Number of travelers
- Children / seniors / mobility needs
- Interests
- Budget
- Preferred pace
- Transportation preference

### Cruise trip object

Add or support trip type:

- `stayover`
- `cruise_day`
- `self_guided_tour`
- `concierge_plan`

Cruise-specific fields:

- `port_name`
- `arrival_time`
- `all_aboard_time`
- `ship_name`
- `cruise_line`
- `buffer_minutes`
- `walking_distance_preference`

### Cruise-specific features

MVP features:

- Cruise day planner
- Time-boxed itinerary
- Port-safe recommendations
- Walking route suggestions
- Taxi/transfer recommendation
- Return-to-port buffer warning
- Self-guided tour option
- Bookable excursion/partner cards

Future features:

- Cruise ship schedule import
- Live port day recommendations
- Group cruise planning
- Cruise line partnership pitch
- Offline itinerary mode
- QR code tour launch from port partners

### Revenue paths

Cruise traveler revenue can come from:

- Self-guided tour purchases
- Excursion commissions
- Transportation bookings
- Sponsored cruise-day placements
- Restaurant deals near port
- Retail/shopping partner placements
- Concierge day plan upsell

---

## Self-Guided Tours Use Case

Self-guided tours are one of the strongest early products because they can be sold digitally, require less operational complexity, and work well for cruise passengers and stayover visitors.

### Tour types

Start with Nassau because of cruise traffic and density.

Initial tour ideas:

1. Nassau Cruise Port Walking Tour
2. Downtown Nassau History + Culture Tour
3. Queen's Staircase + Fort Fincastle Route
4. Arawak Cay Food Trail
5. Junkanoo + Culture Route
6. Photo Spots of Nassau
7. Family-Friendly Nassau Day Route
8. Shopping + Local Finds Route

Later expansion:

- Freeport cruise day route
- Bimini day route
- Harbour Island golf cart route
- Exuma highlights route
- Eleuthera scenic drive route

### Self-guided tour product structure

Each tour should include:

- Tour title
- Island/port
- Duration
- Difficulty level
- Distance
- Start point
- End point
- Stops
- Stop descriptions
- Images
- Audio narration, later
- Map coordinates
- Safety notes
- Cost estimate
- Partner offers nearby
- CTA: book transport / book experience / ask Buddy

### Tour stop data model

Each stop should include:

- Stop number
- Name
- Description
- Latitude/longitude
- Estimated time at stop
- Walking time to next stop
- Image
- Audio script, optional
- Partner association, optional
- Safety/accessibility notes

### Tour monetization

Possible pricing:

- Free basic tour
- $4.99 premium self-guided tour
- $9.99 bundle of 3 tours
- $19.99 Nassau cruise day bundle
- Sponsored free tour paid by partner
- Partner placement inside tours
- Concierge upgrade from tour

Recommended launch approach:

Launch one free tour and one paid premium tour to test demand.

---

## Development Sequence

## Phase 1: Product and Data Foundation

Goal: create the data structures that support travelers, partners, cruise use cases, and tours.

Build:

- Trip type support
- Cruise-specific trip fields
- Partner table/model
- Partner category and tier fields
- Self-guided tour table/model
- Tour stops table/model
- Concierge order model
- Lead/event tracking model

Do not start with a full partner portal. Manage partners through admin first.

## Phase 2: Cruise Day Planner MVP

Goal: launch the first high-value segmented traveler experience.

Build:

- Cruise traveler onboarding prompt
- Cruise day planner chat flow
- Time-boxed itinerary generation
- Port-safe buffer logic
- Cruise trip detail view
- Partner/excursion recommendation cards
- CTA to buy Concierge Cruise Day Plan or self-guided tour

Initial ports:

- Nassau first
- Freeport second
- Bimini third

## Phase 3: Self-Guided Tours MVP

Goal: create a sellable digital product.

Build:

- Tour catalog page
- Tour detail page
- Tour route/stop view
- Tour saved to trip
- Mobile-first stop-by-stop experience
- Basic map integration
- Stripe checkout for premium tours
- Admin fields for tour performance

Initial product:

- Free Nassau Port Sampler
- Paid Nassau Culture + History Route

## Phase 4: Partner + Revenue Admin

Goal: support monetization and operations.

Build:

- Partner records in admin
- Partner lead/event tracking
- Concierge order queue
- Cruise traveler analytics
- Tour analytics
- Revenue by product category
- High-intent traveler queue

## Phase 5: Expand and Automate

Goal: deepen the ecosystem after real usage data.

Build later:

- Partner portal
- Partner self-service deal submission
- Audio tours
- Offline tour mode
- Cruise schedule integrations
- Partner payout management
- Premium membership
- Dynamic package builder

---

## MVP Build Priorities

## Priority 1: Define product types

Add product concepts that allow the platform to distinguish between:

- Stayover trip
- Cruise day plan
- Self-guided tour
- Concierge plan
- Partner referral
- Booking

## Priority 2: Launch one monetizable offer

Recommended first offer:

- Baha Buddy Concierge Trip Plan: $149

Recommended cruise-specific offer:

- Cruise Day Plan: $29-$49

Recommended self-guided offer:

- Premium Nassau Self-Guided Tour: $4.99-$9.99

## Priority 3: Build cruise flow into chat

Buddy should detect cruise intent and switch into cruise mode.

Example:

User: "I am coming on Carnival for one day in Nassau."

Buddy should ask for or infer:

- Arrival time
- All-aboard time
- Group size
- Interests
- Walking/taxi preference

Then output:

- Time-boxed day plan
- Return-to-port buffer
- Suggested stops
- Bookable experiences
- Self-guided tour option

## Priority 4: Build self-guided tour structure

Start simple:

- List tours
- Tour detail
- Start tour
- Step-by-step stops
- Save to trip
- Ask Buddy about a stop

Do not overbuild audio, offline mode, or AR until demand is proven.

---

## Recommended First Build Sprint

## Sprint 1: Strategy-to-Schema Sprint

Duration: 1-2 weeks.

Deliverables:

- Final module definitions
- Database schema additions
- Admin model plan
- Cruise trip type defined
- Self-guided tour model defined
- Partner model defined
- Concierge order model defined
- Tracking events defined

Output:

- Migration plan
- Developer tickets
- Updated product docs

## Sprint 2: Cruise Day Planner MVP

Duration: 2-3 weeks.

Deliverables:

- Cruise mode in Buddy chat
- Cruise data capture
- Time-boxed itinerary output
- Return buffer warning
- Cruise trip detail display
- CTA to self-guided tour or paid cruise plan

## Sprint 3: Self-Guided Tour MVP

Duration: 2-3 weeks.

Deliverables:

- Tour catalog
- Tour detail
- Tour stops
- Mobile route experience
- Save tour to trip
- Stripe checkout for premium tour

## Sprint 4: Admin + Revenue Layer

Duration: 2-3 weeks.

Deliverables:

- Partner records
- Concierge order queue
- Tour purchase tracking
- Cruise traveler metrics
- High-intent traveler queue
- Revenue by product type

---

## What to Avoid Early

Do not build the following before validating demand:

- Full partner portal
- Dynamic packaging engine
- Loyalty points
- Full offline tours
- AR/VR tours
- Cruise schedule scraping/integration
- Complex payouts
- AI-only fulfillment for paid plans
- Too many islands at once

---

## Immediate Next Development Decision

The recommended first development decision is:

Should the next sprint begin with the data model foundation or with a prototype cruise day planner flow using existing trip/chat structures?

Recommendation:

Start with the data model foundation, but keep it lean. Then immediately build the cruise day planner MVP on top of it.

This keeps the system scalable while still moving toward a visible user-facing product quickly.
