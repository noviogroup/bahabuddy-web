import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanWithBuddyCTA } from "@/components/detail/PlanWithBuddyCTA";
import CompactPageHeader from "@/components/marketplace/CompactPageHeader";
import ImageWithSourcePolicy from "@/components/marketplace/ImageWithSourcePolicy";
import DirectTripItemActions from "@/components/trip/DirectTripItemActions";
import { CACHED_PLACE_SOURCE_TABLE } from "@/lib/place-inventory";

/**
 * /activities/[id] — Activity / experience detail page.
 *
 * The "Read more" destination from ActivityCard. Server-rendered from
 * Supabase cached/source place rows filtered to attraction-style types until
 * this route moves fully to canonical `places` records.
 * When the Viator Merchant API is wired into a web-side activities-proxy,
 * this page should be extended to fetch live availability, tour times, and a
 * deeper product description.
 *
 * URL param: `id` is the cached source place id.
 *
 * Auth: handled by the (dashboard) route group layout.
 */

const ISLAND_DISPLAY: Record<string, string> = {
  nassau: "Nassau",
  "paradise-island": "Paradise Island",
  exuma: "Exuma",
  eleuthera: "Eleuthera",
  "harbour-island": "Harbour Island",
  andros: "Andros",
  "grand-bahama": "Grand Bahama",
  bimini: "Bimini",
  "long-island": "Long Island",
  abacos: "The Abacos",
};

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  attraction: "Attraction",
  tourist_attraction: "Attraction",
  amusement_park: "Park",
  aquarium: "Aquarium",
  museum: "Museum",
  park: "Park",
  natural_feature: "Natural site",
  spa: "Spa",
};

export const dynamic = "force-dynamic";

function buildActivityBrowseHref(island?: string | null): string {
  const params = new URLSearchParams();
  params.set("category", "Activity");
  if (island) params.set("island", island);
  return `/explore/places?${params.toString()}`;
}

interface ActivityRow {
  place_id: string;
  name: string | null;
  type: string | null;
  island_id: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  address: string | null;
  photo_url: string | null;
  description: string | null;
  vibe_tags: string[] | null;
  kid_friendly: boolean | null;
}

export default async function ActivityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  // Activities still read cached/source place inventory until this page moves
  // fully to canonical `places` records.
  const { data } = await supabase
    .from(CACHED_PLACE_SOURCE_TABLE)
    .select(
      "place_id:id, name, type, island_id, rating, user_ratings_total, address, photo_url:image_url, description, vibe_tags, kid_friendly",
    )
    .eq("id", params.id)
    .eq("is_active", true)
    .eq("type", "attraction")
    .maybeSingle();

  const activity = data as ActivityRow | null;
  if (!activity) notFound();

  const name = activity.name ?? "Activity";
  const island = activity.island_id
    ? (ISLAND_DISPLAY[activity.island_id] ?? activity.island_id)
    : "";
  const rating = activity.rating ?? 0;
  const reviews = activity.user_ratings_total ?? 0;
  const vibeTags = activity.vibe_tags ?? [];
  const typeLabel = activity.type
    ? (ACTIVITY_TYPE_LABEL[activity.type] ?? null)
    : null;

  const planPrompt = `I'm looking at "${name}"${island ? ` on ${island}` : ""}. Tell me more — what to expect, how long it takes, what to bring, and whether it fits my trip.`;
  const addPrompt = `Help me plan around "${name}"${island ? ` on ${island}` : ""}.`;
  const browseHref = buildActivityBrowseHref(island);
  const returnPath = `/activities/${encodeURIComponent(activity.place_id)}#trip-actions`;
  const subtitle = activity.description
    ? activity.description
    : `Review this ${typeLabel?.toLowerCase() ?? "experience"}${island ? ` in ${island}` : ""}, save it directly to a trip, or ask Buddy for context.`;

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Experience detail"
        title={name}
        subtitle={subtitle}
        crumbs={[
          { href: "/explore", label: "Explore" },
          { href: browseHref, label: "Activities" },
          { label: name },
        ]}
        actions={
          <Link
            href={browseHref}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gray-50"
          >
            Browse more activities
          </Link>
        }
      >
        <div className="flex flex-wrap gap-2">
          {typeLabel && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-semibold">
              {typeLabel}
            </span>
          )}
          {activity.kid_friendly && (
            <span className="inline-flex items-center gap-1.5 bg-palm-50 text-palm-700 rounded-full px-3 py-1 text-xs font-semibold">
              Kid-friendly
            </span>
          )}
          {activity.address && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs">
              {activity.address}
            </span>
          )}
          {rating > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-night ring-1 ring-gray-200">
              Rating {rating.toFixed(1)}/5
              {reviews > 0 ? ` from ${reviews.toLocaleString()} reviews` : ""}
            </span>
          )}
        </div>
      </CompactPageHeader>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-start">
          <ImageWithSourcePolicy
            src={activity.photo_url}
            alt={name}
            title={name}
            eyebrow="Experience photo"
            className="aspect-[4/3] rounded-baha-lg border border-gray-200 bg-white shadow-sm sm:aspect-[16/10] lg:aspect-[4/3]"
            imageClassName="object-cover transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
            tone="activity"
          >
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-night shadow-sm">
              {island || "Bahamas"}
            </div>
          </ImageWithSourcePolicy>

          <div id="trip-actions">
            <DirectTripItemActions
              itemType="activity"
              sourceId={activity.place_id}
              sourceType="web_activity_detail"
              name={name}
              island={island || null}
              imageUrl={activity.photo_url}
              returnPath={returnPath}
              heading="Save this experience"
              description="Add this activity directly to a trip. Buddy remains secondary for questions and planning."
              primaryLabel="Add experience to trip"
              createTripLabel="Create trip for this experience"
              savedLabel="Saved experience to trip"
              timeSlot="afternoon"
              notes={activity.description?.slice(0, 180) ?? null}
              metadata={{
                category: activity.type,
                vibeTags,
                rating: activity.rating,
                reviewCount: activity.user_ratings_total,
                address: activity.address,
                kidFriendly: activity.kid_friendly,
              }}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {activity.description && (
              <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-night">
                  About this experience
                </h2>
                <p className="mt-3 text-gray-700 leading-relaxed">
                  {activity.description}
                </p>
              </section>
            )}

            {vibeTags.length > 0 && (
              <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-night">Vibe</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {vibeTags.map((t) => (
                    <span
                      key={t}
                      className="bg-gray-100 text-charcoal rounded-full px-3 py-1.5 text-sm font-medium capitalize"
                    >
                      {t.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">
              Trip fit
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-bold text-night">Location</dt>
                <dd className="mt-1 text-charcoal">{island || "Bahamas"}</dd>
              </div>
              {typeLabel && (
                <div>
                  <dt className="font-bold text-night">Type</dt>
                  <dd className="mt-1 text-charcoal">{typeLabel}</dd>
                </div>
              )}
              {rating > 0 && (
                <div>
                  <dt className="font-bold text-night">Rating</dt>
                  <dd className="mt-1 text-charcoal">
                    {rating.toFixed(1)}/5
                    {reviews > 0
                      ? ` from ${reviews.toLocaleString()} reviews`
                      : ""}
                  </dd>
                </div>
              )}
              {activity.kid_friendly && (
                <div>
                  <dt className="font-bold text-night">Family fit</dt>
                  <dd className="mt-1 text-charcoal">
                    Marked kid-friendly in place data.
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </section>

        <div className="mt-8">
          <PlanWithBuddyCTA
            planPrompt={planPrompt}
            addPrompt={addPrompt}
            kind="experience"
          />
        </div>
      </main>
    </div>
  );
}
