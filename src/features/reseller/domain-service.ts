import "server-only";

import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import type { Actor } from "@/lib/auth/authorization";
import { ForbiddenError } from "@/lib/auth/errors";
import { findResellerProfileById, updateResellerBranding } from "@/lib/db/repositories/resellers";
import type { Database } from "@/lib/db/types";

export const DOMAIN_TXT_PREFIX = "undangan-verification=";

export function normalizeCustomDomain(value: string): string {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (
    domain.length < 4 ||
    domain.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
  ) {
    throw new Error("Domain khusus tidak valid.");
  }
  return domain;
}

export function newDomainVerificationToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function verifyResellerDomain(
  db: Database,
  actor: Actor,
  profileId: string,
  deps: { resolveTxt?: typeof resolveTxt } = {},
) {
  const profile = await findResellerProfileById(db, profileId);
  if (!profile) throw new Error("Profil seller tidak ditemukan.");
  if (actor.systemRole !== "owner" && profile.userId !== actor.userId) throw new ForbiddenError();
  if (!profile.customDomain || !profile.domainVerificationToken) {
    throw new Error("Domain belum dikonfigurasi.");
  }
  let records: string[][] = [];
  try {
    records = await (deps.resolveTxt ?? resolveTxt)(
      `_undangan-verification.${profile.customDomain}`,
    );
  } catch {
    records = [];
  }
  const expected = `${DOMAIN_TXT_PREFIX}${profile.domainVerificationToken}`;
  const verified = records.flat().some((record) => record.trim() === expected);
  const tlsIsActive = profile.tlsStatus === "active";
  return updateResellerBranding(db, profile.id, {
    domainStatus: verified ? (tlsIsActive ? "active" : "verified") : "failed",
    domainVerifiedAt: verified ? new Date() : null,
    domainLastCheckedAt: new Date(),
    tlsStatus: tlsIsActive ? "active" : "pending",
  });
}

export async function activateResellerDomainTls(db: Database, actor: Actor, profileId: string) {
  if (actor.systemRole !== "owner") throw new ForbiddenError();
  const profile = await findResellerProfileById(db, profileId);
  if (!profile || profile.domainStatus !== "verified") {
    throw new Error("Domain harus terverifikasi sebelum TLS diaktifkan.");
  }
  return updateResellerBranding(db, profile.id, {
    domainStatus: "active",
    tlsStatus: "active",
    tlsActivatedAt: new Date(),
  });
}
