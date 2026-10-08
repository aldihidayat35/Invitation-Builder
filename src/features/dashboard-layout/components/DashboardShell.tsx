"use client";

import React, { useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardFooter } from "./DashboardFooter";
import type {
  AgencyBrandingData,
  NavGroup,
  UserSummaryData,
  WorkspaceSummaryData,
} from "../types";

interface DashboardShellProps {
  readonly user: UserSummaryData;
  readonly activeWorkspace: WorkspaceSummaryData | null;
  readonly agencyBranding: AgencyBrandingData | null;
  readonly navGroups: readonly NavGroup[];
  readonly logoutAction: () => Promise<void> | void;
  readonly children: React.ReactNode;
}

export function DashboardShell({
  user,
  activeWorkspace,
  agencyBranding,
  navGroups,
  logoutAction,
  children,
}: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F7F9FB] text-[#1E293B] antialiased">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        navGroups={navGroups}
        agencyBranding={agencyBranding}
        user={user}
        logoutAction={logoutAction}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          user={user}
          activeWorkspace={activeWorkspace}
          onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
          logoutAction={logoutAction}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        <DashboardFooter />
      </div>
    </div>
  );
}
