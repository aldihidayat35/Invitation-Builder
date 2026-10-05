import { describe, expect, it } from "vitest";
import { estimateWidgetContentHeight } from "@/features/widgets";
import type { WidgetElement } from "@/lib/schema";

function createMockWidget(
  widgetType: string,
  variant = "default",
  props: Record<string, unknown> = {},
  w = 326,
  h = 300,
): WidgetElement {
  return {
    id: "w1",
    type: "widget",
    name: "Mock Widget",
    widgetType,
    widgetVersion: 1,
    frame: { x: 32, y: 100, w, h, rotation: 0 },
    visible: true,
    locked: false,
    props: props as unknown as WidgetElement["props"],
    style: { variant },
  };
}

describe("estimateWidgetContentHeight", () => {
  it("estimates height for coupleProfile widget", () => {
    const widget = createMockWidget("coupleProfile", "arch-window", {
      title: "Mempelai",
      subtitle: "Mohon doa restu",
      groom: { name: "Rama", fullName: "Rama Pratama", parents: "Bpk Bambang & Ibu Sri" },
      bride: { name: "Alya", fullName: "Alya Putri", parents: "Bpk Hendra & Ibu Ratna" },
    });
    const est = estimateWidgetContentHeight(widget);
    expect(est).toBeGreaterThan(250);
  });

  it("estimates height for timeline widget with multiple events", () => {
    const widget = createMockWidget("timeline", "classic-vertical", {
      title: "Rangkaian Acara",
      events: [
        { title: "Akad", time: "08:00" },
        { title: "Resepsi", time: "11:00" },
        { title: "Santap Siang", time: "12:00" },
      ],
    });
    const est = estimateWidgetContentHeight(widget);
    expect(est).toBeGreaterThan(200);
  });

  it("estimates height for wishes widget with allowPost form", () => {
    const widget = createMockWidget("wishes", "default", {
      title: "Ucapan & Doa",
      allowPost: true,
      items: [{ name: "Budi", message: "Selamat!" }],
    });
    const est = estimateWidgetContentHeight(widget);
    expect(est).toBeGreaterThan(250);
  });

  it("estimates height for gift widget with bank accounts", () => {
    const widget = createMockWidget("gift", "cards", {
      title: "Tanda Kasih",
      accounts: [
        { bank: "BCA", number: "123456", holder: "Rama" },
        { bank: "Mandiri", number: "654321", holder: "Alya" },
      ],
    });
    const est = estimateWidgetContentHeight(widget);
    expect(est).toBeGreaterThan(200);
  });
});
