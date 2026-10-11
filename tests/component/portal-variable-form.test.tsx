import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortalVariableForm } from "@/app/(public)/c/[code]/components/PortalVariableForm";
import type { FormGroup } from "@/lib/engine";

// Mock the server action
vi.mock("@/app/(public)/c/[code]/actions", () => ({
  savePortalInvitationDataAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("PortalVariableForm Character Limits & Counters", () => {
  const sampleGroups: FormGroup[] = [
    {
      group: "couple",
      label: "Data Mempelai",
      fields: [
        {
          key: "couple.groom.nickname",
          label: "Nama Panggilan Pria",
          type: "text",
          control: "text",
          required: true,
          group: "couple",
          maxLength: 10,
          needsTimeZone: false,
        },
        {
          key: "wedding.story",
          label: "Our Story",
          type: "text",
          control: "richtext",
          required: false,
          group: "couple",
          maxLength: 50,
          needsTimeZone: false,
        },
      ],
    },
  ];

  it("renders maxLength attribute and initial character counters", () => {
    render(
      <PortalVariableForm
        token="test-token"
        groups={sampleGroups}
        initialValues={{
          "couple.groom.nickname": "Danang",
          "wedding.story": "Cerita singkat kami berdua",
        }}
        initialErrors={{}}
      />,
    );

    const input = screen.getByLabelText(/Nama Panggilan Pria/i) as HTMLInputElement;
    expect(input.getAttribute("maxlength")).toBe("10");
    expect(input.value).toBe("Danang");

    const textarea = screen.getByLabelText(/Our Story/i) as HTMLTextAreaElement;
    expect(textarea.getAttribute("maxlength")).toBe("50");

    // Counters displayed
    expect(screen.getByText("6 / 10 karakter")).toBeDefined();
    expect(screen.getByText("26 / 50 karakter")).toBeDefined();
  });

  it("clamps input to maxLength and shows limit reached indicator when full", () => {
    render(
      <PortalVariableForm
        token="test-token"
        groups={sampleGroups}
        initialValues={{
          "couple.groom.nickname": "Danang",
        }}
        initialErrors={{}}
      />,
    );

    const input = screen.getByLabelText(/Nama Panggilan Pria/i) as HTMLInputElement;

    // Type a string longer than 10 characters (e.g. 15 chars)
    fireEvent.change(input, { target: { value: "Danang Aji Pratama" } });

    // Enforced hard limit clamps to 10 characters: "Danang Aji"
    expect(input.value).toBe("Danang Aji");
    expect(screen.getByText("10 / 10 karakter")).toBeDefined();
    expect(screen.getByText("Batas tercapai")).toBeDefined();
  });
});
