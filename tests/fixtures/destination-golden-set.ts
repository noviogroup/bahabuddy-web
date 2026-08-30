export const GOLDEN_ISLANDS = [
  ['abacos', 'The Abacos'],
  ['acklins-crooked-island', 'Acklins & Crooked Island'],
  ['andros', 'Andros'],
  ['berry-islands', 'The Berry Islands'],
  ['bimini', 'Bimini'],
  ['cat-island', 'Cat Island'],
  ['eleuthera-harbour-island', 'Eleuthera & Harbour Island'],
  ['the-exumas', 'The Exumas'],
  ['grand-bahama', 'Grand Bahama'],
  ['inagua', 'Inagua'],
  ['long-island', 'Long Island'],
  ['mayaguana', 'Mayaguana'],
  ['nassau-paradise-island', 'Nassau & Paradise Island'],
  ['ragged-island', 'Ragged Island'],
  ['rum-cay', 'Rum Cay'],
  ['san-salvador', 'San Salvador'],
] as const

const QUESTION_TEMPLATES = [
  ['overview', 'Give me a grounded overview of {island}.'],
  ['overview', 'What is the general vibe and pace of {island}?'],
  ['overview', 'Who is {island} best suited for?'],
  ['overview', 'Who might find {island} less suitable?'],
  ['overview', 'How many days should I plan for {island}?'],
  ['seasonality', 'What is the approved best-time-to-visit guidance for {island}?'],
  ['access', 'How do travelers generally reach {island}?'],
  ['access', 'Which airports serve {island}?'],
  ['access', 'What ferry or port gateways should I know for {island}?'],
  ['food', 'What food experiences fit a visit to {island}?'],
  ['culture', 'What history should I understand before visiting {island}?'],
  ['culture', 'What cultural experiences are associated with {island}?'],
  ['nature', 'What nature experiences fit {island}?'],
  ['experiences', 'Is {island} a good fit for diving?'],
  ['experiences', 'Is {island} a good fit for fishing?'],
  ['experiences', 'Is {island} a good fit for boating?'],
  ['overview', 'How well does {island} fit a family trip?'],
  ['accessibility', 'What verified accessibility guidance exists for {island}?'],
  ['safety', 'What approved practical or safety guidance exists for {island}?'],
  ['overview', 'Only using approved evidence, what should I know before choosing {island}?'],
] as const

export type DestinationGoldenCase = {
  id: string
  islandSlug: string
  islandName: string
  topic: string
  question: string
  expectedTool: 'get_destination_context' | 'get_places'
  requiredCanonicalIsland: string
  mustRefuteWrongIsland?: boolean
}

export const DESTINATION_GOLDEN_SET: DestinationGoldenCase[] = GOLDEN_ISLANDS.flatMap(
  ([islandSlug, islandName]) => QUESTION_TEMPLATES.map(([topic, template], index) => {
    const isLongIslandRegression = islandSlug === 'long-island' && index === 19
    const isExumasRegression = islandSlug === 'the-exumas' && index === 19
    return {
      id: `${islandSlug}-${String(index + 1).padStart(2, '0')}`,
      islandSlug,
      islandName,
      topic,
      question: isLongIslandRegression
        ? "Which island is Dean's Blue Hole on? Verify the named place."
        : isExumasRegression
          ? "Is Dean's Blue Hole in The Exumas? Verify the named place and correct me if needed."
          : template.replace('{island}', islandName),
      expectedTool: isLongIslandRegression || isExumasRegression ? 'get_places' : 'get_destination_context',
      requiredCanonicalIsland: isLongIslandRegression || isExumasRegression ? 'long-island' : islandSlug,
      ...(isExumasRegression ? { mustRefuteWrongIsland: true } : {}),
    }
  }),
)
