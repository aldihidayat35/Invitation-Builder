/**
 * Component tests for Opening Screen (Cover Buka Undangan) and its 5 templates:
 * 1. royal-envelope
 * 2. modern-editorial
 * 3. luxury-arch
 * 4. botanical-watercolor
 * 5. cinematic-glass
 */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { canonicalDocumentSchema, type CanonicalDocument, type OpeningTemplate } from "@/lib/schema";
import { resolveDocument } from "@/lib/engine";
import { DocumentRenderer } from "@/features/renderer";
import { PublicContextProvider } from "@/features/widgets/runtime";
import { OpeningScreen } from "@/features/renderer/components/opening/OpeningScreen";
import { OpeningScreenControl } from "@/features/editor/components/OpeningScreenControl";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";

function makeDocWithOpening(template: OpeningTemplate = "royal-envelope", enabled = true): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    design: {
      tokens: {
        colors: { primary: "#e85d8f", background: "#fcfaf7" },
        fonts: { body: "Plus Jakarta Sans" },
      },
      opening: {
        enabled,
        template,
        title: "The Wedding Of",
        subtitle: "Walimatul 'Urs",
        coupleName: "Anindya & Raka",
        dateText: "Sabtu, 24 Oktober 2026",
        locationText: "Hotel Mulia, Jakarta",
        guestLabel: "Kepada Yth. Bapak/Ibu/Saudara/i:",
        buttonText: "Buka Undangan",
        overlayOpacity: 0.4,
      },
    },
    variables: [],
    sections: [
      {
        id: "sec_1",
        name: "Cover",
        baseHeight: 844,
        overflow: "hidden",
        visible: true,
        background: { color: "#ffffff" },
        elements: [
          {
            id: "el_text_1",
            type: "text",
            frame: { x: 20, y: 30, w: 200, h: 40, rotation: 0 },
            visible: true,
            locked: false,
            content: { segments: [{ text: "Selamat Datang di Resepsi" }] },
            style: {
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.4,
              letterSpacing: 0,
              textAlign: "center",
              color: "#000000",
              opacity: 1,
            },
          },
        ],
      },
    ],
  });
}

describe("Opening Screen Templates", () => {
  it("renders 1. royal-envelope template with wax seal and card", () => {
    const doc = makeDocWithOpening("royal-envelope");
    const resolved = resolveDocument(doc, {}, { name: "Bapak Joko & Keluarga" });

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Bapak Joko & Keluarga" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.getByTestId("opening-template-royal-envelope")).toBeInTheDocument();
    expect(screen.getByText("Anindya & Raka")).toBeInTheDocument();
    expect(screen.getByTestId("opening-guest-name")).toHaveTextContent("Bapak Joko & Keluarga");
    expect(screen.getByTestId("opening-open-btn")).toHaveTextContent("Buka Undangan");
  });

  it("renders 2. modern-editorial template with corner markers and issue title", () => {
    const doc = makeDocWithOpening("modern-editorial");
    const resolved = resolveDocument(doc, {}, { name: "Ibu Siti Rahma" });

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Ibu Siti Rahma" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.getByTestId("opening-template-modern-editorial")).toBeInTheDocument();
    expect(screen.getByText("INVITATION ISSUE · SPECIAL EDITION")).toBeInTheDocument();
    expect(screen.getByTestId("opening-guest-name")).toHaveTextContent("Ibu Siti Rahma");
  });

  it("renders 3. luxury-arch template with royal crest and gold styling", () => {
    const doc = makeDocWithOpening("luxury-arch");
    const resolved = resolveDocument(doc, {}, { name: "Prof. Dr. Hendra" });

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Prof. Dr. Hendra" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.getByTestId("opening-template-luxury-arch")).toBeInTheDocument();
    expect(screen.getByText("Tamu Kehormatan")).toBeInTheDocument();
    expect(screen.getByTestId("opening-guest-name")).toHaveTextContent("Prof. Dr. Hendra");
  });

  it("renders 4. botanical-watercolor template with floating petals and foliage", () => {
    const doc = makeDocWithOpening("botanical-watercolor");
    const resolved = resolveDocument(doc, {}, { name: "Sahabat Tercinta" });

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Sahabat Tercinta" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.getByTestId("opening-template-botanical-watercolor")).toBeInTheDocument();
    expect(screen.getByTestId("opening-guest-name")).toHaveTextContent("Sahabat Tercinta");
  });

  it("renders 5. cinematic-glass template with frosted glass card and aurora mesh", () => {
    const doc = makeDocWithOpening("cinematic-glass");
    const resolved = resolveDocument(doc, {}, { name: "Keluarga Besar Hartono" });

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Keluarga Besar Hartono" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.getByTestId("opening-template-cinematic-glass")).toBeInTheDocument();
    expect(screen.getByTestId("opening-guest-name")).toHaveTextContent("Keluarga Besar Hartono");
  });

  it("clicking Buka Undangan triggers exit animation, audio gesture dispatch, and reveals sections", async () => {
    vi.useFakeTimers();
    const doc = makeDocWithOpening("royal-envelope");
    const resolved = resolveDocument(doc, {}, { name: "Tamu Kehormatan" });

    const openListener = vi.fn();
    window.addEventListener("dib:open-invitation", openListener);

    render(
      <PublicContextProvider value={{ slug: "test-slug", guestName: "Tamu Kehormatan" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    const openBtn = screen.getByTestId("opening-open-btn");
    expect(openBtn).toBeInTheDocument();

    // Click Buka Undangan
    act(() => {
      fireEvent.click(openBtn);
    });

    expect(openListener).toHaveBeenCalledTimes(1);

    // Fast-forward exit transition timer
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Opening screen overlay should now be dismissed
    expect(screen.queryByTestId("opening-screen")).toBeNull();
    // Section content should now be directly accessible
    expect(screen.getByText("Selamat Datang di Resepsi")).toBeInTheDocument();

    window.removeEventListener("dib:open-invitation", openListener);
    vi.useRealTimers();
  });

  it("does not render opening screen when opening is disabled or undefined", () => {
    const doc = makeDocWithOpening("royal-envelope", false);
    const resolved = resolveDocument(doc);

    render(
      <PublicContextProvider value={{ slug: "test-slug" }}>
        <DocumentRenderer document={resolved} runtimeMode="public" />
      </PublicContextProvider>,
    );

    expect(screen.queryByTestId("opening-screen")).toBeNull();
    expect(screen.getByText("Selamat Datang di Resepsi")).toBeInTheDocument();
  });
});

describe("OpeningScreenControl Inspector Integration", () => {
  it("allows toggling opening screen and selecting templates", () => {
    const doc = makeDocWithOpening("royal-envelope", false);
    const store = createEditorStore({ document: doc, revision: 1 });

    render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <OpeningScreenControl />
      </EditorProvider>,
    );

    const toggle = screen.getByTestId("opening-toggle-enabled") as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    // Enable opening screen
    fireEvent.click(toggle);
    expect(store.getState().history.present.design.opening?.enabled).toBe(true);

    // Select cinematic-glass template
    const glassTplBtn = screen.getByTestId("opening-tpl-select-cinematic-glass");
    fireEvent.click(glassTplBtn);
    expect(store.getState().history.present.design.opening?.template).toBe("cinematic-glass");

    // Edit Title
    const titleInput = screen.getByTestId("opening-input-title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Walimatul 'Urs" } });
    expect(store.getState().history.present.design.opening?.title).toBe("Walimatul 'Urs");
  });
});
