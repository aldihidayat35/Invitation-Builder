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
    (await getPublic(slug).catch(() => null)) || (await getDemoInvitation(slug));
  return {
    title: invitation ? `${invitation.title} — Undangan Digital` : "Undangan",
    robots: { index: false, follow: false },
  };
}

/**
 * Public invitation page. Renders the active PublishedSnapshot through
 * the DocumentRenderer. If not found in the DB (e.g. template catalog live previews
 * like /i/demo-royal-elegant), resolves the interactive demo invitation model.
 */
export default async function PublicInvitationPage({
  params,
  searchParams,
}: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const token = first(query.to) || first(query.guest);
  let invitation = await getPublic(slug, token && token.length <= 64 ? token : undefined).catch(
    () => null,
  );
  if (!invitation) {
    invitation = await getDemoInvitation(slug, token);
  }
  if (!invitation) notFound();

  return (
    <main data-testid="public-invitation" lang="id">
      <h1 className="dib-visually-hidden">{invitation.title}</h1>
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
