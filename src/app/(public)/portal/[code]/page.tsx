import { redirect } from "next/navigation";

interface PortalRedirectPageProps {
  params: Promise<{ code: string }>;
}

export default async function PortalRedirectPage({ params }: PortalRedirectPageProps) {
  const { code } = await params;
  redirect(`/c/${code}`);
}
