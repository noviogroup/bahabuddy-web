import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HomepageStorySections from "@/components/home/HomepageStorySections";

describe("HomepageStorySections direct actions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("handoff strip explains Baha Buddy with stronger homepage copy", () => {
    render(<HomepageStorySections />);

    expect(
      screen.getByRole("region", { name: "How Baha Buddy plans" }),
    ).toHaveTextContent("Tell Buddy what you have in mind");
    expect(
      screen.getByText(
        "Share dates, travelers, budget, island ideas, or the kind of Bahamas trip you want.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Get a plan shaped around The Bahamas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Buddy connects islands, stays, flights, transfers, meals, boat days, and backup timing.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Move from ideas to a real itinerary"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compare real options, save favorites, book when ready, and keep the plan with you while you travel.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Baha Buddy mobile prompt screen" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/home/mobile-step-tell-buddy.png"),
    );
    expect(
      screen.getByRole("img", { name: "Baha Buddy mobile home plan screen" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/home/mobile-step-home-plan.png"),
    );
    expect(
      screen.getByRole("img", { name: "Baha Buddy mobile itinerary screen" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/home/mobile-step-itinerary.png"),
    );
    expect(screen.queryByText("Say the trip")).not.toBeInTheDocument();
    expect(screen.queryByText("Buddy sorts it")).not.toBeInTheDocument();
  });

  test("deferred Buddy story does not expose its homepage action", () => {
    render(<HomepageStorySections />);
    expect(screen.queryByRole("link", { name: "Start with Buddy" })).not.toBeInTheDocument();
  });

  test("homepage category cards expose direct travel actions", () => {
    const { container } = render(<HomepageStorySections />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );

    const categorySection = screen.getByRole("region", {
      name: "Explore your Bahamas trip",
    });

    expect(categorySection).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Browse real trip options before Buddy builds the plan.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("View category")).not.toBeInTheDocument();
    expect(categorySection.innerHTML).not.toContain("from-night/90");
    expect(categorySection.innerHTML).not.toContain("aspect-[4/3]");
    expect(categorySection.innerHTML).not.toContain("bg-white/95");
    expect(categorySection.innerHTML).toContain(
      "[text-shadow:0_3px_28px_rgba(0,0,0,0.42)]",
    );
    expect(categorySection).toHaveTextContent("Plan the essentials");
    expect(categorySection).toHaveTextContent("Choose the experience");
    expect(categorySection.innerHTML).not.toContain("group-hover:bg-gold-50");
    expect(categorySection.innerHTML).not.toContain(
      "group-hover:border-gold-200",
    );
    expect(categorySection.innerHTML).toContain("group-hover:bg-brand-50");

    const categoryImageSrcs = within(categorySection)
      .getAllByRole("img")
      .map((image) => decodeURIComponent(image.getAttribute("src") ?? ""));

    expect(categoryImageSrcs).toHaveLength(10);
    expect(
      categoryImageSrcs.every(
        (src) =>
          src.includes("/assets/tourism-partner/"),
      ),
    ).toBe(true);
    expect(categoryImageSrcs.join(" ")).not.toContain(
      "/assets/home/trip-categories/",
    );

    expect(hrefs).toContain("/stays?sort=stars");
    expect(hrefs).toContain("/flights");
    expect(hrefs).toContain("/explore");
    expect(hrefs).toContain("/restaurants");
    expect(hrefs).toContain("/destinations");
    expect(hrefs).toContain("/guides");
    expect(hrefs).toContain("/concierge-trip-plan");
    expect(container.innerHTML).not.toContain("/dashboard/chat");
  });

  test("Buddy planning story is temporarily removed from the homepage", () => {
    render(<HomepageStorySections />);
    expect(screen.queryByText("Chat with Buddy")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Plan your Bahamas trip in one conversation." })).not.toBeInTheDocument();
  });

  test("island cards keep full images without a dark image overlay", () => {
    render(<HomepageStorySections />);

    const islandHeading = screen.getByRole("heading", {
      name: "The Bahamas changes every few miles.",
    });
    const islandSection = islandHeading.closest("section");

    expect(islandSection?.innerHTML).not.toContain("from-night/90");
    expect(islandSection?.innerHTML).not.toContain("group-hover:bg-gold-50");
    expect(
      screen.getByRole("link", { name: /Exuma Explore island/i }),
    ).toBeInTheDocument();
  });

  test("island section temporarily hides the geography map while retaining island discovery", () => {
    render(<HomepageStorySections />);

    expect(
      screen.queryByRole("group", { name: "Interactive Bahamas island map" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Nassau Explore island/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /The Abacos Explore island/i }),
    ).toHaveAttribute("href", "/explore/island/abacos");
  });

  test("trust bar includes Bahamas destination partner logos", () => {
    render(<HomepageStorySections />);

    expect(
      screen.getByRole("list", {
        name: "Trusted Bahamas destination partners",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Nassau Paradise Island" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/trust/nassau-paradise-island.svg"),
    );
    expect(
      screen.getByRole("img", { name: "The Family Islands Bahamas" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/trust/family-islands-bahamas.jpg"),
    );
    expect(
      screen.getByRole("img", { name: "The Out Islands Bahamas" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/trust/out-islands-bahamas.png"),
    );
    expect(
      screen.getByRole("img", { name: "Grand Bahama Island" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/trust/grand-bahama-island.webp"),
    );
  });

  test("traveler moment section is temporarily removed from the homepage", () => {
    render(<HomepageStorySections />);
    expect(screen.queryByRole("heading", { name: "What kind of Bahamas help do you need?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Traveler status" })).not.toBeInTheDocument();
  });

  test("featured experiences render as a marketplace shelf with direct details links", () => {
    render(<HomepageStorySections />);

    expect(
      screen.getByLabelText("Featured Bahamas experiences"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Traveller favourites across The Bahamas.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Top things to do")).toBeInTheDocument();
    expect(screen.queryByText("Airport Transfer")).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Traveller favourites across The Bahamas." }),
    ).not.toHaveTextContent(/transfer/i);
    expect(screen.queryAllByTestId("featured-experience-badge")).toHaveLength(0);
    expect(screen.queryByText("01 / 08")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Previous featured experience" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next featured experience" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show Nassau Snorkeling Tour" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "View details for Swimming Pigs Experience",
      }),
    ).toHaveAttribute("href", "/guides/swimming-pigs-exuma");
  });

  test("featured experiences show admin Top picks once there are at least three", () => {
    const topPicks = ["Pig Beach at Big Major Cay", "Blue Lagoon Island", "Pink Sand Beach"].map(
      (title, index) => ({
        title,
        island: "Exuma",
        category: "Beach",
        href: `/explore/places/pick-${index}`,
        image: `https://media-cdn.tripadvisor.com/pick-${index}.jpg`,
        badge: "Top pick" as const,
      }),
    );
    render(<HomepageStorySections topPicks={topPicks} />);

    expect(screen.getAllByTestId("featured-experience-card")).toHaveLength(3);
    expect(screen.getAllByTestId("featured-experience-badge")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "View details for Pig Beach at Big Major Cay" }),
    ).toHaveAttribute("href", "/explore/places/pick-0");
    expect(
      screen.queryByRole("link", { name: "View details for Swimming Pigs Experience" }),
    ).not.toBeInTheDocument();
    const section = screen.getByRole("region", {
      name: "Traveller favourites across The Bahamas.",
    });
    expect(
      within(section).getByRole("link", { name: "Explore Experiences" }),
    ).toHaveAttribute("href", "/explore");
  });

  test("featured experiences keep the static shelf when fewer than three Top picks exist", () => {
    render(
      <HomepageStorySections
        topPicks={[
          {
            title: "Pink Sand Beach",
            island: "Harbour Island",
            category: "Beach",
            href: "/explore/places/pink-sand-beach",
            image: "https://media-cdn.tripadvisor.com/pink.jpg",
            badge: "Top pick",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "View details for Swimming Pigs Experience" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "View details for Pink Sand Beach" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Airport Transfer")).not.toBeInTheDocument();
  });

  test("partner ecosystem is temporarily removed from the homepage", () => {
    render(<HomepageStorySections />);
    expect(screen.queryByText("Bahamas travel ecosystem")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Baha Buddy connects the Bahamas travel ecosystem" })).not.toBeInTheDocument();
  });

});
