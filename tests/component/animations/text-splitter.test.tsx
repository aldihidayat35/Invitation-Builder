/**
 * Component test: AccessibleAnimatedText (FR-ANM-004, AC-07, NFR-A11Y-001).
 *
 * Verifies that text splitting generates visual spans for stagger animation
 * without corrupting the accessible name for assistive technology.
 */
import { render, screen } from "@testing-library/react";
import { AccessibleAnimatedText } from "@/features/animations";

describe("AccessibleAnimatedText (FR-ANM-004, AC-07, NFR-A11Y-001)", () => {
  it("renders standard text when staggerUnit is 'none'", () => {
    const { container } = render(
      <AccessibleAnimatedText text="Romeo & Juliet" staggerUnit="none" />,
    );
    expect(container.textContent).toBe("Romeo & Juliet");
    expect(container.querySelectorAll("[data-anim-char]")).toHaveLength(0);
  });

  it("splits text into individual character spans while preserving accessibility", () => {
    const text = "Romeo & Juliet";
    const { container } = render(
      <AccessibleAnimatedText text={text} staggerUnit="char" />,
    );

    // 1. Accessibility: Assistive technology reads the full text through role="text" / aria-label
    const accessibleEl = screen.getByRole("text", { name: text });
    expect(accessibleEl).toBeInTheDocument();
    expect(accessibleEl).toHaveAttribute("aria-label", text);

    // 2. Visual presentation: is hidden from screen readers to prevent spell-out
    const visual = container.querySelector('[aria-hidden="true"]');
    expect(visual).not.toBeNull();

    // 3. Stagger count: exact count of characters (excluding spaces)
    // "Romeo" (5) + "&" (1) + "Juliet" (6) = 12 characters
    const chars = container.querySelectorAll("[data-anim-char]");
    expect(chars).toHaveLength(12);

    // Characters match order
    const extractedChars = Array.from(chars).map((c) => c.textContent).join("");
    expect(extractedChars).toBe("Romeo&Juliet");
  });

  it("splits text into individual word spans while preserving accessibility", () => {
    const text = "The Wedding Celebration";
    const { container } = render(
      <AccessibleAnimatedText text={text} staggerUnit="word" />,
    );

    const accessibleEl = screen.getByRole("text", { name: text });
    expect(accessibleEl).toBeInTheDocument();

    const words = container.querySelectorAll("[data-anim-word]");
    expect(words).toHaveLength(3);
    expect(words[0]?.textContent).toBe("The");
    expect(words[1]?.textContent).toBe("Wedding");
    expect(words[2]?.textContent).toBe("Celebration");
  });

  it("handles whitespace and special punctuation cleanly", () => {
    const text = "A & B, Together!";
    const { container } = render(
      <AccessibleAnimatedText text={text} staggerUnit="char" />,
    );

    expect(screen.getByRole("text", { name: text })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-anim-char]").length).toBeGreaterThan(0);
  });
});
