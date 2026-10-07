import type { ReactNode } from "react";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly hint?: string;
  readonly icon: ReactNode;
  readonly exact?: boolean;
  readonly badge?: number | string;
}

export interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}

export interface AgencyBrandingData {
  readonly agencyName: string;
  readonly logoUrl?: string | null;
  readonly whatsappContact: string;
}

export interface UserSummaryData {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly systemRole: string;
  readonly initials: string;
}

export interface WorkspaceSummaryData {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}
