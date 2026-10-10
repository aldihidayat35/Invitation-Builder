import { type NextRequest } from "next/server";
import { GET as handleFavicon } from "@/app/api/app-favicon/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleFavicon(request);
}
