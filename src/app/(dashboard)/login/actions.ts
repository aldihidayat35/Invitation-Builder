"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { AuthenticationError, RateLimitError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { signIn, signOut } from "@/lib/auth/server";

export interface LoginState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").max(254),
  password: z.string().min(1, "Password wajib diisi.").max(256),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  try {
    const requestHeaders = await headers();
    const clientKey =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    await signIn(parsed.data.email, parsed.data.password, clientKey);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(error.retryAfterSeconds / 60)} menit.`,
      };
    }
    if (error instanceof AuthenticationError) return { error: error.message };
    console.error("login failed unexpectedly", error);
    return { error: "Terjadi kesalahan. Silakan coba lagi." };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
