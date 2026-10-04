/**
 * PRD refs: FR-WDG-005..008, analytics hooks (map_clicked, rsvp_submitted, music_played).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ANALYTICS_DOM_EVENT, type AnalyticsDetail } from "@/features/analytics/track";
import {
  GalleryWidget,
  GiftWidget,
  MapWidget,
  MusicWidget,
  PublicContextProvider,
  RsvpWidget,
  WidgetRuntime,
} from "@/features/widgets/runtime";

function collectEvents(): { events: AnalyticsDetail[]; stop: () => void } {
  const events: AnalyticsDetail[] = [];
  const handler = (e: Event) => events.push((e as CustomEvent<AnalyticsDetail>).detail);
  window.addEventListener(ANALYTICS_DOM_EVENT, handler);
  return { events, stop: () => window.removeEventListener(ANALYTICS_DOM_EVENT, handler) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RsvpWidget", () => {
  const ctx = { slug: "demo-1", guestToken: "tok", guestName: "Wulan" };

  it("submits to the public API with slug+token and tracks rsvp_submitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, status: "created" }));
    vi.stubGlobal("fetch", fetchMock);
    const { events, stop } = collectEvents();
    render(
      <PublicContextProvider value={ctx}>
        <RsvpWidget title="RSVP" />
      </PublicContextProvider>,
    );
    fireEvent.change(screen.getByLabelText("Jumlah tamu"), { target: { value: "3" } });
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    await waitFor(() => expect(screen.getByTestId("rsvp-done")).toBeInTheDocument());
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      slug: "demo-1",
      guestToken: "tok",
      response: "attending",
      partySize: 3,
    });
    expect(events.map((e) => e.event)).toEqual(["rsvp_submitted"]);
    stop();
  });

  it("shows a generic error from the API without leaking internals", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ error: "Undangan tidak tersedia." }, { status: 404 })),
    );
    render(
      <PublicContextProvider value={{ slug: "x" }}>
        <RsvpWidget />
      </PublicContextProvider>,
    );
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Budi" } });
    fireEvent.click(screen.getByTestId("rsvp-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Undangan tidak tersedia.");
  });

  it("never submits in preview (no public context)", () => {
    render(<RsvpWidget />);
    expect(screen.getByTestId("rsvp-submit")).toBeDisabled();
  });

  it("is closed after the deadline", () => {
    render(
      <PublicContextProvider value={ctx}>
        <RsvpWidget deadline={{ local: "2020-01-01T10:00", timeZone: "UTC" }} />
      </PublicContextProvider>,
    );
    expect(screen.getByTestId("rsvp-closed")).toBeInTheDocument();
  });
});

describe("GalleryWidget", () => {
  const items = [
    { src: "https://example.com/a.jpg", alt: "A" },
    { assetId: "11111111-1111-4111-8111-111111111111", alt: "B" },
    { src: "javascript:alert(1)", alt: "evil" },
  ];

  it("renders a lazy grid and drops unsafe sources", () => {
    const { container } = render(<GalleryWidget items={items} layout="grid" />);
    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    imgs.forEach((img) => expect(img).toHaveAttribute("loading", "lazy"));
    expect(imgs[1]).toHaveAttribute("src", "/api/assets/11111111-1111-4111-8111-111111111111/file");
  });

  it("slider supports buttons and keyboard arrows", () => {
    render(<GalleryWidget items={items} layout="slider" />);
    expect(screen.getByTestId("gallery-position")).toHaveTextContent("1 / 2");
    fireEvent.click(screen.getByRole("button", { name: "Foto berikutnya" }));
    expect(screen.getByTestId("gallery-position")).toHaveTextContent("2 / 2");
    fireEvent.keyDown(screen.getByTestId("gallery-slider"), { key: "ArrowLeft" });
    expect(screen.getByTestId("gallery-position")).toHaveTextContent("1 / 2");
  });
});

describe("MusicWidget", () => {
  it("always renders the toggle and survives a failing play()", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("blocked"));
    render(<MusicWidget src="https://example.com/a.mp3" title="Lagu" />);
    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("preload", "none");
    fireEvent.click(screen.getByTestId("music-toggle"));
    expect(await screen.findByTestId("music-failed")).toBeInTheDocument();
    expect(screen.getByTestId("music-toggle")).toBeEnabled();
  });

  it("tracks music_played on success and toggles pause", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const { events, stop } = collectEvents();
    render(<MusicWidget src="https://example.com/a.mp3" />);
    fireEvent.click(screen.getByTestId("music-toggle"));
    await waitFor(() =>
      expect(screen.getByTestId("music-toggle")).toHaveAttribute("aria-pressed", "true"),
    );
    expect(events.map((e) => e.event)).toEqual(["music_played"]);
    fireEvent.click(screen.getByTestId("music-toggle"));
    expect(screen.getByTestId("music-toggle")).toHaveAttribute("aria-pressed", "false");
    stop();
  });

  it("disables the toggle without a safe source", () => {
    render(<MusicWidget src="javascript:alert(1)" />);
    expect(screen.getByTestId("music-toggle")).toBeDisabled();
  });
});

describe("GiftWidget", () => {
  const accounts = [{ bank: "BCA", accountNumber: "1234567890", accountName: "Budi" }];

  it("copies the account number with visible feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<GiftWidget accounts={accounts} />);
    fireEvent.click(screen.getByRole("button", { name: /Salin nomor BCA/ }));
    await waitFor(() => expect(screen.getByTestId("gift-feedback")).toHaveTextContent("tersalin"));
    expect(writeText).toHaveBeenCalledWith("1234567890");
  });

  it("reports failure instead of throwing when copy is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = vi.fn().mockReturnValue(false);
    render(<GiftWidget accounts={accounts} />);
    fireEvent.click(screen.getByRole("button", { name: /Salin nomor/ }));
    await waitFor(() => expect(screen.getByTestId("gift-feedback")).toHaveTextContent("Gagal"));
  });
});

describe("MapWidget analytics & preview", () => {
  it("tracks map_clicked and renders iframe embed preview", () => {
    const { events, stop } = collectEvents();
    const { container } = render(<MapWidget coordinate={{ lat: -6.2, lng: 106.8 }} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "https://maps.google.com/maps?q=-6.2,106.8&hl=id&z=15&output=embed");
    fireEvent.click(screen.getByTestId("map-link"));
    expect(events.map((e) => e.event)).toEqual(["map_clicked"]);
    stop();
  });

  it("renders placeholder when coordinate is not provided", () => {
    const { container } = render(<MapWidget />);
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByTestId("map-link-disabled")).toBeInTheDocument();
  });
});

describe("registry-driven rendering", () => {
  it("renders every P1 type through WidgetRuntime without template-specific code", () => {
    for (const type of ["rsvp", "gallery", "music", "gift"]) {
      const { container, unmount } = render(<WidgetRuntime widgetType={type} props={{}} />);
      expect(container.querySelector(`[data-widget="${type}"]`)).not.toBeNull();
      unmount();
    }
  });
});
