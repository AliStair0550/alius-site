// ============================================================
// Henter regnskaber fra Erhvervsstyrelsens offentlige arkiv
//
// distribution.virk.dk/offentliggoerelser er en åben Elasticsearch uden
// nøgle. Undersøgt 22. oktober 2026: de børsnoterede selskaber indleverer
// års-, halvårs- og delårsrapporter som ESEF-XBRL (dokumentType *_ESEF),
// typisk dage til uger efter børsmeddelelsen.
//
// Filerne leveres gzip-komprimerede, nogle gange uden at sige det i
// hovedet. De pakkes ud her, så læseren kun ser XML.
//
// Henter kun. Skriver intet.
// ============================================================

import { gunzipSync } from "node:zlib";
import { BRUGERAGENT } from "../agenter/kilder/typer";

const SOEG = "http://distribution.virk.dk/offentliggoerelser/_search";

export type Indlevering = {
  cvr: string;
  sagsNummer: string;
  offentliggjort: string; // ISO
  periodeStart: string;
  periodeSlut: string;
  /** AARSRAPPORT, HALVAARSRAPPORT eller DELAARSRAPPORT. */
  slags: string;
  /** XBRL-instansen. null når indleveringen ikke har en ESEF-instans. */
  esefUrl: string | null;
};

type Hit = {
  _source: {
    cvrNummer: number;
    sagsNummer: string;
    offentliggoerelsestype: string;
    offentliggoerelsesTidspunkt: string;
    regnskab?: { regnskabsperiode?: { startDato: string; slutDato: string } };
    dokumenter?: { dokumentUrl: string; dokumentMimeType: string; dokumentType: string }[];
  };
};

/** Indleveringer for ét CVR offentliggjort fra og med `fra`, nyeste først. */
export async function hentIndleveringer(cvr: string, fra: string): Promise<Indlevering[]> {
  const res = await fetch(SOEG, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": BRUGERAGENT },
    body: JSON.stringify({
      size: 50,
      query: { bool: { must: [{ term: { cvrNummer: Number(cvr) } }, { range: { offentliggoerelsesTidspunkt: { gte: fra } } }] } },
      sort: [{ offentliggoerelsesTidspunkt: "desc" }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Erhvervsstyrelsen svarede ${res.status} for CVR ${cvr}`);
  const j = (await res.json()) as { hits?: { hits: Hit[] } };
  if (!j.hits) throw new Error(`Erhvervsstyrelsen svarede uden hits for CVR ${cvr}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.hits.hits
    .filter((h) => h._source.offentliggoerelsestype === "regnskab" && h._source.regnskab?.regnskabsperiode)
    .map((h) => {
      const s = h._source;
      const docs = s.dokumenter ?? [];
      const esef = docs.find((d) => d.dokumentType.endsWith("_ESEF") && d.dokumentMimeType === "application/xml");
      const slags = docs.find((d) => /^(AARS|HALVAARS|DELAARS)RAPPORT$/.test(d.dokumentType))?.dokumentType ?? esef?.dokumentType.replace(/_ESEF$/, "") ?? "UKENDT";
      return {
        cvr,
        sagsNummer: s.sagsNummer,
        offentliggjort: s.offentliggoerelsesTidspunkt,
        periodeStart: s.regnskab!.regnskabsperiode!.startDato,
        periodeSlut: s.regnskab!.regnskabsperiode!.slutDato,
        slags,
        esefUrl: esef?.dokumentUrl ?? null,
      };
    });
}

/** XBRL-instansen som tekst, pakket ud hvis den er komprimeret. */
export async function hentXbrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": BRUGERAGENT }, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Regnskabsfilen svarede ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const raa = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return raa.toString("utf-8");
}
