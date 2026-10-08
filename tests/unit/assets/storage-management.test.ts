import { describe, expect, it } from "vitest";
import { formatBytes, getStorageLimitBytes, getStorageLimitMb } from "@/features/assets/config";

describe("Storage Configuration and Helpers", () => {
  it("computes default storage limit in MB and Bytes", () => {
    const mb = getStorageLimitMb();
    expect(mb).toBeGreaterThan(0);
    const bytes = getStorageLimitBytes();
    expect(bytes).toBe(mb * 1024 * 1024);
  });

  it("formats bytes correctly across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(15 * 1024 * 1024)).toBe("15 MB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2 GB");
  });
});
