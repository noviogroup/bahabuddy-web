# Tour cover handoff

## Data ownership

The twelve destination cover illustrations belong to Airtable **Guided Tour
Itineraries**. Their exact attachment identities are recorded in
`scripts/data/tour-cover-attachments.json`. Match these records using
`self_tours.airtable_id`; never infer a match from an island name or title.

The current mobile guided-day module and web Nassau itinerary pages read
`published_cruise_itineraries` / `cruise_itinerary_detail`, backed by
`cruise_itineraries`. Those are different itineraries and have no Airtable identity
column. Importing the twelve covers into `self_tours` does **not** populate that
catalogue. Editorially match/approve artwork for those plans before setting their
`hero_image_url`; do not automatically copy the Nassau cover to every cruise plan.

The homepage uses the Nassau illustration as destination artwork, with a visible
AI illustration label, and links to the existing published catalogue. It does not
claim the picture depicts an itinerary's actual stops.

## Run the image-only import

From a trusted server environment with the existing dependencies installed:

```sh
node scripts/sync-tour-covers.mjs --help
# Supply AIRTABLE_API_KEY (or AIRTABLE_TOKEN) and SUPABASE_SERVICE_ROLE_KEY
# through your secret manager. Never use NEXT_PUBLIC variables for either key.
node scripts/sync-tour-covers.mjs
# After reviewing the dry-run record list:
node scripts/sync-tour-covers.mjs --apply
```

The command is pinned to the Baha Buddy project and the twelve verified
attachments. It reads fresh attachment download URLs, checks PNG identity and
size, and stores the originals in the existing public `island-images` bucket
under `tour-covers/<airtable-record>/<sha256>/<filename>`. Airtable attachment
download URLs expire and must not become the saved display URLs.

It verifies public image bytes before changing only `self_tours.cover_image_url`.
It does not create tours, change publication, overwrite another cover, modify
bucket permissions, or write credentials to logs. Storage metadata records the AI
illustration provenance; filenames preserve `-ai-illustration.png` for display
labelling. The web `TourCover` component recognises that convention.

An interrupted run can leave uploaded objects or some completed cover updates.
Rerunning is safe: content-addressed uploads are verified, matching completed URLs
are skipped, and competing cover changes stop the operation. Do not delete an
object while a tour still references it. Roll back a cover field only after
confirming that its current value is the one set by this command.

After applying, query all twelve records again and open representative public
image URLs. Confirm publication flags have not changed and verify illustrations
are labelled in every consuming client before release. The legacy mobile
`self_tours` surface does not yet have the new web illustration badge.

## Publication reconciliation

At the September 22 audit the twelve Airtable records were Drafted while their
existing `self_tours` counterparts were `is_active=true`. The deployed
`airtable-sync` function did not read Guided Tour Itineraries or its image field.
Review this discrepancy as a separate content/publication decision; this import
intentionally never interprets an attachment as approval to publish a tour.

Do not deploy the website branch or import images as evidence that the catalogue
is market-ready. The published Nassau catalogue also contains a test itinerary;
its visibility and the production tour content require an editorial release
review.

## References

- [Airtable attachment URL behavior](https://support.airtable.com/articles/9671148410-airtable-attachment-url-behavior)
- [Supabase upload](https://supabase.com/docs/reference/javascript/file-buckets-upload)
- [Supabase public URLs](https://supabase.com/docs/reference/javascript/file-buckets-getpublicurl)
