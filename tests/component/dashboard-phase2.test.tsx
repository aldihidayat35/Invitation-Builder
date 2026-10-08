import { render, screen } from "@testing-library/react";
import { ClientDashboard } from "@/features/dashboard-layout/components/ClientDashboard";
import { DashboardHeader } from "@/features/dashboard-layout/components/DashboardHeader";
import type { InvitationSummary } from "@/features/invitations/types";

const user = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Alya Client",
  email: "alya@example.test",
  initials: "AC",
  systemRole: "client" as const,
};

describe("DashboardHeader fase 2", () => {
  it("menampilkan pemilih workspace nyata dan tidak menampilkan notifikasi palsu", () => {
    render(
      <DashboardHeader
        user={user}
        activeWorkspace={{ id: "workspace-a", name: "Alya & Raka", role: "owner" }}
        workspaces={[
          { id: "workspace-a", name: "Alya & Raka", role: "owner" },
          { id: "workspace-b", name: "Keluarga Alya", role: "member" },
        ]}
        onToggleMobileSidebar={vi.fn()}
        logoutAction={vi.fn()}
        switchWorkspaceAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Pilih workspace aktif" })).toHaveValue(
      "workspace-a",
    );
    expect(screen.queryByRole("button", { name: "Notifikasi" })).not.toBeInTheDocument();
  });

  it("tidak memberi affordance dropdown palsu untuk satu workspace", () => {
    render(
      <DashboardHeader
        user={user}
        activeWorkspace={{ id: "workspace-a", name: "Alya & Raka", role: "owner" }}
        workspaces={[{ id: "workspace-a", name: "Alya & Raka", role: "owner" }]}
        onToggleMobileSidebar={vi.fn()}
        logoutAction={vi.fn()}
        switchWorkspaceAction={vi.fn()}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Alya & Raka")).toBeInTheDocument();
  });
});

describe("ClientDashboard fase 2", () => {
  it("mengarahkan klien ke Data Mode, preview, dan RSVP tanpa kontrol produksi", () => {
    const invitation: InvitationSummary = {
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      title: "Pernikahan Alya & Raka",
      slug: "alya-raka",
      status: "draft",
      templateVersionId: "33333333-3333-4333-8333-333333333333",
      updatedAt: new Date("2026-10-09T00:00:00.000Z"),
    };

    render(
      <ClientDashboard userName="Alya" workspaceName="Alya & Raka" invitations={[invitation]} />,
    );

    expect(screen.getByRole("link", { name: "Isi data" })).toHaveAttribute(
      "href",
      `/dashboard/invitations/${invitation.id}`,
    );
    expect(screen.getByRole("link", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RSVP" })).toBeInTheDocument();
    expect(screen.queryByText(/publish template/i)).not.toBeInTheDocument();
  });
});
