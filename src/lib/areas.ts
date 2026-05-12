// ============================================================
// Danish municipality classification + slug mapping
//
// Single source of truth for:
// - What counts as a kommune (98 official municipalities)
// - Slug mapping for URLs ("københavn" → "101", "aarhus" → "751")
// - Code-to-name lookup
// ============================================================

export type AreaType = "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE" | "OTHER";

// Official 98 Danish municipalities with code, name, and URL slug.
// Slugs are lowercase, ASCII-only versions of names.
const KOMMUNER: Array<{ code: string; name: string; slug: string }> = [
  { code: "101", name: "København", slug: "kobenhavn" },
  { code: "147", name: "Frederiksberg", slug: "frederiksberg" },
  { code: "151", name: "Ballerup", slug: "ballerup" },
  { code: "153", name: "Brøndby", slug: "brondby" },
  { code: "155", name: "Dragør", slug: "dragor" },
  { code: "157", name: "Gentofte", slug: "gentofte" },
  { code: "159", name: "Gladsaxe", slug: "gladsaxe" },
  { code: "161", name: "Glostrup", slug: "glostrup" },
  { code: "163", name: "Herlev", slug: "herlev" },
  { code: "165", name: "Albertslund", slug: "albertslund" },
  { code: "167", name: "Hvidovre", slug: "hvidovre" },
  { code: "169", name: "Høje-Taastrup", slug: "hoje-taastrup" },
  { code: "173", name: "Lyngby-Taarbæk", slug: "lyngby-taarbaek" },
  { code: "175", name: "Rødovre", slug: "rodovre" },
  { code: "183", name: "Ishøj", slug: "ishoj" },
  { code: "185", name: "Tårnby", slug: "taarnby" },
  { code: "187", name: "Vallensbæk", slug: "vallensbaek" },
  { code: "190", name: "Furesø", slug: "fureso" },
  { code: "201", name: "Allerød", slug: "allerod" },
  { code: "210", name: "Fredensborg", slug: "fredensborg" },
  { code: "217", name: "Helsingør", slug: "helsingor" },
  { code: "219", name: "Hillerød", slug: "hillerod" },
  { code: "223", name: "Hørsholm", slug: "horsholm" },
  { code: "230", name: "Rudersdal", slug: "rudersdal" },
  { code: "240", name: "Egedal", slug: "egedal" },
  { code: "250", name: "Frederikssund", slug: "frederikssund" },
  { code: "253", name: "Greve", slug: "greve" },
  { code: "259", name: "Køge", slug: "koge" },
  { code: "260", name: "Halsnæs", slug: "halsnaes" },
  { code: "265", name: "Roskilde", slug: "roskilde" },
  { code: "269", name: "Solrød", slug: "solrod" },
  { code: "270", name: "Gribskov", slug: "gribskov" },
  { code: "306", name: "Odsherred", slug: "odsherred" },
  { code: "316", name: "Holbæk", slug: "holbaek" },
  { code: "320", name: "Faxe", slug: "faxe" },
  { code: "326", name: "Kalundborg", slug: "kalundborg" },
  { code: "329", name: "Ringsted", slug: "ringsted" },
  { code: "330", name: "Slagelse", slug: "slagelse" },
  { code: "336", name: "Stevns", slug: "stevns" },
  { code: "340", name: "Sorø", slug: "soro" },
  { code: "350", name: "Lejre", slug: "lejre" },
  { code: "360", name: "Lolland", slug: "lolland" },
  { code: "370", name: "Næstved", slug: "naestved" },
  { code: "376", name: "Guldborgsund", slug: "guldborgsund" },
  { code: "390", name: "Vordingborg", slug: "vordingborg" },
  { code: "400", name: "Bornholm", slug: "bornholm" },
  { code: "410", name: "Middelfart", slug: "middelfart" },
  { code: "411", name: "Christiansø", slug: "christianso" },
  { code: "420", name: "Assens", slug: "assens" },
  { code: "430", name: "Faaborg-Midtfyn", slug: "faaborg-midtfyn" },
  { code: "440", name: "Kerteminde", slug: "kerteminde" },
  { code: "450", name: "Nyborg", slug: "nyborg" },
  { code: "461", name: "Odense", slug: "odense" },
  { code: "479", name: "Svendborg", slug: "svendborg" },
  { code: "480", name: "Nordfyns", slug: "nordfyns" },
  { code: "482", name: "Langeland", slug: "langeland" },
  { code: "492", name: "Ærø", slug: "aero" },
  { code: "510", name: "Haderslev", slug: "haderslev" },
  { code: "530", name: "Billund", slug: "billund" },
  { code: "540", name: "Sønderborg", slug: "sonderborg" },
  { code: "550", name: "Tønder", slug: "tonder" },
  { code: "561", name: "Esbjerg", slug: "esbjerg" },
  { code: "563", name: "Fanø", slug: "fano" },
  { code: "573", name: "Varde", slug: "varde" },
  { code: "575", name: "Vejen", slug: "vejen" },
  { code: "580", name: "Aabenraa", slug: "aabenraa" },
  { code: "607", name: "Fredericia", slug: "fredericia" },
  { code: "615", name: "Horsens", slug: "horsens" },
  { code: "621", name: "Kolding", slug: "kolding" },
  { code: "630", name: "Vejle", slug: "vejle" },
  { code: "657", name: "Herning", slug: "herning" },
  { code: "661", name: "Holstebro", slug: "holstebro" },
  { code: "665", name: "Lemvig", slug: "lemvig" },
  { code: "671", name: "Struer", slug: "struer" },
  { code: "706", name: "Syddjurs", slug: "syddjurs" },
  { code: "707", name: "Norddjurs", slug: "norddjurs" },
  { code: "710", name: "Favrskov", slug: "favrskov" },
  { code: "727", name: "Odder", slug: "odder" },
  { code: "730", name: "Randers", slug: "randers" },
  { code: "740", name: "Silkeborg", slug: "silkeborg" },
  { code: "741", name: "Samsø", slug: "samso" },
  { code: "746", name: "Skanderborg", slug: "skanderborg" },
  { code: "751", name: "Aarhus", slug: "aarhus" },
  { code: "756", name: "Ikast-Brande", slug: "ikast-brande" },
  { code: "760", name: "Ringkøbing-Skjern", slug: "ringkobing-skjern" },
  { code: "766", name: "Hedensted", slug: "hedensted" },
  { code: "773", name: "Morsø", slug: "morso" },
  { code: "779", name: "Skive", slug: "skive" },
  { code: "787", name: "Thisted", slug: "thisted" },
  { code: "791", name: "Viborg", slug: "viborg" },
  { code: "810", name: "Brønderslev", slug: "bronderslev" },
  { code: "813", name: "Frederikshavn", slug: "frederikshavn" },
  { code: "820", name: "Vesthimmerlands", slug: "vesthimmerlands" },
  { code: "825", name: "Læsø", slug: "laeso" },
  { code: "840", name: "Rebild", slug: "rebild" },
  { code: "846", name: "Mariagerfjord", slug: "mariagerfjord" },
  { code: "849", name: "Jammerbugt", slug: "jammerbugt" },
  { code: "851", name: "Aalborg", slug: "aalborg" },
  { code: "860", name: "Hjørring", slug: "hjorring" },
];

// Build lookup maps for efficient queries
const CODE_TO_KOMMUNE = new Map(KOMMUNER.map((k) => [k.code, k]));
const SLUG_TO_KOMMUNE = new Map(KOMMUNER.map((k) => [k.slug, k]));
const KOMMUNE_CODES = new Set(KOMMUNER.map((k) => k.code));

// Region codes (5 regions after 2007 reform)
const REGION_CODES = new Set(["081", "082", "083", "084", "085"]);

export function classifyAreaCode(code: string | null): AreaType {
  if (!code) return "NATIONAL";
  if (code === "000") return "NATIONAL";
  if (REGION_CODES.has(code)) return "REGION";
  if (KOMMUNE_CODES.has(code)) return "KOMMUNE";
  if (/^\d{2}$/.test(code)) return "LANDSDEL";
  return "OTHER";
}

export function isRealKommune(code: string | null): boolean {
  if (!code) return false;
  return KOMMUNE_CODES.has(code);
}

/**
 * Get kommune metadata by its DST code.
 * Returns null if code is not a valid kommune.
 */
export function getKommuneByCode(code: string): {
  code: string;
  name: string;
  slug: string;
} | null {
  return CODE_TO_KOMMUNE.get(code) ?? null;
}

/**
 * Get kommune metadata by its URL slug.
 * Returns null if slug is not recognized.
 */
export function getKommuneBySlug(slug: string): {
  code: string;
  name: string;
  slug: string;
} | null {
  return SLUG_TO_KOMMUNE.get(slug.toLowerCase()) ?? null;
}

/**
 * Get all kommuner sorted alphabetically.
 * Used for the kommune picker.
 */
export function getAllKommuner(): Array<{
  code: string;
  name: string;
  slug: string;
}> {
  return [...KOMMUNER].sort((a, b) =>
    a.name.localeCompare(b.name, "da-DK")
  );
}
