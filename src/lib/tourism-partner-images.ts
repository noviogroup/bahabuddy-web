/**
 * Local, rights-recorded image catalog from the authenticated Bahamas
 * Specialist Promote → Images library. Source provenance and working originals
 * live in `assets/marketing/bahamas-tourism-partner-2026-09-12/catalog.tsv`.
 */

export interface TourismPartnerImage {
  src: string
  label: string
  alt: string
  sourceAsset: string
  scope: string
}

const ROOT = '/assets/tourism-partner'

function image(
  path: string,
  label: string,
  alt: string,
  sourceAsset: string,
  scope: string,
): TourismPartnerImage {
  return { src: `${ROOT}/${path}`, label, alt, sourceAsset, scope }
}

export const TourismPartnerImages = {
  essentials: {
    welcome: image('01-essentials/01-welcome-to-the-bahamas.webp', 'Welcome to The Bahamas', 'A couple walks from a seaplane parked beside clear turquoise water in The Bahamas.', '1619809533-1619809533.jpg', 'The Bahamas'),
    traveling: image('01-essentials/02-traveling-to-and-between-the-islands.webp', 'Traveling to and between the islands', 'A traveler relaxes on the bow of a boat moving through bright blue Bahamian water.', '1763490249-1763490249.jpg', 'The Bahamas'),
    accommodations: image('01-essentials/03-accommodations-overview.webp', 'Accommodations overview', 'Pastel island cottages line a sunny pedestrian lane beneath palm trees.', '1763490366-1763490366.jpg', 'The Bahamas; unnamed accommodation context'),
    knowBeforeYouGo: image('01-essentials/04-know-before-they-go.webp', 'Know before you go', 'Travelers gather at a colorful beach stand beneath palm trees.', '1763490467-1763490467.jpg', 'The Bahamas'),
    traveler: image('01-essentials/05-who-is-the-bahamas-traveler.webp', 'The Bahamas traveler', 'Friends jump from a boat into clear shallow water.', '1619885575-1619885575.jpg', 'The Bahamas'),
    funFacts: image('01-essentials/06-fun-facts.webp', 'Fun facts', 'A snorkeler swims through clear water beside a small boat.', '1763490620-1763490620.jpg', 'The Bahamas'),
  },
  islands: {
    nassauParadiseIsland: image('02-islands/01-nassau-paradise-island.webp', 'Nassau and Paradise Island', "A couple walks through the limestone passage of the Queen's Staircase in Nassau.", '1763488599-1763488599.jpg', 'Nassau and Paradise Island'),
    grandBahama: image('02-islands/02-freeport-grand-bahama-island.webp', 'Freeport and Grand Bahama Island', 'Visitors meet a stingray from a small boat in the shallow water of Grand Bahama.', '1690388649-1690388649.jpg', 'Grand Bahama'),
    outIslands: image('02-islands/03-discover-the-out-islands.webp', 'Discover the Out Islands', 'A sailboat passes a red-and-white lighthouse in the Out Islands.', '1619894658-1619894658.jpg', 'Regional Out Islands only'),
    eleutheraHarbourIsland: image('02-islands/04-eleuthera-harbour-island.webp', 'Eleuthera and Harbour Island', 'Two riders cross a pink-sand beach on horseback beside turquoise water.', '1763488736-1763488736.jpg', 'Eleuthera and Harbour Island'),
    exumas: image('02-islands/05-the-exumas.webp', 'The Exumas', 'A snorkeler explores a rocky cove filled with tropical fish in The Exumas.', '1763488870-1763488870.jpg', 'The Exumas'),
    bimini: image('02-islands/06-bimini.webp', 'Bimini', 'A scuba diver swims above a shark and coral reef in Bimini.', '1619894845-1619894845.jpg', 'Bimini'),
    andros: image('02-islands/07-andros.webp', 'Andros', 'Swimmers leap from a small platform into a forest-ringed blue hole on Andros.', '1763489192-1763489192.jpg', 'Andros'),
    berryIslands: image('02-islands/08-the-berry-islands.webp', 'The Berry Islands', 'Travelers arrive by small boat in the clear shallow water of the Berry Islands.', '1763489090-1763489090.jpg', 'The Berry Islands'),
    catIsland: image('02-islands/09-cat-island.webp', 'Cat Island', 'Travelers hike through a rocky hillside landscape on Cat Island.', '1763489492-1763489492.jpg', 'Cat Island'),
    longIsland: image('02-islands/10-long-island.webp', 'Long Island', 'A couple kayaks together through calm turquoise water off Long Island.', '1763489614-1763489614.jpg', 'Long Island'),
    southernBahamas: image('02-islands/11-the-southern-bahamas.webp', 'The Southern Bahamas', 'Travelers jump from a catamaran into clear water in the Southern Bahamas.', '1763489752-1763489752.jpg', 'Regional Southern Bahamas only'),
    acklinsCrookedIsland: image('02-islands/12-acklins-crooked-island.webp', 'Acklins and Crooked Island', 'A smiling couple travels by small boat through the bright water of Acklins and Crooked Island.', '1763489907-1763489907.jpg', 'Acklins and Crooked Island'),
    inaguaMayaguanaRaggedIsland: image('02-islands/13-inagua-mayaguana-ragged-island.webp', 'Inagua, Mayaguana, and Ragged Island', 'Travelers explore a pine landscape by open vehicle in the southern islands.', '1763490011-1763490011.jpg', 'Regional Inagua, Mayaguana, and Ragged Island only'),
    rumCay: image('02-islands/14-rum-cay.webp', 'Rum Cay', 'A wooden dock reaches into clear turquoise water at Rum Cay.', 'c2p20_1a_v1.jpg', 'Rum Cay'),
    mayaguana: image('02-islands/15-mayaguana.webp', 'Mayaguana', 'Sea oats frame a quiet turquoise beach on Mayaguana.', 'c2p23_1b.jpg', 'Mayaguana'),
  },
  experiences: {
    festivalsEvents: image('03-experiences/01-festivals-and-events.webp', 'Festivals and events', 'Friends celebrate beside a brightly colored Junkanoo costume.', '1763487624-1763487624.jpg', 'The Bahamas'),
    naturalAttractions: image('03-experiences/02-natural-attractions.webp', 'Natural attractions', 'A couple cruises toward a weathered shipwreck in clear Bahamian water.', '1763487727-1763487727.jpg', 'The Bahamas; exact wreck unverified'),
    underwaterAttractions: image('03-experiences/03-more-natural-attractions.webp', 'More natural attractions', 'Scuba divers explore a shipwreck resting on a sandy seabed.', '1763487903-1763487903.jpg', 'The Bahamas; exact wreck unverified'),
    cuisine: image('03-experiences/04-cuisine.webp', 'Cuisine', 'A Bahamian host shares a meal with a visiting family outdoors.', '1763488017-1763488017.jpg', 'The Bahamas; unnamed dining context'),
    shopping: image('03-experiences/05-shopping.webp', 'Shopping', 'Travelers browse colorful locally made goods with a shopkeeper.', '1763488149-1763488149.jpg', 'The Bahamas; unnamed retail context'),
    peopleToPeople: image('03-experiences/06-people-to-people-experience.webp', 'People-to-People experience', 'A Bahamian host prepares food with a visiting family.', '1763488373-1763488373.jpg', 'The Bahamas'),
  },
  romance: {
    allure: image('04-romance/01-allure-of-romance.webp', 'The allure of romance', 'A couple smiles together on a sunlit seaside walkway.', '1763486864-1763486864.jpg', 'The Bahamas'),
    wedding: image('04-romance/02-saying-i-do-in-the-islands.webp', 'Saying I do in the islands', 'Newlyweds cut a pink wedding cake at a destination celebration.', '1763487051-1763487051.jpg', 'The Bahamas; wedding context'),
    licenseToRegistry: image('04-romance/03-license-to-registry.webp', 'From license to registry', 'A couple rides in a golf cart past pastel island homes.', '1620400396-1620400396.jpg', 'The Bahamas'),
    islandWedding: image('04-romance/04-isles-of-romance-01.webp', 'Island wedding', 'A newly married couple walks down a flower-lined outdoor aisle.', '1763487181-1763487181.jpg', 'The Bahamas; unnamed wedding venue'),
    beachHammock: image('04-romance/05-isles-of-romance-02.webp', 'Beach hammock escape', 'A couple relaxes in a hammock beneath palms beside a sandy beach.', '1620400859-1620400859.jpg', 'The Bahamas'),
    islandCycling: image('04-romance/06-isles-of-romance-03.webp', 'Island cycling', 'A couple cycles past pastel cottages and palm trees.', '1620400979-1620400979.jpg', 'The Bahamas'),
    beachCeremony: image('04-romance/07-isles-of-romance-04.webp', 'Beach ceremony', 'A couple dances together after a beach wedding ceremony.', '1763487273-1763487273.jpg', 'The Bahamas; unnamed wedding venue'),
    seaplaneArrival: image('04-romance/08-isles-of-romance-05.webp', 'Romantic seaplane arrival', 'A seaplane rests in shallow water beneath a pink island sunset.', '1620401245-1620401245.jpg', 'The Bahamas'),
    lighthouse: image('04-romance/09-isles-of-romance-06.webp', 'Island lighthouse', 'A white lighthouse rises beyond red flowers under a bright blue sky.', '1763487419-1763487419.jpg', 'The Bahamas; exact lighthouse unverified'),
  },
  groupsEvents: {
    overview: image('05-groups-and-events/01-overview.webp', 'Group travel overview', 'Friends gather around a beach bonfire at dusk.', '1763486518-1763486518.jpg', 'The Bahamas'),
    familyIslandMarina: image('05-groups-and-events/02-stay-meet-abacos-andros-bimini-eleuthera.webp', 'Family Island meetings and stays', 'An aerial view shows a marina and coastal settlement in the Family Islands.', '1763486637-1763486637.jpg', 'Regional Abacos, Andros, Bimini, and Eleuthera context'),
    islandDock: image('05-groups-and-events/03-stay-meet-exumas-freeport-long-island-san-salvador.webp', 'Southern and central island meetings and stays', 'Two travelers stand on a rustic dock over turquoise water.', '1620404058-1620404058.jpg', 'Regional Exumas, Grand Bahama, Long Island, and San Salvador context'),
    nassauMeetings: image('05-groups-and-events/04-stay-meet-nassau-paradise-island.webp', 'Nassau and Paradise Island meetings and stays', 'Guests walk through a palm-lined resort garden in Nassau and Paradise Island.', '1763486730-1763486730.jpg', 'Nassau and Paradise Island; unnamed property'),
    groupActivities: image('05-groups-and-events/05-group-activities.webp', 'Group activities', 'Travelers laugh together over drinks near the water.', '1619895697-1619895697.jpg', 'The Bahamas; unnamed venue'),
    inspiringEvents: image('05-groups-and-events/06-inspiring-events.webp', 'Inspiring events', 'A white beach pavilion stands beside turquoise water.', '1619895713-1619895713.jpg', 'The Bahamas; unnamed venue'),
  },
  dive: {
    alexKydd: image('06-dive/01-alex-kydd.webp', 'Alex Kydd', 'A scuba diver steps from a boat into bright turquoise water.', '1619895778-1619895778.jpg', 'The Bahamas; named editorial context'),
    wrecks: image('06-dive/02-walls-reefs-and-wrecks.webp', 'Walls, reefs, and wrecks', 'A scuba diver explores the bow of a large shipwreck.', '1619895797-1619895797.jpg', 'The Bahamas; exact wreck unverified'),
    grandBahamaBimini: image('06-dive/03-grand-bahama-and-bimini.webp', 'Grand Bahama and Bimini diving', 'A scuba diver observes a hammerhead shark underwater.', '1620405404-1620405404.jpg', 'Grand Bahama and Bimini'),
    nassauAndros: image('06-dive/04-nassau-and-andros.webp', 'Nassau and Andros diving', 'An aerial view shows a circular blue hole surrounded by dense forest.', '1763485750-1763485750.jpg', 'Nassau and Andros regional context; exact blue hole unverified'),
    exumasSanSalvador: image('06-dive/05-exumas-and-san-salvador.webp', 'The Exumas and San Salvador diving', 'A swimmer moves through clear water beneath small sharks.', '1763485851-1763485851.jpg', 'The Exumas and San Salvador'),
    eleutheraAbacos: image('06-dive/06-eleuthera-and-the-abacos.webp', 'Eleuthera and The Abacos diving', 'A scuba diver explores a shipwreck in deep blue water.', '1620405550-1620405550.jpg', 'Eleuthera and The Abacos; exact wreck unverified'),
    catLongBerry: image('06-dive/07-cat-island-long-island-berry-islands.webp', 'Cat Island, Long Island, and Berry Islands diving', 'A scuba diver swims alongside a sea turtle above a coral reef.', '1619895917-1619895917.jpg', 'Cat Island, Long Island, and Berry Islands regional context'),
    divePlanning: image('06-dive/08-dive-ins-and-outs.webp', 'Dive planning', 'A couple walks along a marina dock beside dive tanks and boats.', '1763486065-1763486065.jpg', 'The Bahamas; unnamed marina'),
    diveKnowledge: image('06-dive/09-sea-what-you-know.webp', 'Dive knowledge', 'A swimmer watches sharks moving through clear shallow water.', '1620173618-1620173618.jpg', 'The Bahamas'),
    animalEncounters: image('06-dive/10-animal-encounters-and-blue-holes.webp', 'Animal encounters and blue holes', 'A scuba diver kneels near reef sharks on a sandy seabed.', '1619895811-1619895811.jpg', 'The Bahamas'),
  },
  additional: {
    welcome: image('07-additional/01-welcome-to-the-bahamas.webp', 'Welcome to The Bahamas', 'A couple walks from a seaplane parked beside clear turquoise water in The Bahamas.', '1736769595-1619809533-1619809533.png', 'The Bahamas'),
  },
} as const

export const tourismPartnerImageList: TourismPartnerImage[] = [
  ...Object.values(TourismPartnerImages.essentials),
  ...Object.values(TourismPartnerImages.islands),
  ...Object.values(TourismPartnerImages.experiences),
  ...Object.values(TourismPartnerImages.romance),
  ...Object.values(TourismPartnerImages.groupsEvents),
  ...Object.values(TourismPartnerImages.dive),
  ...Object.values(TourismPartnerImages.additional),
]
