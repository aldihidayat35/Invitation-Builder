import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateRealPreview } from "@/features/editor/components/TemplateRealPreview";
import { TemplateNotFoundError, openTemplate } from "@/features/templates/api";

export const metadata: Metadata = {
  title: "Pratinjau Nyata Template",
  robots: { index: false, follow: false },
};

export default async function TemplatePreviewPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let template;
  try {
    template = await openTemplate(id);
  } catch (error) {
    if (error instanceof TemplateNotFoundError) notFound();
    throw error;
  }

  return (
    <TemplateRealPreview
      templateId={template.id}
      templateName={template.name}
      initialDocument={template.document}
    />
  );
}
