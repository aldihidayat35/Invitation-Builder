import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { StorageManager } from "@/features/assets/components/StorageManager";
import type { StorageAssetItem, StorageOverview } from "@/features/assets/api";

const mockOverview: StorageOverview = {
  totalBytes: 52428800, // 50 MB
  limitBytes: 524288000, // 500 MB
  usagePercent: 10,
  fileCount: 4,
  imageCount: 3,
  videoCount: 1,
  otherCount: 0,
  formattedUsed: "50 MB",
  formattedLimit: "500 MB",
};

const mockAssets: StorageAssetItem[] = [
  {
    id: "a1",
    filename: "background-wedding.jpg",
    mimeType: "image/jpeg",
    bytes: 2097152, // 2MB
    width: 1920,
    height: 1080,
    createdAt: new Date(),
    workspaceId: "ws-1",
    storageKey: "ws/ws-1/a1.jpg",
    url: "/api/assets/a1/content",
    status: "ready",
  },
  {
    id: "a2",
    filename: "ring-animation.mp4",
    mimeType: "video/mp4",
    bytes: 10485760, // 10MB
    width: 1280,
    height: 720,
    createdAt: new Date(),
    workspaceId: "ws-1",
    storageKey: "ws/ws-1/a2.mp4",
    url: "/api/assets/a2/content",
    status: "ready",
  },
];

describe("StorageManager Component", () => {
  it("renders storage KPI cards with accurate values and limits", () => {
    render(
      <StorageManager
        initialOverview={mockOverview}
        initialAssets={mockAssets}
        workspaceId="ws-1"
        isSuperAdmin={false}
        limitMb={500}
      />
    );

    expect(screen.getByText("Manajemen Storage & Galeri Media")).toBeInTheDocument();
    expect(screen.getByText("50 MB")).toBeInTheDocument();
    expect(screen.getByText("/ 500 MB")).toBeInTheDocument();
    expect(screen.getByText("10% Terpakai")).toBeInTheDocument();
    expect(screen.getByText("Foto & Gambar")).toBeInTheDocument();
    expect(screen.getByText("Video & Media")).toBeInTheDocument();
  });

  it("renders media gallery items with filenames and controls", () => {
    render(
      <StorageManager
        initialOverview={mockOverview}
        initialAssets={mockAssets}
        workspaceId="ws-1"
        isSuperAdmin={false}
        limitMb={500}
      />
    );

    expect(screen.getByText("background-wedding.jpg")).toBeInTheDocument();
    expect(screen.getByText("ring-animation.mp4")).toBeInTheDocument();
  });

  it("filters gallery items when search input changes", () => {
    render(
      <StorageManager
        initialOverview={mockOverview}
        initialAssets={mockAssets}
        workspaceId="ws-1"
        isSuperAdmin={false}
        limitMb={500}
      />
    );

    const searchInput = screen.getByPlaceholderText("Cari nama berkas...");
    fireEvent.change(searchInput, { target: { value: "wedding" } });

    expect(screen.getByText("background-wedding.jpg")).toBeInTheDocument();
    expect(screen.queryByText("ring-animation.mp4")).not.toBeInTheDocument();
  });
});
