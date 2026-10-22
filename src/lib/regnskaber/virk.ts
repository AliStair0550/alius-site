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
// HVORFOR node:http OG IKKE fetch
//
// Første kørsel i Actions, 22. oktober 2026, døde midt i Royal Unibrew:
// serveren lukkede forbindelsen under et svar, og Nodes fetch (undici)
// kastede en intern assertion uden for ethvert try. Processen stoppede,
// Netcompany blev aldrig hentet, og opsummeringen blev aldrig skrevet.
// node:http giver en almindelig fejl, som kan fanges og prøves igen.
//
// Henter kun. Skriver intet.
// ============================================================

import http from "node:http";
import https from "node:https";
import { gunzipSync } from "node:zlib";
import { BRUGERAGENT } from "../agenter/kilder/typer";

const SOEG = "http://distribution.virk.dk/offentliggoerelser/_search";
const FORSOEG = 4;

function anmod(url: string, opt: { method?: string; body?: string; timeoutMs: number }): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const modul = u.protocol === "https:" ? https : http;
    const req = modul.request(
      u,
      {
        method: opt.method ?? "GET",
        agent: false, // ingen genbrugte forbindelser; det var en genbrugt der blev lukket under os
        headers: {
          "user-agent": BRUGERAGENT,
          ...(opt.body ? { "content-type": "application/json", "content-length": Buffer.byteLength(opt.body) } : {}),
        },
        timeout: opt.timeoutMs,
      },
      (res) => {
        const dele: Buffer[] = [];
        res.on("data", (d: Buffer) => dele.push(d));
        res.on("end", () => {
          if (!res.complete) return reject(new Error(`svaret fra ${u.host} blev afbrudt undervejs`));
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(dele) });
        });
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error(`${u.host} svarede ikke inden ${opt.timeoutMs / 1000} sekunder`)));
    req.on("error", reject);
    if (opt.body) req.write(opt.body);
    req.end();
  });
}

/** Prøver igen ved netværksfejl og 5xx. En 4xx er et svar og prøves ikke igen. */
async function medGenforsoeg(url: string, opt: { method?: string; body?: string; timeoutMs: number }): Promise<Buffer> {
  let sidste: Error | null = null;
  for (let i = 1; i <= FORSOEG; i++) {
    try {
      const r = await anmod(url, opt);
      if (r.status >= 200 && r.status < 300) return r.body;
      if (r.status < 500) throw Object.assign(new Error(`${new URL(url).host} svarede ${r.status}`), { endelig: true });
      sidste = new Error(`${new URL(url).host} svarede ${r.status}`);
    } catch (e) {
      if ((e as { endelig?: boolean }).endelig) throw e;
      sidste = e as Error;
    }
    if (i < FORSOEG) await new Promise((r) => setTimeout(r, 2000 * i));
  }
  throw new Error(`${sidste?.message ?? "ukendt fejl"} (efter ${FORSOEG} forsøg)`);
}

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
  const body = JSON.stringify({
    size: 50,
    query: { bool: { must: [{ term: { cvrNummer: Number(cvr) } }, { range: { offentliggoerelsesTidspunkt: { gte: fra } } }] } },
    sort: [{ offentliggoerelsesTidspunkt: "desc" }],
  });
  const raa = await medGenforsoeg(SOEG, { method: "POST", body, timeoutMs: 30_000 });
  const j = JSON.parse(raa.toString("utf-8")) as { hits?: { hits: Hit[] } };
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
  const buf = await medGenforsoeg(url, { timeoutMs: 120_000 });
  const raa = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return raa.toString("utf-8");
}
