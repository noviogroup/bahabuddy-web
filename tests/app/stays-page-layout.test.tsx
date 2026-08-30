import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import StaysPage from "@/app/stays/page";

const hotelMocks = vi.hoisted(() => ({
  getHotels: vi.fn(),
  getFeaturedStayHotels: vi.fn(),
  getIslandOptions: vi.fn(),
  getCityOptions: vi.fn(),
  getLiveHotelPhotoUrls: vi.fn(),
  getStayStartingRates: vi.fn(),
  getPropertyTypes: vi.fn(),
  getAmenityOptions: vi.fn(),
  FEATURED_STAY_ISLANDS: [
    { label: "Nassau", aliases: ["nassau"] },
    { label: "Exuma", aliases: ["exuma"] },
    { label: "Harbour Island", aliases: ["harbour island"] },
    { label: "Abaco", aliases: ["abaco"] },
    { label: "Bimini", aliases: ["bimini"] },
  ],
  hotelHeroPhotoUrl: vi.fn(
    (hotel: { main_photo_url?: string | null }) => hotel.main_photo_url ?? null,
  ),
  hotelPhotoUrls: vi.fn(
    (hotel: { main_photo_url?: string | null; photos?: string[] | null }) =>
      [hotel.main_photo_url, ...(hotel.photos ?? [])].filter(Boolean),
  ),
  uniqueHotelPhotoUrls: vi.fn(
    (...groups: Array<Array<string | null | undefined>>) =>
      Array.from(new Set(groups.flat().filter(Boolean))),
  ),
}));

vi.mock("@/lib/hotels", () => hotelMocks);

const dealMocks = vi.hoisted(() => ({
  getStayDeals: vi.fn(),
}));

vi.mock("@/lib/deals", () => dealMocks);

vi.mock("@/components/Footer", () => ({
  default: () => <footer>Marketplace footer</footer>,
}));

vi.mock("@/components/ChatWidget", () => ({
  default: () => null,
}));

vi.mock("@/components/TrackView", () => ({
  default: () => null,
}));

vi.mock("@/components/stays/StayCardImage", () => ({
  default: ({ alt, src }: { alt: string; src: string | null }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src ?? ""} />
  ),
}));

const sampleHotels = [
  {
    id: "lp-ocean-club",
    name: "Ocean Club Resort",
    address: null,
    city: null,
    island: "Nassau",
    country_code: "BS",
    latitude: null,
    longitude: null,
    star_rating: 5,
    review_score: 9.2,
    review_count: 312,
    description: null,
    main_photo_url: "https://images.example/ocean-club.jpg",
    photos: ["https://images.example/ocean-club-pool.jpg"],
    amenities: ["Pool", "Beachfront", "Spa"],
    property_type_id: 1,
    property_type_name: "Resort",
    is_active: true,
    last_synced_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("StaysPage marketplace layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hotelMocks.getHotels.mockResolvedValue(sampleHotels);
    hotelMocks.getFeaturedStayHotels.mockResolvedValue(sampleHotels);
    hotelMocks.getIslandOptions.mockResolvedValue(["Exuma"]);
    hotelMocks.getCityOptions.mockResolvedValue([
      "Paradise Island",
      "Cable Beach",
    ]);
    hotelMocks.getLiveHotelPhotoUrls.mockResolvedValue([
      "https://images.example/ocean-club-room.jpg",
    ]);
    hotelMocks.getStayStartingRates.mockResolvedValue(
      new Map([
        [
          "lp-ocean-club",
          {
            hotelId: "lp-ocean-club",
            currency: "USD",
            total: 1400,
            nightly: 350,
            nights: 4,
          },
        ],
      ]),
    );
    hotelMocks.getPropertyTypes.mockResolvedValue(["Hotel", "Villa", "Home"]);
    hotelMocks.getAmenityOptions.mockResolvedValue([
      "Pool",
      "Beachfront",
      "Kitchen",
    ]);
    hotelMocks.hotelHeroPhotoUrl.mockImplementation(
      (hotel: { main_photo_url?: string | null }) =>
        hotel.main_photo_url ?? null,
    );
    hotelMocks.hotelPhotoUrls.mockImplementation(
      (hotel: { main_photo_url?: string | null; photos?: string[] | null }) =>
        [hotel.main_photo_url, ...(hotel.photos ?? [])].filter(Boolean),
    );
    hotelMocks.uniqueHotelPhotoUrls.mockImplementation(
      (...groups: Array<Array<string | null | undefined>>) =>
        Array.from(new Set(groups.flat().filter(Boolean))),
    );
    dealMocks.getStayDeals.mockResolvedValue([
      {
        id: "deal-1",
        title: "Nassau resort stay offer",
        deal_type: "accommodation",
        island: "nassau",
        resort_name: "Ocean Club Resort",
        description: "A limited stay offer for a Nassau beach resort.",
        price_from_usd: 399,
        price_unit: "per_night",
        image_url: "https://images.example/deal.jpg",
        highlights: ["Beachfront", "Breakfast"],
        tags: ["Stay"],
        valid_through: null,
      },
    ]);
  });

  test("renders compact inline search with a left sidebar filter model", async () => {
    const page = await StaysPage({
      searchParams: {
        island: "Nassau",
        city: "Paradise Island",
        type: "Resort",
        traveler_type: "families",
        stars: "5",
        guest_rating: "8",
        amenities: "Pool,Beachfront",
        sort: "stars",
        checkin: "2026-08-01",
        checkout: "2026-08-05",
        adults: "2",
        children: "1",
        rooms: "2",
      },
    });
    const { container } = render(page);

    const searchForm = screen.getByRole("form", { name: "Search stays" });
    expect(
      within(searchForm).getByRole("heading", { name: "Find stays in Nassau" }),
    ).toBeInTheDocument();
    expect(
      within(searchForm).queryByText("Inline stay search"),
    ).not.toBeInTheDocument();
    expect(
      within(searchForm).queryByText("Refine Bahamas stays"),
    ).not.toBeInTheDocument();
    expect(
      within(searchForm).queryByText(
        "Browse is public. Saving, checkout, and booking require a traveler account.",
      ),
    ).not.toBeInTheDocument();
    expect(searchForm).toHaveClass("bg-night");
    expect(searchForm).not.toHaveClass("border-gray-200");
    expect(searchForm).not.toHaveClass("border-brand-100");
    expect(
      within(searchForm).getByRole("button", { name: "Search" }),
    ).toHaveClass("bg-brand-600");
    expect(screen.getByTestId("stay-primary-search-row")).toHaveClass(
      "lg:grid-cols-[minmax(16rem,1.65fr)_minmax(14rem,1.2fr)_minmax(12rem,1fr)_minmax(10rem,0.85fr)_auto]",
    );
    expect(
      screen.queryByTestId("stay-detail-search-row"),
    ).not.toBeInTheDocument();
    expect(searchForm.innerHTML).not.toContain("minmax(9rem,0.72fr)");
    expect(container.innerHTML).toMatch(/text-brand-700/);
    expect(container.innerHTML).not.toContain("h-2 w-2 rounded-full bg-gold-400");
    expect(container.innerHTML).not.toMatch(
      /border-gold|border-sand|bg-sand|ring-sand/,
    );
    expect(
      within(searchForm).getByRole("button", { name: "Choose destination" }),
    ).toHaveTextContent("Paradise Island, Nassau");
    expect(
      within(searchForm).queryByRole("button", { name: "Open Where to? menu" }),
    ).not.toBeInTheDocument();
    expect(
      within(searchForm).queryByRole("button", { name: "Open Area menu" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Stay type")).toHaveValue("Resort");
    expect(
      within(searchForm).getByRole("button", { name: "Choose stay dates" }),
    ).toHaveTextContent("Aug 1 – Aug 5");
    expect(
      within(searchForm).getByRole("button", {
        name: "Choose travelers and rooms",
      }),
    ).toHaveTextContent("2 adults, 2 rooms");
    expect(container.querySelector('input[name="island"]')).toHaveValue(
      "Nassau",
    );
    expect(container.querySelector('input[name="city"]')).toHaveValue(
      "Paradise Island",
    );
    expect(container.querySelector('input[name="checkin"]')).toHaveValue(
      "2026-08-01",
    );
    expect(container.querySelector('input[name="checkout"]')).toHaveValue(
      "2026-08-05",
    );
    expect(container.querySelector('input[name="adults"]')).toHaveValue("2");
    expect(container.querySelector('input[name="rooms"]')).toHaveValue("2");
    expect(container.querySelector('input[name="children"]')).toHaveValue("1");
    expect(container.querySelector('input[name="stars"]')).toHaveValue("5");
    expect(container.querySelector('input[name="guest_rating"]')).toHaveValue(
      "8",
    );
    expect(container.querySelector('input[name="traveler_type"]')).toHaveValue(
      "families",
    );
    expect(container.querySelector('input[name="amenities"]')).toHaveValue(
      "Pool,Beachfront",
    );

    const filters = screen.getByRole("complementary", { name: "Stay filters" });
    expect(filters).toBeInTheDocument();
    expect(filters).toHaveClass("border-gray-200");
    expect(
      within(filters).queryByText("Find your island fit"),
    ).not.toBeInTheDocument();
    expect(
      within(filters).queryByText("Beach days, family space, quiet cays."),
    ).not.toBeInTheDocument();
    expect(filters.innerHTML).not.toContain("https://images.example/deal.jpg");
    expect(filters.innerHTML).not.toContain("linear-gradient");
    expect(filters.innerHTML).not.toContain("bg-night");
    expect(within(filters).getByText("Current search")).toBeInTheDocument();
    expect(within(filters).getByText("Best next move")).toBeInTheDocument();
    expect(
      within(filters).getByRole("link", { name: /Beach stays/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(filters).getByRole("link", { name: /Family friendly/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(filters).getByRole("link", { name: /Luxury/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(within(filters).getByText("Refine results")).toBeInTheDocument();
    expect(within(filters).getByText("Traveler fit")).toBeInTheDocument();
    expect(within(filters).getByText("Quality")).toBeInTheDocument();
    expect(within(filters).getAllByText("Stay type").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("region", { name: "Stay results" }),
    ).toBeInTheDocument();
    expect(within(filters).getByRole("link", { name: "Clear all" })).toHaveAttribute(
      "href",
      "/stays",
    );
    expect(
      within(filters).getByRole("link", { name: "5+ star" }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(filters).getByRole("link", { name: "5+ star" }),
    ).not.toHaveClass("bg-brand-600");
    expect(
      within(filters).getByRole("link", { name: "Paradise Island" }),
    ).toHaveAttribute("aria-current", "true");
    expect(within(filters).getAllByText("Resort").length).toBeGreaterThanOrEqual(1);
    expect(
      within(filters).getByRole("link", { name: "Families" }),
    ).toHaveAttribute("aria-current", "true");

    const popularTypes = screen.getByRole("navigation", {
      name: "Popular stay type shortcuts",
    });
    expect(popularTypes).toHaveClass("border-gray-200");
    expect(
      within(popularTypes).queryByText(
        "Jump straight to hotels, resorts, villas, homes, houses, apartments, or condos.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(popularTypes).getByRole("link", { name: "All stays" }),
    ).toHaveAttribute("href", expect.stringContaining("/stays?"));
    expect(
      within(popularTypes).getByRole("link", { name: "All stays" }),
    ).toHaveClass("min-h-11");
    expect(
      within(popularTypes).getByRole("link", { name: "House" }),
    ).toHaveAttribute("href", expect.stringContaining("type=House"));
    expect(
      within(popularTypes).getByRole("link", { name: "Condo" }),
    ).toHaveAttribute("href", expect.stringContaining("type=Condo"));

    const stayPromos = screen.getByRole("complementary", {
      name: "Stay promotions",
    });
    expect(
      within(stayPromos).getByRole("heading", {
        name: "Build the trip around this stay.",
      }),
    ).toBeInTheDocument();
    expect(
      within(stayPromos).getByRole("link", { name: "Plan with Buddy" }),
    ).toHaveAttribute(
      "href",
      "/dashboard/trips/new?returnTo=%2Fstays&source=stay_search",
    );
    expect(
      within(stayPromos).getByRole("heading", {
        name: "Add live flights before you pick the room.",
      }),
    ).toBeInTheDocument();
    expect(
      within(stayPromos).getByRole("link", { name: "Search flights" }),
    ).toHaveAttribute("href", "/flights");

    expect(
      screen.getAllByText("Ocean Club Resort").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Starting from")).toBeInTheDocument();
    expect(screen.getByText(/\$350/)).toBeInTheDocument();
    expect(screen.getByText("$1,400 total · 4 nights")).toBeInTheDocument();
    expect(screen.getByText("Why Buddy picked this")).toBeInTheDocument();
    expect(screen.getByText(/5-star Resort in Nassau/)).toBeInTheDocument();
    expect(screen.getByAltText("Ocean Club Resort")).toHaveAttribute(
      "src",
      "https://images.example/ocean-club.jpg",
    );

    expect(hotelMocks.getHotels).toHaveBeenCalledWith({
      island: "Nassau",
      city: "Paradise Island",
      propertyType: "Resort",
      travelerType: "families",
      minStars: 5,
      minGuestRating: 8,
      amenities: ["Pool", "Beachfront"],
      sort: "stars",
    });
    expect(hotelMocks.getCityOptions).toHaveBeenCalledWith("Nassau");
    expect(hotelMocks.getStayStartingRates).toHaveBeenCalledWith({
      hotelIds: ["lp-ocean-club"],
      checkin: "2026-08-01",
      checkout: "2026-08-05",
      adults: 2,
      children: 1,
      limit: 24,
    });
    expect(hotelMocks.getFeaturedStayHotels).not.toHaveBeenCalled();
    expect(dealMocks.getStayDeals).toHaveBeenCalledWith(3);
  });

  test("defaults to featured starter islands with stay deals and FAQ", async () => {
    const page = await StaysPage({ searchParams: {} });
    render(page);

    expect(
      screen.queryByRole("heading", {
        name: "Best Bahamas stays to start with",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Find stays in The Bahamas" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Start with 5-6 strong/)).not.toBeInTheDocument();
    expect(screen.queryByText("Default stay feed")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Best starred stays across the islands travelers ask for most",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /This starter set favors 4- and 5-star active provider records/,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Bahamas stay offers worth checking",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nassau resort stay offer")).toBeInTheDocument();
    expect(screen.getByText("Starting from")).toBeInTheDocument();
    expect(screen.getByText("Select dates")).toBeInTheDocument();
    expect(
      screen.getByText("Add dates to compare live rates"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Stays FAQ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Can travelers filter by homes, villas, apartments, or hotels?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Turn this stay shortlist into a Bahamas trip",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Start stay trip" }),
    ).toHaveAttribute(
      "href",
      "/dashboard/trips/new?returnTo=%2Fstays&source=stay",
    );
    expect(screen.getByRole("link", { name: "Start stay trip" })).toHaveClass(
      "bg-brand-600",
    );
    expect(
      screen.getByRole("link", { name: "Compare starred stays" }),
    ).toHaveAttribute("href", "/stays?sort=stars");
    expect(
      screen.getByRole("link", { name: "Review stay deals" }),
    ).toHaveAttribute("href", "/deals?type=accommodation");
    expect(screen.getByRole("link", { name: "Ask Buddy" })).toHaveAttribute(
      "href",
      "/dashboard/chat?q=Help+me+compare+Bahamas+stays",
    );
    expect(screen.queryByText("Chat with Baha Buddy")).not.toBeInTheDocument();

    expect(hotelMocks.getFeaturedStayHotels).toHaveBeenCalledWith(6);
    expect(hotelMocks.getHotels).not.toHaveBeenCalled();
    expect(hotelMocks.getCityOptions).toHaveBeenCalledWith(undefined);
    expect(hotelMocks.getStayStartingRates).not.toHaveBeenCalled();
    expect(dealMocks.getStayDeals).toHaveBeenCalledWith(3);
  });

  test("normalizes display island names before querying stay inventory", async () => {
    const page = await StaysPage({
      searchParams: {
        island: "The Exumas",
      },
    });
    render(page);

    expect(hotelMocks.getHotels).toHaveBeenCalledWith(
      expect.objectContaining({ island: "Exuma" }),
    );
    expect(hotelMocks.getCityOptions).toHaveBeenCalledWith("Exuma");
    expect(
      within(screen.getByRole("form", { name: "Search stays" })).getByRole(
        "heading",
        { name: "Find stays in Exuma" },
      ),
    ).toBeInTheDocument();
  });
});
