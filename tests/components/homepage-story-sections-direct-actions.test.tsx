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

  test("decision story starts a seeded trip instead of routing to chat or generic dashboard", () => {
    render(<HomepageStorySections />);

    expect(
      screen.queryByRole("link", { name: "Plan with Buddy" }),
    ).not.toBeInTheDocument();

    const startTrip = screen.getByRole("link", { name: "Start with Buddy" });
    const href = startTrip.getAttribute("href") ?? "";
    const url = new URL(href, "https://bahabuddy.test");

    expect(url.pathname).toBe("/dashboard/trips/new");
    expect(url.searchParams.get("returnTo")).toBe("/");
    expect(url.searchParams.get("source")).toBe("homepage");
    expect(url.searchParams.get("seed")).toContain(
      "Help me organize a Bahamas trip",
    );
    expect(href).not.toContain("/dashboard/chat");
    expect(startTrip).toHaveClass("bg-brand-600");
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
          src.includes("tempo.cdn.tambourine.com") ||
          src.includes("travprocdn.imgix.net") ||
          src.includes("nassauparadiseisland.com"),
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

  test("Buddy planning section focuses on chat and organizing the whole trip", () => {
    render(<HomepageStorySections />);

    const section = screen.getByText("Chat with Buddy").closest("section");

    expect(section).toHaveClass("bg-brand-50/55");
    expect(section).toHaveTextContent(
      "Plan your Bahamas trip in one conversation.",
    );
    expect(section).toHaveTextContent(
      "Five nights in Nassau for two. Good food, history, and one quiet beach day.",
    );
    expect(section).toHaveTextContent("One plan that updates with you");
    expect(section).toHaveTextContent(
      "Stays, flights, transport, dining, and activities stay connected",
    );
    expect(
      within(section as HTMLElement).getByRole("img", {
        name: "Travelers exploring the Queen's Staircase in Nassau",
      }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("travprocdn.imgix.net"),
    );
    expect(within(section as HTMLElement).queryByRole("list")).not.toBeInTheDocument();
    expect(
      within(section as HTMLElement).queryByRole("link", { name: "Explore first" }),
    ).not.toBeInTheDocument();
    expect(section?.innerHTML).not.toContain("Animated Buddy chat preview");
    expect(section?.innerHTML).not.toContain("animate-ping");
    expect(section?.innerHTML).not.toContain(
      "buddy-chat-waterfront-planner.png",
    );
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

  test("homepage segments travelers by current trip moment", () => {
    const { container } = render(<HomepageStorySections />);

    const sections = Array.from(container.querySelectorAll("section"));
    const islandSectionIndex = sections.findIndex((section) =>
      section.textContent?.includes("The Bahamas changes every few miles."),
    );
    const travelerSectionIndex = sections.findIndex((section) =>
      section.textContent?.includes("What kind of Bahamas help do you need?"),
    );

    expect(islandSectionIndex).toBeGreaterThanOrEqual(0);
    expect(travelerSectionIndex).toBe(islandSectionIndex + 1);

    expect(
      screen.getByRole("heading", {
        name: "What kind of Bahamas help do you need?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: "Traveler status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Planning a trip" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tab", { name: "Already here" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "On a cruise" }),
    ).toBeInTheDocument();
  });

  test("featured experiences render as a marketplace shelf with direct details links", () => {
    render(<HomepageStorySections />);

    expect(
      screen.getByLabelText("Featured Bahamas experiences"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Popular ways to spend a Bahamas day.",
      }),
    ).toBeInTheDocument();
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
    ).toHaveAttribute("href", "/guides/swimming-pigs-exuma-guide");
  });

  test("partner ecosystem uses a visual wheel instead of plain partner boxes", () => {
    const { container } = render(<HomepageStorySections />);
    const wheel = screen.getByRole("group", {
      name: "Baha Buddy connects the Bahamas travel ecosystem",
    });
    const wheelLinks = Array.from(wheel.querySelectorAll("a")).map((link) => ({
      href: link.getAttribute("href"),
      text: link.textContent?.replace(/\s+/g, " ").trim(),
    }));

    expect(within(wheel).getAllByText("Baha Buddy")).toHaveLength(2);
    expect(within(wheel).getAllByText("Trip center")).toHaveLength(2);
    expect(wheelLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/stays?sort=stars",
          text: expect.stringContaining("Stays"),
        }),
        expect.objectContaining({
          href: "/flights",
          text: expect.stringContaining("Flights"),
        }),
        expect.objectContaining({
          href: "/explore",
          text: expect.stringContaining("Activities"),
        }),
        expect.objectContaining({
          href: "/guides",
          text: expect.stringContaining("Guides"),
        }),
        expect.objectContaining({
          href: "/concierge-trip-plan",
          text: expect.stringContaining("Transport"),
        }),
      ]),
    );
    expect(container.innerHTML).not.toContain("Hotels and island stays");
    expect(container.innerHTML).not.toContain("Tour operators and guides");
  });
});
