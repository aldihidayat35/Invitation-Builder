import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublic } from "@/features/invitations/api";
import { getDemoInvitation } from "@/features/invitations/demo-catalog";
import { DocumentRenderer } from "@/features/renderer";
import { PublicContextProvider } from "@/features/widgets/runtime";

/** Live data: always read the active snapshot at request time (FR-PUB-001). */
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps<"/i/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const invitation =
    (await getPublic(slug).catch(() => null)) ||
    (await getPublic(slug, undefined, { allowDraft: true }).catch(() => null)) ||
    (await getDemoInvitation(slug));
  return {
    title: invitation
      ? `${invitation.title}${invitation.isDraft ? " (Pratinjau)" : ""} — Undangan Digital`
      : "Undangan",
    robots: { index: false, follow: false },
  };
}

/**
 * Public invitation page. Renders the active PublishedSnapshot through
 * the DocumentRenderer. If not published yet, renders the draft preview
 * so clients can review their invitation seamlessly (P-04, FR-PRV-001).
 * If not found in the DB (e.g. template catalog live previews
 * like /i/demo-royal-elegant), resolves the interactive demo invitation model.
 */
export default async function PublicInvitationPage({
  params,
  searchParams,
}: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const token = first(query.to) || first(query.guest);

  // 1. Try published snapshot first
  let invitation = await getPublic(slug, token && token.length <= 64 ? token : undefined).catch(
    () => null,
  );

  // 2. If not published, render draft preview for client review / inspection
  if (!invitation) {
    invitation = await getPublic(slug, token && token.length <= 64 ? token : undefined, {
      allowDraft: true,
    }).catch(() => null);
  }

  // 3. Fallback to interactive demo catalog invitation
  if (!invitation) {
    invitation = await getDemoInvitation(slug, token);
  }

  if (!invitation) notFound();

  return (
    <main data-testid="public-invitation" lang="id">
      <h1 className="dib-visually-hidden">{invitation.title}</h1>
      {invitation.isDraft && (
        <aside
          role="status"
          aria-label="Mode Pratinjau Review"
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: "rgba(24, 21, 19, 0.92)",
            color: "#D4AF37",
            padding: "6px 14px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
            pointerEvents: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>👁️</span>
          <span>MODE PRATINJAU / REVIEW KLIEN</span>
        </aside>
      )}
      <PublicContextProvider
        value={{
          slug: invitation.slug,
          ...(invitation.hasGuest && token && { guestToken: token }),
          ...(invitation.guestName !== undefined && { guestName: invitation.guestName }),
        }}
      >
        <DocumentRenderer document={invitation.resolved} runtimeMode="public" />
      </PublicContextProvider>
    </main>
  );
}
