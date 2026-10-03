import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorShell } from "@/features/editor";
import { TemplateNotFoundError, openTemplate, permissionsFor } from "@/features/templates/api";
import { currentRevisionAction, saveDraftAction } from "./actions";

export const metadata: Metadata = { title: "Editor template" };

export default async function EditorPage({ params }: PageProps<"/editor/[id]">) {
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
  );
}
