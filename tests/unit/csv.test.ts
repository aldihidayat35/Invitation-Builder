/**
 * PRD refs: FR-GST-001 (CSV import: parse, mapping, duplicates, summary).
 */
import { IMPORT_MAX_ROWS, parseCsv, planGuestImport } from "@/features/invitations/csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and BOM", () => {
    const rows = parseCsv('\uFEFFnama,jumlah\r\n"Budi, S.",2\r\n"Ani ""A""",1\r\n');
    expect(rows).toEqual([
      ["nama", "jumlah"],
      ["Budi, S.", "2"],
      ['Ani "A"', "1"],
    ]);
  });

  it("detects semicolon and tab delimiters and skips blank lines", () => {
    expect(parseCsv("nama;jumlah\n\nBudi;2")).toEqual([
      ["nama", "jumlah"],
      ["Budi", "2"],
    ]);
    expect(parseCsv("nama\tjumlah\nBudi\t2")[1]).toEqual(["Budi", "2"]);
  });
});

describe("planGuestImport", () => {
  it("auto-maps header columns and reports ok/duplicate/invalid rows", () => {
    const plan = planGuestImport(
      "Nama Tamu,Jumlah\nBudi,2\nbudi,1\nWulan,abc\n,1\nSari,21\nDewi,3\nExisting,1",
      ["existing"],
    );
    expect(plan.hasHeader).toBe(true);
    expect(plan.mapping).toEqual({ nameColumn: 0, maxPartyColumn: 1 });
    expect(plan.rows.map((r) => r.status)).toEqual([
      "ok",
      "duplicate",
      "invalid",
      "invalid",
      "invalid",
      "ok",
      "duplicate",
    ]);
    expect(plan.summary).toEqual({ total: 7, ok: 2, duplicate: 2, invalid: 3 });
    expect(plan.rows[0]).toMatchObject({ line: 2, name: "Budi", maxParty: 2 });
  });

  it("works without a header (first column = name, numeric second = party)", () => {
    const plan = planGuestImport("Budi,2\nWulan,1");
    expect(plan.hasHeader).toBe(false);
    expect(plan.rows.map((r) => [r.name, r.maxParty])).toEqual([
      ["Budi", 2],
      ["Wulan", 1],
    ]);
  });

  it("rejects empty, header-only and oversized files", () => {
    expect(planGuestImport("   ").fatal).toBeDefined();
    expect(planGuestImport("nama,jumlah").fatal).toBeDefined();
    const many = ["nama", ...Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `G${i}`)].join(
      "\n",
    );
    expect(planGuestImport(many).fatal).toMatch(/Terlalu banyak/);
  });
});
