import type { WidgetElement } from "@/lib/schema";
import { parseCouplePerson } from "./runtime/CoupleProfileWidget";

/**
 * Estimates the natural content height (in artboard 390px coordinate units)
 * for a widget based on its type, active variant, and props content.
 * Used by the canvas editor to show visual overflow boundaries and
 * the "Fit to Content" action in the Inspector panel.
 */
export function estimateWidgetContentHeight(element: WidgetElement): number {
  const { w } = element.frame;
  const props = (element.props ?? {}) as Record<string, unknown>;
  const variant = element.style?.variant || "default";

  switch (element.widgetType) {
    case "coupleProfile": {
      const hasTitle = typeof props.title === "string" && props.title.trim().length > 0;
      const hasSubtitle = typeof props.subtitle === "string" && props.subtitle.trim().length > 0;
      const headerH = hasTitle || hasSubtitle ? (hasSubtitle ? 44 : 26) : 0;
      const padding = 24;

      const groom = parseCouplePerson(props.groom, "Mempelai Pria");
      const bride = parseCouplePerson(props.bride, "Mempelai Wanita");
      const showInstagram = props.showInstagram !== false && (Boolean(groom.instagram) || Boolean(bride.instagram));
      const showParents = props.showParents !== false && (Boolean(groom.parents) || Boolean(bride.parents));

      if (variant === "stacked-cards" || variant === "minimalist-editorial") {
        const cardH = 130;
        const cardGap = 28;
        return Math.round(headerH + (cardH * 2) + cardGap + padding + 16);
      }

      // Dual Column Layout
      const colW = (w - 32) / 2;
      const isCircle = variant === "circular-medallion";
      const isArch = variant === "arch-window";
      const isPolaroid = variant === "polaroid-duo";

      const photoW = isCircle ? Math.min(colW - 12, 100) : colW - 8;
      const photoH = isCircle ? photoW : isArch ? Math.min(130, photoW * 1.3) : isPolaroid ? photoW : photoW * 1.1;

      // Role (14px) + Name (20px) + FullName (18px)
      let textHeight = 14 + 20 + 18;
      if (showParents) textHeight += 38;
      if (showInstagram) textHeight += 32;

      const top = 12 + headerH;
      const totalEstimated = top + photoH + (isPolaroid ? 16 : 8) + textHeight + padding;
      return Math.round(totalEstimated);
    }

    case "timeline": {
      const events = Array.isArray(props.events) ? props.events : [];
      const hasTitle = typeof props.title === "string" && props.title.trim().length > 0;
      const headerH = hasTitle ? 44 : 0;
      if (variant === "horizontal-steps") {
        return Math.round(headerH + 220);
      }
      const count = Math.max(1, events.length);
      const eventH = variant === "compact-list" ? 64 : 86;
      return Math.round(headerH + (count * eventH) + 32);
    }

    case "wishes": {
      const items = Array.isArray(props.items) ? props.items : [];
      const hasTitle = typeof props.title === "string" && props.title.trim().length > 0;
      const headerH = hasTitle ? 44 : 0;
      const allowPost = props.allowPost !== false;
      const formH = allowPost ? 180 : 0;
      const count = Math.max(1, items.length);
      return Math.round(headerH + formH + (count * 75) + 32);
    }

    case "gift": {
      const accounts = Array.isArray(props.accounts) ? props.accounts : [];
      const hasTitle = typeof props.title === "string" && props.title.trim().length > 0;
      const headerH = hasTitle ? 44 : 0;
      const count = Math.max(1, accounts.length);
      return Math.round(headerH + (count * 96) + 32);
    }

    case "rsvp": {
      return variant === "split-panel" ? 320 : 360;
    }

    case "gallery": {
      const items = Array.isArray(props.items) ? props.items : [];
      const count = Math.max(1, items.length);
      if (variant.includes("slider") || variant.includes("filmstrip")) {
        return 260;
      }
      const rows = Math.ceil(count / 2);
      return Math.round(rows * 140 + 44);
    }

    case "countdown": {
      return variant === "editorial-split" ? 170 : 130;
    }

    case "guestGreeting": {
      return 110;
    }

    case "map": {
      return 260;
    }

    case "music": {
      return 72;
    }

    case "photoFrame": {
      return Math.round(w * 1.2);
    }

    default:
      return element.frame.h;
  }
}
