/**
 * Pure guest CSV parsing/planning (FR-GST-001). No DB, no React: safe for
 * unit tests and reuse. Handles quoted fields, escaped quotes, CRLF and
 * comma/semicolon/tab delimiters.
 */
export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 200 * 1024;
export const GUEST_NAME_MAX = 120;

function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      best = c;
      bestCount = count;
    }
  }
  return best;
}

/** RFC-4180-ish parser. Returns rows of cells; blank lines are skipped. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) endCell();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (text[i + 1] !== "\n") endRow();
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

const NAME_HEADERS = new Set(["name", "nama", "nama tamu", "guest", "guest name", "tamu"]);
const PARTY_HEADERS = new Set([
  "maxparty",
  "max party",
  "maks",
  "maks orang",
  "jumlah",
  "jumlah tamu",
  "party",
  "pax",
]);

export interface ColumnMapping {
  readonly nameColumn: number;
  readonly maxPartyColumn?: number;
}

export interface ImportRowResult {
  /** 1-based line number in the (non-blank) CSV rows, for error reporting. */
  readonly line: number;
  readonly name: string;
  readonly maxParty: number;
  readonly status: "ok" | "duplicate" | "invalid";
  readonly reason?: string;
}

export interface ImportPlan {
  readonly headers: readonly string[];
  readonly hasHeader: boolean;
  readonly mapping: ColumnMapping;
  readonly rows: readonly ImportRowResult[];
  readonly summary: {
    readonly total: number;
    readonly ok: number;
    readonly duplicate: number;
    readonly invalid: number;
  };
  /** Set when the whole file was rejected (empty, too large, too many rows). */
  readonly fatal?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

function fatalPlan(message: string): ImportPlan {
  return {
    headers: [],
    hasHeader: false,
    mapping: { nameColumn: 0 },
    rows: [],
    summary: { total: 0, ok: 0, duplicate: 0, invalid: 0 },
    fatal: message,
  };
}

/** Auto-detects the header + mapping unless `override` is given, then validates every row. */
export function planGuestImport(
  csv: string,
  existingNames: Iterable<string> = [],
  override?: ColumnMapping,
): ImportPlan {
  if (new TextEncoder().encode(csv).length > IMPORT_MAX_BYTES) {
    return fatalPlan("File terlalu besar (maks. 200 KB).");
  }
  const table = parseCsv(csv);
  if (table.length === 0) return fatalPlan("File kosong.");

  const first = table[0]!;
  const nameIdx = first.findIndex((h) => NAME_HEADERS.has(norm(h)));
  const partyIdx = first.findIndex((h) => PARTY_HEADERS.has(norm(h)));
  const hasHeader = nameIdx >= 0;
  const mapping: ColumnMapping =
    override ??
    (hasHeader
      ? { nameColumn: nameIdx, ...(partyIdx >= 0 && { maxPartyColumn: partyIdx }) }
      : { nameColumn: 0, ...(first.length > 1 && /^\d+$/.test(first[1]!.trim()) && { maxPartyColumn: 1 }) });

  const dataRows = hasHeader ? table.slice(1) : table;
  if (dataRows.length === 0) return fatalPlan("Tidak ada baris data.");
  if (dataRows.length > IMPORT_MAX_ROWS) {
    return fatalPlan(`Terlalu banyak baris (maks. ${IMPORT_MAX_ROWS}).`);
  }

  const seen = new Set<string>([...existingNames].map(norm));
  const offset = hasHeader ? 2 : 1;
  const rows: ImportRowResult[] = dataRows.map((cells, i) => {
    const line = i + offset;
    const name = (cells[mapping.nameColumn] ?? "").trim().replace(/\s+/g, " ");
    const partyRaw =
      mapping.maxPartyColumn === undefined ? "" : (cells[mapping.maxPartyColumn] ?? "").trim();
    if (name === "") return { line, name, maxParty: 1, status: "invalid", reason: "Nama kosong." };
    if (name.length > GUEST_NAME_MAX) {
      return { line, name, maxParty: 1, status: "invalid", reason: `Nama lebih dari ${GUEST_NAME_MAX} karakter.` };
    }
    let maxParty = 1;
    if (partyRaw !== "") {
      const n = Number(partyRaw);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return { line, name, maxParty: 1, status: "invalid", reason: "Jumlah tamu harus 1-20." };
      }
      maxParty = n;
    }
    const key = norm(name);
    if (seen.has(key)) {
      return { line, name, maxParty, status: "duplicate", reason: "Nama sudah ada." };
    }
    seen.add(key);
    return { line, name, maxParty, status: "ok" };
  });

  const count = (s: ImportRowResult["status"]) => rows.filter((r) => r.status === s).length;
  return {
    headers: hasHeader ? first : [],
    hasHeader,
    mapping,
    rows,
    summary: {
      total: rows.length,
      ok: count("ok"),
      duplicate: count("duplicate"),
      invalid: count("invalid"),
    },
  };
}
