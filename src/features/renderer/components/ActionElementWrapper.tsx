"use client";

import { useCallback, type ReactNode } from "react";
import type { ElementAction } from "@/lib/schema";
import { isSafeUrl } from "@/lib/schema/url";
import type { RuntimeMode } from "../types";
import styles from "./DocumentRenderer.module.css";

interface ActionElementWrapperProps {
  action: ElementAction;
  runtimeMode?: RuntimeMode;
  children: ReactNode;
}

export function ActionElementWrapper({
  action,
  runtimeMode = "public",
  children,
}: ActionElementWrapperProps) {
  const hoverClass =
    action.hoverEffect === "scale"
      ? styles.actionHoverScale
      : action.hoverEffect === "opacity"
        ? styles.actionHoverOpacity
        : action.hoverEffect === "glow"
          ? styles.actionHoverGlow
          : "";

  const handleScroll = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!action.sectionId) return;

      const target =
        document.querySelector(`[data-section-id="${action.sectionId}"]`) ||
        document.getElementById(`section-${action.sectionId}`);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [action.sectionId],
  );

  const handleOpenInvitation = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dib:open-invitation", { detail: { timestamp: Date.now() } }),
        );
        try {
          window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
        } catch {
          // Fallback if PointerEvent constructor not supported
        }
      }
    },
    [],
  );

  switch (action.type) {
    case "url": {
      const rawUrl = action.url?.trim() ?? "";
      const validUrl = isSafeUrl(rawUrl, { protocols: ["https", "http"] }) ? rawUrl : "#";
      return (
        <a
          href={validUrl}
          target={action.target ?? "_blank"}
          rel={action.target === "_blank" ? "noopener noreferrer" : undefined}
          className={`${styles.actionLink} ${hoverClass}`}
          data-element-action="url"
          title={rawUrl || "Tautan URL"}
          onClick={(e) => {
            if (runtimeMode === "preview" && validUrl === "#") {
              e.preventDefault();
            }
          }}
        >
          {children}
        </a>
      );
    }

    case "whatsapp": {
      const cleanPhone = action.phone?.replace(/\D/g, "") ?? "";
      const normalizedPhone = cleanPhone.startsWith("0")
        ? "62" + cleanPhone.slice(1)
        : cleanPhone;
      const msgQuery = action.message?.trim()
        ? `?text=${encodeURIComponent(action.message.trim())}`
        : "";
      const href = normalizedPhone ? `https://wa.me/${normalizedPhone}${msgQuery}` : "#";

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.actionLink} ${hoverClass}`}
          data-element-action="whatsapp"
          title={`WhatsApp: ${action.phone ?? ""}`}
          onClick={(e) => {
            if (runtimeMode === "preview" && href === "#") {
              e.preventDefault();
            }
          }}
        >
          {children}
        </a>
      );
    }

    case "phone": {
      const cleanPhone = action.phone?.trim() ?? "";
      const href = cleanPhone ? `tel:${cleanPhone}` : "#";

      return (
        <a
          href={href}
          className={`${styles.actionLink} ${hoverClass}`}
          data-element-action="phone"
          title={`Telepon: ${cleanPhone}`}
        >
          {children}
        </a>
      );
    }

    case "email": {
      const cleanEmail = action.email?.trim() ?? "";
      const href = cleanEmail ? `mailto:${cleanEmail}` : "#";

      return (
        <a
          href={href}
          className={`${styles.actionLink} ${hoverClass}`}
          data-element-action="email"
          title={`Email: ${cleanEmail}`}
        >
          {children}
        </a>
      );
    }

    case "scroll_to_section": {
      return (
        <button
          type="button"
          onClick={handleScroll}
          className={`${styles.actionButton} ${hoverClass}`}
          data-element-action="scroll_to_section"
          data-target-section={action.sectionId}
          title="Scroll ke Section"
        >
          {children}
        </button>
      );
    }

    case "open_invitation": {
      return (
        <button
          type="button"
          onClick={handleOpenInvitation}
          className={`${styles.actionButton} ${hoverClass}`}
          data-element-action="open_invitation"
          title="Buka Undangan"
        >
          {children}
        </button>
      );
    }

    default:
      return <>{children}</>;
  }
}
