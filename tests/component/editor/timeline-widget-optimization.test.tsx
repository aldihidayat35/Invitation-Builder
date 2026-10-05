/**
 * Targeted tests for Timeline Widget Optimization (Editor Konva & Preview Runtime).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelineWidget } from "@/features/widgets/runtime/TimelineWidget";
import { estimateWidgetContentHeight } from "@/features/widgets/estimate-height";
import type { WidgetElement } from "@/lib/schema";

describe("Timeline Widget Optimization", () => {
  const sampleEvents = [
    {
      time: "08:00 - 10:00 WIB",
      title: "Akad Nikah",
      location: "Masjid Agung Al-Azhar",
      description: "Prosesi ijab kabul dan doa bersama keluarga",
      icon: "ring" as const,
    },
    {
      time: "11:00 - 13:00 WIB",
      title: "Resepsi Pernikahan",
      location: "Grand Ballroom Hotel Mulia",
      description: "Ramah tamah dan santap siang bersama para undangan",
      icon: "glass" as const,
    },
    {
      time: "19:00 - 21:00 WIB",
      title: "After Party",
      location: "Sky Lounge",
      description: "Sesi foto santai bersama sahabat tercinta",
      icon: "sparkles" as const,
    },
  ];

  it("renders vertical-centered variant with balanced spacers on both even and odd items", () => {
    const { container } = render(
      <TimelineWidget
        title="Jadwal Acara"
        subtitle="Rangkaian Prosesi Sakral"
        events={sampleEvents}
        style={{ variant: "vertical-centered" }}
      />,
    );

    expect(screen.getByText("Jadwal Acara")).toBeInTheDocument();
    expect(screen.getByText("Rangkaian Prosesi Sakral")).toBeInTheDocument();

    const items = container.querySelectorAll("[class*='timelineVerticalItem']");
    expect(items.length).toBe(3);

    // Each item has a node wrap, an item card, and a center spacer for symmetry
    items.forEach((item) => {
      const node = item.querySelector("[class*='timelineNodeWrap']");
      const card = item.querySelector("[class*='timelineItemCard']");
      const spacer = item.querySelector("[class*='timelineCenterSpacer']");

      expect(node).not.toBeNull();
      expect(card).not.toBeNull();
      expect(spacer).not.toBeNull();
    });

    // Even item has itemEven class, odd item has itemOdd class
    expect(items[0]!.className).toContain("itemEven");
    expect(items[1]!.className).toContain("itemOdd");
    expect(items[2]!.className).toContain("itemEven");
  });

  it("renders location and description clearly in preview runtime", () => {
    render(<TimelineWidget events={sampleEvents} />);

    expect(screen.getByText("Akad Nikah")).toBeInTheDocument();
    expect(screen.getByText("Masjid Agung Al-Azhar")).toBeInTheDocument();
    expect(screen.getByText("Prosesi ijab kabul dan doa bersama keluarga")).toBeInTheDocument();

    expect(screen.getByText("Resepsi Pernikahan")).toBeInTheDocument();
    expect(screen.getByText("Grand Ballroom Hotel Mulia")).toBeInTheDocument();
  });

  it("accurately estimates height for various event counts to fit editor frame", () => {
    const mockElement = (count: number): WidgetElement => ({
      id: "w_timeline_test",
      type: "widget",
      name: "Rundown",
      widgetType: "timeline",
      widgetVersion: 1,
      frame: { x: 0, y: 0, w: 326, h: 420, rotation: 0 },
      props: {
        title: "Rundown Acara",
        subtitle: "Rangkaian Acara",
        events: sampleEvents.slice(0, count),
      },
      style: { variant: "vertical-left" },
      locked: false,
      visible: true,
    });

    const h1 = estimateWidgetContentHeight(mockElement(1));
    const h3 = estimateWidgetContentHeight(mockElement(3));

    expect(h1).toBeGreaterThan(150);
    expect(h3).toBeGreaterThan(h1);
    expect(h3).toBeLessThanOrEqual(420);
  });
});
