import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { LandingView } from "./landing-view";

export const metadata: Metadata = {
  title: "Undangan.id — Template Undangan Digital",
  description:
    "Temukan template undangan digital yang elegan dan mudah disesuaikan untuk momen spesialmu. Ribuan template siap digunakan.",
};

export default async function HomePage() {
  const currentUser = await getCurrentUser().catch(() => null);

  return <LandingView currentUser={currentUser} />;
}
