import { randomBytes } from "node:crypto";

/** Opaque, unguessable guest link id: 16 random bytes, base64url (22 chars). */
export function generateGuestTokenId(): string {
  return randomBytes(16).toString("base64url");
}
