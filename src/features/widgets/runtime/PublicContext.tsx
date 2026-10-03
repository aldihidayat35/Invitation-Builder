"use client";

import { createContext, useContext, type ReactNode } from "react";

/** What a runtime widget may know about the public page (never DB ids). */
export interface PublicContextValue {
  readonly slug: string;
  /** Opaque guest token from the invite link (`?to=`), when present. */
  readonly guestToken?: string;
  readonly guestName?: string;
}

const PublicContext = createContext<PublicContextValue | null>(null);

export function PublicContextProvider({
  value,
  children,
}: {
  value: PublicContextValue;
  children: ReactNode;
}) {
  return <PublicContext.Provider value={value}>{children}</PublicContext.Provider>;
}

/** `null` in preview/editor: interactive widgets must then render a non-submitting state. */
export function usePublicContext(): PublicContextValue | null {
  return useContext(PublicContext);
}
