import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorShell } from "@/features/editor";
import { TemplateNotFoundError, openTemplate, permissionsFor } from "@/features/templates/api";
import { requireOwner } from "@/lib/auth/server";
import { currentRevisionAction, saveDraftAction } from "./actions";

export const metadata: Metadata = { title: "Editor template" };

export default async function EditorPage({ params }: PageProps<"/editor/[id]">) {
  await requireOwner();
  const { id } = await params;

  let template;
  try {
    template = await openTemplate(id);
  } catch (error) {
    if (error instanceof TemplateNotFoundError) notFound();
    throw error;
  }
  const permissions = await permissionsFor(template.workspaceId);
  const readOnly = template.lifecycle === "archived" || !permissions.write;

  return (
    <>
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F4EF] px-6 text-center lg:hidden">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl"
            aria-hidden="true"
          >
            🖥️
          </span>
          <h1 className="mt-4 text-xl font-black text-[#2C221E]">Editor tersedia di desktop</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Kanvas desain memerlukan layar lebar agar setiap elemen dapat diposisikan dengan akurat.
            Buka halaman ini dari laptop atau komputer.
          </p>
          <Link
            href={`/dashboard/templates/${template.id}`}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#84633F] px-5 py-2.5 text-sm font-bold text-white"
          >
            Kembali ke detail template
          </Link>
        </div>
      </main>
      <div className="hidden lg:block">
        <EditorShell
          templateId={template.id}
          templateName={template.name}
          workspaceId={template.workspaceId}
          document={template.document}
          revision={template.revision}
          readOnly={readOnly}
          save={saveDraftAction}
          currentRevision={currentRevisionAction}
        />
      </div>
    </>
  );
}
