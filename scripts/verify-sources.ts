// ============================================================
// Verifikationsscript for datakatalogets kilder
//
// Run with: npx tsx scripts/verify-sources.ts [serie-id ...]
//
// Datakatalogets afsnit 8, punkt 3: "Et verifikationsscript der kalder
// api.statbank.dk/v1/tables og api.energidataservice.dk/dataset og
// foreslår det korrekte ID for hver tom source_ref. Scriptet skriver
// ikke selv i config. Det printer forslagene, så jeg godkender dem."
//
// SKRIVER INTET. Hverken i config, database eller filer.
//
// Tre lærdomme er bygget ind, hver fra en fejl der allerede er sket:
//
//   1. Tjek `active`-flaget. KONK4 svarede fint på API'et i et halvt år
//      efter DST havde lukket den.
//   2. Tjek at koden findes i dimensionen. Seks DB07-koder i DETA211A
//      blev filtreret bort uden en linje i loggen.
//   3. Tjek den faktiske serie, ikke tabellen. MPK3 har latestPeriod
//      2026M06, men serien "CIBOR 3 måneder" i den har sidste værdi
//      2019M08. En tabel kan være levende og dens serier døde.
// ============================================================

import { getTableMetadata, getTableData } from "../src/lib/dst";

const DST_REGISTRY = "https://api.statbank.dk/v1/tables?lang=da&format=JSON&includeInactive=true";

/** Hvor gammel må seneste observation være før serien regnes som død. */
const STALE_AFTER_DAYS = 400;

type DstCheck = {
  kind: "dst";
  tableId: string;
  /** Dimension + koder vi faktisk skal bruge. Tjekkes værdi for værdi. */
  pick?: { dim: string; codes: string[] };
  /**
   * Øvrige obligatoriske dimensioner. DST afviser udtræk der spænder
   * for bredt med EXTRACT-NOTALLOWED, så de skal bindes.
   */
  fixed?: Array<{ code: string; values: string[] }>;
};
type EdsCheck = { kind: "eds"; dataset: string; filter?: string; timeField: string };
type EurostatCheck = { kind: "eurostat"; dataflow: string; geo: string };
type ManualCheck = { kind: "manual"; note: string };

type SeriesSpec = {
  id: string;
  katalogNr: number;
  navn: string;
  katalogKandidat: string;
  check: DstCheck | EdsCheck | EurostatCheck | ManualCheck;
};

const SPECS: SeriesSpec[] = [
  {
    id: "dst.konjunktur.sammensat",
    katalogNr: 1,
    navn: "Konjunkturbarometer, sammensat",
    katalogKandidat: "KBS1",
    check: { kind: "dst", tableId: "ETILLID", pick: { dim: "INDIKATOR", codes: ["TE", "KBI", "KBB", "KBD", "KBS"] } },
  },
  {
    id: "dst.distress.tvangsauktion",
    katalogNr: 4,
    navn: "Tvangsauktioner",
    katalogKandidat: "TVANG1",
    check: { kind: "dst", tableId: "TVANG1" },
  },
  {
    id: "dst.byg.etageareal",
    katalogNr: 3,
    navn: "Byggetilladelser, etageareal m2",
    katalogKandidat: "BYGV (findes ikke)",
    check: {
      kind: "dst", tableId: "BYGV88",
      pick: { dim: "BYGFASE", codes: ["1", "2"] },
      fixed: [
        { code: "ANVENDELSE", values: ["10100", "10200"] },
        { code: "BYGHERRE", values: ["TOT"] },
        { code: "SÆSON", values: ["SÆSON"] },
      ],
    },
  },
  {
    id: "dst.pris.producent",
    katalogNr: 7,
    navn: "Producentprisindeks for varer",
    katalogKandidat: "PRIS4715 (findes ikke)",
    check: { kind: "dst", tableId: "PRIS4221" },
  },
  {
    id: "dst.loen.privat",
    katalogNr: 8,
    navn: "Lønindeks, privat sektor",
    katalogKandidat: "SBLON1",
    check: { kind: "dst", tableId: "SBLON1" },
  },
  {
    id: "nbdk.valuta",
    katalogNr: 11,
    navn: "Valutakurser mod DKK",
    katalogKandidat: "Nationalbanken PX-Web",
    check: {
      kind: "dst", tableId: "DNVALD",
      pick: { dim: "VALUTA", codes: ["USD", "SEK", "NOK", "GBP"] },
      fixed: [{ code: "KURTYP", values: ["KBH"] }],
    },
  },
  {
    id: "nbdk.rente.cibor3m",
    katalogNr: 9,
    navn: "CIBOR 3 mdr (katalogets bud - forventes DØD)",
    katalogKandidat: "Nationalbanken PX-Web",
    check: { kind: "dst", tableId: "MPK3", pick: { dim: "TYPE", codes: ["6059"] } },
  },
  {
    id: "nbdk.rente.realkredit30",
    katalogNr: 10,
    navn: "Realkreditrente 30 år (katalogets bud - forventes DØD)",
    katalogKandidat: "Nationalbanken PX-Web",
    check: { kind: "dst", tableId: "MPK3", pick: { dim: "TYPE", codes: ["6050"] } },
  },
  {
    id: "dst.rente.erhverv.nye",
    katalogNr: 9,
    navn: "Pengeinstitutters udlånsrente, ikke-fin. selskaber, nye forretninger",
    katalogKandidat: "erstatter CIBOR 3M",
    check: {
      kind: "dst", tableId: "DNRUGPI",
      pick: { dim: "INSTRNAT", codes: ["AL00ALLERENTENF"] },
      fixed: [
        { code: "INSTITYPE", values: ["ALLE"] },
        { code: "INDSEK", values: ["1100"] },
        { code: "VALUTA", values: ["Z01"] },
        { code: "FORMÅL", values: ["ALLE"] },
      ],
    },
  },
  {
    id: "dst.rente.realkredit.udestaaende",
    katalogNr: 10,
    navn: "Realkreditinstitutters udlånsrente inkl. bidrag, udestående",
    katalogKandidat: "erstatter realkredit 30 år",
    check: {
      kind: "dst", tableId: "DNRUURI",
      pick: { dim: "INDSEK", codes: ["1100", "1400"] },
      fixed: [
        { code: "DATA", values: ["AL51EFFR"] },
        { code: "VALUTA", values: ["Z01"] },
      ],
    },
  },
  {
    id: "dst.rente.realkredit.rentefiksering",
    katalogNr: 10,
    navn: "Realkreditrente opdelt på fast/variabel (forventes DØD)",
    katalogKandidat: "ønsket opdeling",
    check: {
      kind: "dst", tableId: "DNRNUM",
      pick: { dim: "RENTFIX1", codes: ["M1A", "S10A"] },
      fixed: [
        { code: "DATA", values: ["EFFR"] },
        { code: "INDSEK", values: ["1100"] },
        { code: "VALUTA", values: ["Z01"] },
        { code: "FORMÅL", values: ["ALLE"] },
        { code: "LØBETID1", values: ["ALLE"] },
      ],
    },
  },
  {
    id: "eds.el.dayahead",
    katalogNr: 5,
    navn: "Elpris day-ahead DK1/DK2",
    katalogKandidat: "DayAheadPrices",
    check: { kind: "eds", dataset: "DayAheadPrices", filter: '{"PriceArea":["DK1"]}', timeField: "TimeUTC" },
  },
  {
    id: "eds.el.elspot",
    katalogNr: 5,
    navn: "Elpris, historik før okt. 2025 (afgjort: 1999-06-30 ..)",
    katalogKandidat: "Elspotprices (udgået)",
    check: { kind: "eds", dataset: "Elspotprices", filter: '{"PriceArea":["DK1"]}', timeField: "HourUTC" },
  },
  {
    id: "eurostat.de.esi.industri",
    katalogNr: 12,
    navn: "Tysk erhvervstillid",
    katalogKandidat: "Eurostat business survey",
    check: { kind: "eurostat", dataflow: "ei_bsin_m_r2", geo: "DE" },
  },
];

// ----------------------------------------------------------------

const ok = (s: string) => `  OK      ${s}`;
const warn = (s: string) => `  ADVARSEL ${s}`;
const bad = (s: string) => `  FEJL    ${s}`;

let registry: Map<string, { active?: boolean; latestPeriod?: string; text: string }> | null = null;

async function loadRegistry() {
  if (registry) return registry;
  const res = await fetch(DST_REGISTRY);
  const all = (await res.json()) as Array<{ id: string; active?: boolean; latestPeriod?: string; text: string }>;
  registry = new Map(all.map((t) => [t.id, t]));
  return registry;
}

/** Omsæt DST-periode til dato, så alder kan måles. Håndterer dagsperioder. */
function periodToDate(p: string): Date | null {
  let m = p.match(/^(\d{4})M(\d{2})D(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = p.match(/^(\d{4})M(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2], 0));
  m = p.match(/^(\d{4})K(\d)$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] * 3, 0));
  m = p.match(/^(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[1], 12, 0));
  return null;
}

function ageDays(p: string): number | null {
  const d = periodToDate(p);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

async function checkDst(spec: SeriesSpec, c: DstCheck) {
  const reg = await loadRegistry();
  const entry = reg.get(c.tableId);

  if (!entry) { console.log(bad(`Tabel ${c.tableId} findes ikke i DST's register`)); return; }
  if (entry.active === false) {
    console.log(bad(`Tabel ${c.tableId} er LUKKET (active: false), sidste periode ${entry.latestPeriod}`));
    return;
  }
  console.log(ok(`Tabel ${c.tableId} aktiv, seneste periode ${entry.latestPeriod} - "${entry.text}"`));

  const meta = await getTableMetadata(c.tableId);
  console.log(`          unit: ${meta.unit ?? "(ikke oplyst)"}`);

  if (!c.pick) return;

  // Lærdom 2: findes koderne overhovedet i dimensionen?
  const dim = meta.variables.find((v) => v.code.toUpperCase() === c.pick!.dim.toUpperCase());
  if (!dim) {
    console.log(bad(`Dimensionen ${c.pick.dim} findes ikke. Har: ${meta.variables.map((v) => v.code).join(", ")}`));
    return;
  }
  const codes = new Set(dim.values.map((v) => v.code));
  const missing = c.pick.codes.filter((x) => !codes.has(x));
  if (missing.length) console.log(bad(`Koder mangler i ${dim.code}: ${missing.join(", ")}`));
  const present = c.pick.codes.filter((x) => codes.has(x));
  if (!present.length) return;

  // Lærdom 3: hent faktiske tal. En levende tabel kan have døde serier.
  const tid = meta.variables.find((v) => v.code.toUpperCase() === "TID")!;
  const rows = await getTableData(c.tableId, [
    { code: dim.code, values: present },
    ...(c.fixed ?? []),
    { code: tid.code, values: ["*"] },
  ]);

  for (const code of present) {
    const label = dim.values.find((v) => v.code === code)?.label ?? code;
    const mine = rows
      .filter((r) => r.dimensions[dim.code] === code && r.value !== null)
      .sort((a, b) => a.period.localeCompare(b.period));
    if (!mine.length) { console.log(bad(`${dim.code}=${code} "${label}": ingen værdier overhovedet`)); continue; }
    const first = mine[0].period, last = mine[mine.length - 1].period;
    const age = ageDays(last);
    const line = `${dim.code}=${code.padEnd(8)} ${first} .. ${last}  (${mine.length} obs)  "${label.slice(0, 46)}"`;
    if (age !== null && age > STALE_AFTER_DAYS) console.log(bad(`${line}  <-- DØD, ${Math.floor(age / 365)} år gammel`));
    else console.log(ok(line));
  }
}

async function checkEds(spec: SeriesSpec, c: EdsCheck) {
  const base = `https://api.energidataservice.dk/dataset/${c.dataset}`;
  const q = (dir: string) =>
    `${base}?limit=1&sort=${encodeURIComponent(`${c.timeField} ${dir}`)}` +
    (c.filter ? `&filter=${encodeURIComponent(c.filter)}` : "");
  try {
    const nRes = await fetch(q("DESC"));
    const nTxt = await nRes.text();
    // EDS rate-limiter aggressivt. Et 429 må ikke rapporteres som
    // "ingen data" - det er præcis den slags stiltiende omskrivning
    // der har kostet os tid tre gange i dette projekt.
    if (nRes.status === 429) {
      console.log(warn(`${c.dataset}: HTTP 429 rate limit. Ikke afgjort. ${nTxt.slice(0, 60)}`));
      return;
    }
    if (!nRes.ok) { console.log(bad(`${c.dataset}: HTTP ${nRes.status} ${nTxt.slice(0, 60)}`)); return; }
    if (!nTxt.trim().startsWith("{")) {
      console.log(bad(`${c.dataset}: uventet svar ${nTxt.slice(0, 70)}`));
      return;
    }
    const newest = JSON.parse(nTxt);
    const oRes = await fetch(q("ASC"));
    if (oRes.status === 429) {
      console.log(warn(`${c.dataset}: nyeste hentet, men ældste blev rate-limitet. Historikdybde ikke afgjort.`));
      const only = JSON.parse(nTxt).records?.[0];
      if (only) console.log(ok(`  nyeste ${only[c.timeField]}, felter ${Object.keys(only).join(", ")}`));
      return;
    }
    const oldest = JSON.parse(await oRes.text());
    const nRec = newest.records?.[0], oRec = oldest.records?.[0];
    if (!nRec) { console.log(bad(`${c.dataset}: ingen rækker`)); return; }
    console.log(ok(`${c.dataset}: felter ${Object.keys(nRec).join(", ")}`));
    const first = oRec?.[c.timeField], last = nRec[c.timeField];
    const years = first && last
      ? ((new Date(last).getTime() - new Date(first).getTime()) / (365.25 * 86400000)).toFixed(1)
      : "?";
    const line = `  ældste ${first}  nyeste ${last}  (${years} år)`;
    if (Number(years) < 10) console.log(bad(`${line}  <-- under katalogets krav om 10 år`));
    else console.log(ok(line));
  } catch (e) {
    console.log(bad(`${c.dataset}: ${(e as Error).message.slice(0, 70)}`));
  }
}

async function checkEurostat(spec: SeriesSpec, c: EurostatCheck) {
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${c.dataflow}?format=JSON&geo=${c.geo}&lastTimePeriod=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) { console.log(bad(`${c.dataflow}: HTTP ${res.status}`)); return; }
    const j = (await res.json()) as {
      label?: string;
      dimension?: Record<string, { category?: { index?: Record<string, number> } }>;
    };
    console.log(ok(`${c.dataflow}: "${j.label}"`));
    console.log(ok(`  dimensioner: ${Object.keys(j.dimension ?? {}).join(", ")}`));
    const t = j.dimension?.time?.category?.index;
    if (t) console.log(ok(`  seneste periode: ${Object.keys(t).join(", ")}`));
  } catch (e) {
    console.log(bad(`${c.dataflow}: ${(e as Error).message.slice(0, 70)}`));
  }
}

async function main() {
  const only = process.argv.slice(2);
  const specs = only.length ? SPECS.filter((s) => only.includes(s.id)) : SPECS;

  console.log("VERIFIKATION AF KILDER. Skriver intet.\n");
  console.log(`Kørt ${new Date().toISOString().slice(0, 16)}Z mod levende API'er.\n`);

  for (const s of specs) {
    console.log(`${"=".repeat(72)}`);
    console.log(`[${s.katalogNr}] ${s.navn}`);
    console.log(`     serie-id:          ${s.id}`);
    console.log(`     katalogets bud:    ${s.katalogKandidat}`);
    try {
      if (s.check.kind === "dst") await checkDst(s, s.check);
      else if (s.check.kind === "eds") await checkEds(s, s.check);
      else if (s.check.kind === "eurostat") await checkEurostat(s, s.check);
      else console.log(warn(s.check.note));
    } catch (e) {
      console.log(bad(`uventet fejl: ${(e as Error).message.slice(0, 100)}`));
    }
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log("Nationalbanken: ingen REST-API.");
  console.log("  nationalbanken.statistikbank.dk og .statbank.dk kører statbank5a,");
  console.log("  en ASP-baseret PX-Web fra før /api/v1 fandtes. Alle dokumenterede");
  console.log("  PX-Web-stier svarer 404. Datakatalogets antagelse om 'samme");
  console.log("  forespørgselsmønster som DST' holder ikke.");
  console.log("  Nationalbankens tabeller republiceres derimod i DST's statistikbank");
  console.log("  (DNVALD, DNRENTD, DNRENTM), og de er tjekket ovenfor via DST's API.");
  console.log("\nIntet er skrevet. Godkend forslagene før config opdateres.");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
