// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadBankLogoAction } from "@/app/(dashboard)/dashboard/admin/banks/actions";
import { promises as fs } from "node:fs";

// Mock getWorkspaceContext
const mockGetWorkspaceContext = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  getWorkspaceContext: () => mockGetWorkspaceContext(),
}));

describe("uploadBankLogoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-owner users", async () => {
    mockGetWorkspaceContext.mockResolvedValueOnce({
      user: { id: "user-1", systemRole: "user" },
    });

    const fd = new FormData();
    const res = await uploadBankLogoAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Hanya Super Admin/i);
    }
  });

  it("rejects when no file is uploaded or file is empty", async () => {
    mockGetWorkspaceContext.mockResolvedValueOnce({
      user: { id: "admin-1", systemRole: "owner" },
    });

    const fd = new FormData();
    const res = await uploadBankLogoAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/tidak ditemukan atau kosong/i);
    }
  });

  it("rejects file exceeding 2MB", async () => {
    mockGetWorkspaceContext.mockResolvedValueOnce({
      user: { id: "admin-1", systemRole: "owner" },
    });

    const bigFile = new File([new ArrayBuffer(2.5 * 1024 * 1024)], "heavy.png", {
      type: "image/png",
    });
    const fd = new FormData();
    fd.append("file", bigFile);

    const res = await uploadBankLogoAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/maksimal 2MB/i);
    }
  });

  it("rejects unsupported file mime types", async () => {
    mockGetWorkspaceContext.mockResolvedValueOnce({
      user: { id: "admin-1", systemRole: "owner" },
    });

    const badFile = new File(["malicious"], "virus.exe", {
      type: "application/x-msdownload",
    });
    const fd = new FormData();
    fd.append("file", badFile);

    const res = await uploadBankLogoAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Format file tidak didukung/i);
    }
  });

  it("successfully uploads a valid SVG or PNG bank logo to public/images/banks/uploads/", async () => {
    mockGetWorkspaceContext.mockResolvedValueOnce({
      user: { id: "admin-1", systemRole: "owner" },
    });

    const svgContent = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>';
    const validFile = new File([svgContent], "bank-aceh.svg", {
      type: "image/svg+xml",
    });
    const fd = new FormData();
    fd.append("file", validFile);
    fd.append("code", "bankaceh");

    const res = await uploadBankLogoAction(fd);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.url).toMatch(/^\/images\/banks\/uploads\/bankaceh-\d+\.svg$/);
      expect(res.filename).toMatch(/^bankaceh-\d+\.svg$/);

      // Clean up the created file
      const filePath = `public${res.url}`;
      await fs.unlink(filePath).catch(() => {});
    }
  });
});

