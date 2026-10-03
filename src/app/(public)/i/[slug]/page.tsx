import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublic } from "@/features/invitations/api";
import { DocumentRenderer } from "@/features/renderer";

/** Live data: always read the active snapshot at request time (FR-PUB-001). */
export const dynamic = "force-dynamic";

// PRD §13.1/§19: noindex,nofollow by default; also set per-page so it never depends on layout order.
export const metadata: Metadata = {
  title: "Undangan",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Public invitation page. No login, no draft: it renders ONLY the active
 * PublishedSnapshot through the same HTML renderer as preview (P-04, P-06).
 * `?to=<token>` selects the guest context; invalid tokens fall back to generic.
 */
export default async function PublicInvitationPage({
  params,
  searchParams,
}: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const token = first(query.to);
  const invitation = await getPublic(slug, token && token.length <= 64 ? token : undefined);
  if (!invitation) notFound();

  return (
    <main data-testid="public-invitation" lang="id">
      <h1 className="dib-visually-hidden">{invitation.title}</h1>
      <DocumentRenderer document={invitation.resolved} runtimeMode="public" />
    </main>
  );
}
