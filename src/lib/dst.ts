// DST (Danmarks Statistik) API client
// API documentation: https://api.statbank.dk/v1/

const BASE_URL = "https://api.statbank.dk/v1";

function authHeaders(): Record<string, string> {
  const key = process.env.DST_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

// ============================================================
// Public types
// ============================================================

export type DSTFilter = {
  code: string;
  values: string[];
};

export type DSTVariable = {
  code: string;
  label: string;
  values: { code: string; label: string }[];
};

export type DSTMetadata = {
  tableId: string;
  label: string;
  description: string;
  lastUpdated: string;
  unit?: string;
  variables: DSTVariable[];
  // Raw DST fields mirrored for scripts that prefer the original names
  text: string;      // alias for label
  updated: string;   // alias for lastUpdated
};

export type DSTDataPoint = {
  period: string;       // e.g. "2026M03"
  periodDate: Date;     // first day of the period
  dimensions: Record<string, string>; // non-time dimensions (code → code)
  value: number | null;
  status?: string;
};

// ============================================================
// Public API
// ============================================================

export async function getTableMetadata(tableId: string): Promise<DSTMetadata> {
  const url = `${BASE_URL}/tableinfo/${tableId}?lang=da&format=JSON`;
  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) {
    throw new Error(`Failed to fetch metadata for ${tableId}: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Record<string, unknown>;

  const label = String(data.text ?? "");
  const lastUpdated = String(data.updated ?? "");

  return {
    tableId: String(data.id ?? tableId),
    label,
    description: String(data.description ?? ""),
    lastUpdated,
    unit: data.unit ? String(data.unit) : undefined,
    // Aliases so scripts can use either naming convention
    text: label,
    updated: lastUpdated,
    variables: ((data.variables ?? []) as Record<string, unknown>[]).map((v) => ({
      code: String(v.id ?? ""),
      label: String(v.text ?? ""),
      values: ((v.values ?? []) as Record<string, unknown>[]).map((val) => ({
        code: String(val.id ?? ""),
        label: String(val.text ?? ""),
      })),
    })),
  };
}

export async function getTableLastUpdated(tableId: string): Promise<string> {
  const meta = await getTableMetadata(tableId);
  return meta.lastUpdated;
}

export async function getTableData(
  tableId: string,
  filters: DSTFilter[]
): Promise<DSTDataPoint[]> {
  const res = await fetch(`${BASE_URL}/data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      table: tableId,
      format: "JSONSTAT",
      lang: "da",
      valuePresentation: "Value",
      variables: filters,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch data for ${tableId}: ${res.status} — ${text.slice(0, 300)}`);
  }

  const raw = await res.json();
  return parseJsonStat(raw);
}

// ============================================================
// JSON-STAT parser
// ============================================================
// DST returns JSON-STAT 1.0: id/size live inside dataset.dimension,
// not at dataset level. There is also an injected "ContentsCode"
// measure-dimension that we strip from the output.

function parseJsonStat(root: unknown): DSTDataPoint[] {
  const raw = root as Record<string, unknown>;
  const ds = (raw.dataset ?? raw) as Record<string, unknown>;

  // In JSON-STAT 1.0 (DST), id/size are keys inside dataset.dimension
  const dimContainer = ds.dimension as Record<string, unknown>;

  const ids = (
    Array.isArray(ds.id) ? ds.id :
    Array.isArray(dimContainer?.id) ? dimContainer.id : []
  ) as string[];

  const sizes = (
    Array.isArray(ds.size) ? ds.size :
    Array.isArray(dimContainer?.size) ? dimContainer.size : []
  ) as number[];

  const values = ds.value as (number | null)[];
  const statusRaw = ds.status as Record<string, string> | (string | null)[] | null;

  // Dimension definitions sit inside dataset.dimension[dimId]
  const dimDefs = dimContainer;

  // DST injects "ContentsCode" as a synthetic measure dimension — skip it in output
  const SKIP_DIMS = new Set(["ContentsCode"]);

  // Build position → code arrays for each dimension
  const posToCode: string[][] = ids.map((dimId, d) => {
    const dim = dimDefs[dimId] as Record<string, unknown> | undefined;
    if (!dim) return new Array<string>(sizes[d]).fill("");
    const category = dim.category as Record<string, unknown>;
    const index = category.index as Record<string, number>;
    const codes = new Array<string>(sizes[d]);
    for (const [code, pos] of Object.entries(index)) {
      codes[pos] = code;
    }
    return codes;
  });

  // Strides for flat-array indexing (row-major order)
  const strides = new Array<number>(ids.length);
  strides[ids.length - 1] = 1;
  for (let d = ids.length - 2; d >= 0; d--) {
    strides[d] = strides[d + 1] * sizes[d + 1];
  }

  const timeDimIdx = ids.findIndex((id) => id.toLowerCase() === "tid");

  const result: DSTDataPoint[] = [];

  for (let i = 0; i < values.length; i++) {
    // Decode multi-dimensional index from flat index
    const dimIndices: number[] = new Array(ids.length);
    let rem = i;
    for (let d = 0; d < ids.length; d++) {
      dimIndices[d] = Math.floor(rem / strides[d]);
      rem %= strides[d];
    }

    let period = "";
    const dimensions: Record<string, string> = {};

    for (let d = 0; d < ids.length; d++) {
      const dimId = ids[d];
      const code = posToCode[d][dimIndices[d]];
      if (d === timeDimIdx) {
        period = code;
      } else if (!SKIP_DIMS.has(dimId)) {
        dimensions[dimId] = code;
      }
    }

    const rawValue = values[i];
    const status = resolveStatus(statusRaw, i);

    result.push({
      period,
      periodDate: parsePeriodDate(period),
      dimensions,
      value: rawValue != null ? Number(rawValue) : null,
      status: status ?? undefined,
    });
  }

  return result;
}

function resolveStatus(
  status: Record<string, string> | (string | null)[] | null | undefined,
  index: number
): string | null {
  if (!status) return null;
  if (Array.isArray(status)) return status[index] ?? null;
  return status[String(index)] ?? null;
}

// ============================================================
// Period parsing
// ============================================================

export function parsePeriodDate(period: string): Date {
  // Monthly: "2026M03"
  const monthly = period.match(/^(\d{4})M(\d{2})$/);
  if (monthly) return new Date(`${monthly[1]}-${monthly[2]}-01T00:00:00.000Z`);

  // Quarterly: "2026K1" or "2026Q1"
  const quarterly = period.match(/^(\d{4})[KQ](\d)$/);
  if (quarterly) {
    const month = (parseInt(quarterly[2]) - 1) * 3 + 1;
    return new Date(`${quarterly[1]}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`);
  }

  // Annual: "2026"
  const annual = period.match(/^(\d{4})$/);
  if (annual) return new Date(`${annual[1]}-01-01T00:00:00.000Z`);

  // Fallback — let Date parse it
  return new Date(period);
}
