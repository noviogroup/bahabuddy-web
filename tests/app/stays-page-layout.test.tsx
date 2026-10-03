import { fireEvent, render, screen, within } from "@testing-library/react";
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

  test("preserves search context through collapsed editing, filter clearing, and stay detail", async () => {
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

    expect(screen.getByRole("heading", { name: "Find stays" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Search stays" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit search" }));
    const searchForm = screen.getByRole("form", { name: "Search stays" });
    expect(within(searchForm).getByRole("button", { name: "Choose destination" })).toHaveTextContent("Paradise Island, Nassau");
    expect(within(searchForm).getByRole("button", { name: /^Choose stay dates: / })).toHaveTextContent("Aug 1 – Aug 5");
    expect(within(searchForm).getByRole("button", { name: "Choose travelers and rooms" })).toHaveTextContent("2 adults, 2 rooms");
    const fields = {island: "Nassau", city: "Paradise Island", checkin: "2026-08-01", checkout: "2026-08-05", adults: "2", children: "1", rooms: "2", type: "Resort", stars: "5", guest_rating: "8", traveler_type: "families", amenities: "Pool,Beachfront"};
    for (const [name, value] of Object.entries(fields)) {
      expect(searchForm.querySelector(`input[name="${name}"]`)).toHaveValue(value);
    }
    const clear = new URL(screen.getByRole("link", { name: "Clear filters" }).getAttribute("href")!, "https://test.local");
    expect(clear.searchParams.get("checkin")).toBe("2026-08-01");
    expect(clear.searchParams.get("adults")).toBe("2");
    expect(clear.searchParams.get("island")).toBe("Nassau");
    expect(clear.searchParams.has("type")).toBe(false);
    expect(clear.searchParams.has("amenities")).toBe(false);
    expect(screen.getByRole("link", { name: "Remove Amenity: Pool" })).toHaveAttribute("href", expect.stringContaining("amenities=Beachfront"));
    expect(screen.getByText("Filters & sort (6)").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("complementary", { name: "Stay promotions" })).not.toBeInTheDocument();
    expect(screen.queryByText("Why Buddy picked this")).not.toBeInTheDocument();
    expect(screen.getByText(/USD\s*350/)).toBeInTheDocument();
    expect(screen.getByText(/USD\s*1,400 total · 4 nights/)).toBeInTheDocument();
    const detail = new URL(screen.getByRole("link", { name: "View stay" }).getAttribute("href")!, "https://test.local");
    expect(detail.searchParams.get("checkin")).toBe("2026-08-01");
    expect(detail.searchParams.get("rooms")).toBe("2");
    expect(container.querySelectorAll('article')).toHaveLength(1);

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
    expect(dealMocks.getStayDeals).not.toHaveBeenCalled();
  });

  test("lets guests browse featured stays without invented rates or promotional panels", async () => {
    const page = await StaysPage({ searchParams: {} });
    render(page);

    expect(screen.getByRole("heading", { name: "Find stays" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Search stays" })).toBeVisible();
    expect(screen.getByText("Select dates")).toBeInTheDocument();
    expect(screen.queryByText("Why Buddy picked this")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Stays FAQ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Nassau resort stay offer")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask Buddy" })).toHaveAttribute("href", "/dashboard/chat?q=Help+me+compare+Bahamas+stays");

    expect(hotelMocks.getFeaturedStayHotels).toHaveBeenCalledWith(6);
    expect(hotelMocks.getHotels).not.toHaveBeenCalled();
    expect(hotelMocks.getCityOptions).toHaveBeenCalledWith(undefined);
    expect(hotelMocks.getStayStartingRates).not.toHaveBeenCalled();
    expect(dealMocks.getStayDeals).not.toHaveBeenCalled();
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
      screen.getByRole("heading", { name: "Find stays" }),
    ).toBeInTheDocument();
  });
  test("unpriced stays remain visible beside priced stays", async () => {
    hotelMocks.getHotels.mockResolvedValue([...sampleHotels, { ...sampleHotels[0], id: "unpriced", name: "Unpriced stay", review_score: null }]);
    render(await StaysPage({ searchParams: { island: "Nassau", checkin: "2099-10-17", checkout: "2099-10-21", adults: "2" } }));
    expect(screen.getByRole("heading", { name: "2 stays in Nassau" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unpriced stay" })).toBeInTheDocument();
    expect(screen.getByText("Price not yet available")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View stay" })).toHaveLength(2);
  });

  test("empty filtered results can clear refinements without losing dates", async () => {
    hotelMocks.getHotels.mockResolvedValue([]);
    render(await StaysPage({ searchParams: { island: "Nassau", type: "Villa", checkin: "2099-10-17", checkout: "2099-10-21" } }));
    expect(screen.getByText("No stays found")).toBeInTheDocument();
    const results = screen.getByRole("region", { name: "Stay results" });
    const href = within(results).getByRole("link", { name: "Clear filters" }).getAttribute("href")!;
    expect(href).toContain("checkin=2099-10-17");
    expect(href).not.toContain("type=Villa");
  });

});
