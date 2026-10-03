import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const SOURCE_ROOTS = ["src/app", "src/components", "src/lib"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const RETIRED_PROVIDER_TERMS = [
  ["Google", " Places"].join(""),
  ["Google", " Place"].join(""),
  ["google", " places"].join(""),
  ["google", " place"].join(""),
  ["Du", "ffel"].join(""),
  ["du", "ffel"].join(""),
  ["flights", "-proxy"].join(""),
  ["flights", "-book"].join(""),
  ["du", "ffel", "-mobile-proxy"].join(""),
];
const RETIRED_PROVIDER_PATTERN = new RegExp(RETIRED_PROVIDER_TERMS.join("|"));

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === "_archive") return [];
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!entry.isFile()) return [];
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) return [];
    if (!statSync(fullPath).isFile()) return [];

    return [fullPath];
  });
}

describe("provider reference cleanup", () => {
  test("keeps old provider names out of active web source", () => {
    const findings = SOURCE_ROOTS.flatMap(collectSourceFiles)
      .flatMap((filePath) => {
        const content = readFileSync(filePath, "utf8");

        return content
          .split("\n")
          .map((line, index) => ({ filePath, line, lineNumber: index + 1 }))
          .filter(({ line }) => RETIRED_PROVIDER_PATTERN.test(line));
      })
      .map(
        ({ filePath, line, lineNumber }) =>
          `${filePath}:${lineNumber}: ${line.trim()}`,
      );

    expect(findings).toEqual([]);
  });

  test("does not query the cached source place table with raw schema strings", () => {
    const findings = SOURCE_ROOTS.flatMap(collectSourceFiles)
      .flatMap((filePath) => {
        const content = readFileSync(filePath, "utf8");

        return content
          .split("\n")
          .map((line, index) => ({ filePath, line, lineNumber: index + 1 }))
          .filter(({ line }) => /\.from\(['"]google_places['"]\)/.test(line));
      })
      .map(
        ({ filePath, line, lineNumber }) =>
          `${filePath}:${lineNumber}: ${line.trim()}`,
      );

    expect(findings).toEqual([]);
  });

  test("routes chat and activity details through the canonical places catalog", () => {
    const chatTools = readFileSync(
      path.join(process.cwd(), "src/lib/chat-tools.ts"),
      "utf8",
    );
    const places = readFileSync(
      path.join(process.cwd(), "src/lib/places.ts"),
      "utf8",
    );
    const activityDetail = readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/activities/[id]/page.tsx"),
      "utf8",
    );
    const publicActivityDetail = readFileSync(
      path.join(process.cwd(), "src/app/explore/activities/[id]/page.tsx"),
      "utf8",
    );
    const activityDetailBody = readFileSync(
      path.join(process.cwd(), "src/components/detail/ApprovedActivityDetail.tsx"),
      "utf8",
    );

    // recommendation_eligible is false for every readiness row until media
    // rights are approved, so reading that gate hid the whole catalog.
    expect(chatTools).toContain('GROUNDED_PLACE_INVENTORY_TABLE = "places"');
    for (const source of [chatTools, places]) {
      expect(source).not.toContain("v_places_publication_readiness");
      expect(source).not.toContain("recommendation_eligible");
    }
    for (const source of [activityDetail, publicActivityDetail]) {
      expect(source).toContain("getActivitiesWithCanonicalFallback");
      expect(source).toContain("ApprovedActivityDetail");
    }
    // Traveler copy must not expose internal review wording.
    expect(activityDetailBody).not.toMatch(/approved source|source-approved/i);
  });

  test("privacy copy names Supabase cached inventory instead of place enrichment as a provider", () => {
    const privacyPage = readFileSync(
      path.join(process.cwd(), "src/app/privacy/page.tsx"),
      "utf8",
    );

    expect(privacyPage).toContain("Supabase cached place inventory");
    expect(privacyPage).not.toMatch(/server-side place enrichment/i);
  });

  test("disables legacy cached provider-photo references", () => {
    const route = readFileSync(
      path.join(process.cwd(), "src/app/api/place-photo/route.ts"),
      "utf8",
    );

    expect(route).toContain("status: 410");
    expect(route).toContain("legacy-provider-reference-disabled");
    expect(route).not.toContain("photo_reference");
    expect(route).not.toContain("GOOGLE_MAPS_API_KEY");
  });
});
