# DEPRECATED — DO NOT USE

These schema definitions (`buddyPick`, `travelTip`, `discoverArticle`) were
the web app's placeholder Sanity schemas from the C.7 phase, when no
real Studio existed yet. They were never published to a live Sanity
project.

Session 13 (May 2026): the canonical Sanity Studio now lives at
`/Baha Buddy/studio/` with project ID `593u37vh` and richer document
types (`article`, `tip`, `deal`, `destination`, `experience`,
`siteSettings`). The web app queries the Studio's types directly via
the GROQ queries in `../queries.ts`.

This folder is kept temporarily as a reference for the schema-rewrite
work but **should not be imported from anywhere**. Delete it once the
git history is sufficient to recover them.

To author new schemas, edit files in `/Baha Buddy/studio/schemas/` and
restart the Studio (`cd studio && npm run dev`).
