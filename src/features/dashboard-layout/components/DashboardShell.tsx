"use client";

import React, { useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardFooter } from "./DashboardFooter";
import type {
  AgencyBrandingData,
  AppSettingsData,
  NavGroup,
  StorageUsageSummary,
  UserSummaryData,
  WorkspaceSummaryData,
  WorkspaceOptionData,
} from "../types";

interface DashboardShellProps {
  readonly user: UserSummaryData;
  readonly activeWorkspace: WorkspaceSummaryData | null;
  readonly workspaces: readonly WorkspaceOptionData[];
  readonly agencyBranding: AgencyBrandingData | null;
  readonly appSettings?: AppSettingsData | null;
  readonly storageUsage?: StorageUsageSummary | null;
  readonly navGroups: readonly NavGroup[];
  readonly logoutAction: () => Promise<void> | void;
  readonly switchWorkspaceAction: (formData: FormData) => Promise<void>;
  readonly children: React.ReactNode;
}

export function DashboardShell({
  user,
  activeWorkspace,
  workspaces,
  agencyBranding,
  appSettings,
  storageUsage,
  navGroups,
  logoutAction,
  switchWorkspaceAction,
  children,
}: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F7F4EF] text-[#2C221E] antialiased">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        navGroups={navGroups}
        agencyBranding={agencyBranding}
        appSettings={appSettings}
        storageUsage={storageUsage}
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
          workspaces={workspaces}
          switchWorkspaceAction={switchWorkspaceAction}
          onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
          logoutAction={logoutAction}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</main>

        <DashboardFooter appSettings={appSettings} />
      </div>
    </div>
  );
}
