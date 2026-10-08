"use client";

import { useMemo, useState } from "react";

interface ClientOption {
  id: string;
  name: string;
  email: string;
  workspaces: Array<{ id: string; name: string }>;
}

export function ProductionSetupForm({
  orderId,
  clients,
  assignees,
  templates,
  currentTemplateId,
  action,
}: {
  orderId: string;
  clients: ClientOption[];
  assignees: Array<{ id: string; name: string; email: string }>;
  templates: Array<{ id: string; name: string; versionNo: number | null }>;
  currentTemplateId?: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const firstClient = clients.find((client) => client.workspaces.length > 0);
  const [clientId, setClientId] = useState(firstClient?.id ?? "");
  const workspaces = useMemo(
    () => clients.find((client) => client.id === clientId)?.workspaces ?? [],
    [clientId, clients],
  );

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="grid gap-1.5 text-xs font-semibold text-stone-700">
        Akun klien
        <select
          name="clientUserId"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          required
          className="min-h-11 rounded-xl border border-stone-200 bg-white px-3"
        >
          <option value="">Pilih klien</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id} disabled={client.workspaces.length === 0}>
              {client.name} · {client.email}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-stone-700">
        Workspace klien
        <select
          name="workspaceId"
          key={clientId}
          defaultValue={workspaces[0]?.id ?? ""}
          required
          className="min-h-11 rounded-xl border border-stone-200 bg-white px-3"
        >
          <option value="">Pilih workspace</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-stone-700">
        Master template
        <select
          name="templateId"
          defaultValue={currentTemplateId ?? ""}
          required
          className="min-h-11 rounded-xl border border-stone-200 bg-white px-3"
        >
          <option value="">Pilih template publik</option>
          {templates
            .filter((template) => template.versionNo !== null)
            .map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · versi {template.versionNo}
              </option>
            ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-stone-700">
        Penanggung jawab produksi
        <select
          name="assigneeId"
          required
          className="min-h-11 rounded-xl border border-stone-200 bg-white px-3"
        >
          <option value="">Pilih assignee</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name} · {assignee.email}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-stone-700">
        Target selesai
        <input
          type="datetime-local"
          name="dueAt"
          required
          className="min-h-11 rounded-xl border border-stone-200 bg-white px-3"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-stone-700 sm:col-span-2">
        Catatan internal
        <textarea
          name="adminNotes"
          rows={3}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2"
          placeholder="Brief produksi, prioritas, atau catatan handoff"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-xl bg-[#84633F] px-5 text-sm font-bold text-white sm:col-span-2"
      >
        Simpan Konfigurasi Produksi
      </button>
    </form>
  );
}
