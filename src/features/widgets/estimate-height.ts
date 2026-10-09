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
      const hasSubtitle = typeof props.subtitle === "string" && props.subtitle.trim().length > 0;
      const headerH = hasTitle ? (hasSubtitle ? 52 : 36) : 0;
      if (variant === "horizontal-steps") {
        return Math.round(headerH + 190);
      }
      const count = Math.max(1, events.length);
      const eventH = variant === "minimal-cards" ? 72 : 84;
      return Math.round(headerH + (count * eventH) + 24);
    }

    case "wishes": {
      const items = Array.isArray(props.items) ? props.items : [];
      const hasTitle = typeof props.title === "string" && props.title.trim().length > 0;
      const headerH = hasTitle ? 44 : 0;
      const count = Math.max(1, Math.min(items.length, 6));
      return Math.round(headerH + (count * 75) + 32);
    }

    case "gift": {
      const accounts = Array.isArray(props.accounts) ? props.accounts : [];
      const hasTitle = typeof props.title === "string" && props.title.trim().length > 0;
      const headerH = hasTitle ? 44 : 0;
      const count = Math.max(1, accounts.length);
      return Math.round(headerH + (count * 96) + 32);
    }

    case "rsvp": {
      const withParty = props.enablePartySize !== false;
      const withMessage = props.enableMessage !== false;
      let base = variant === "split-panel" ? 280 : 300;
      if (withParty) base += 44;
      if (withMessage) base += 52;
      return base;
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

    case "ornamentFrame": {
      return Math.round((w * 260) / 400);
    }

    case "video": {
      const ratio = element.props?.aspectRatio;
      if (variant === "story-portrait" || ratio === "9:16") {
        return Math.round((w * 16) / 9);
      }
      if (variant === "vintage-polaroid") {
        return Math.round((w * 9) / 16 + 50);
      }
      if (ratio === "1:1") {
        return w;
      }
      if (ratio === "4:3") {
        return Math.round((w * 3) / 4);
      }
      return Math.round((w * 9) / 16);
    }

    case "gif": {
      const hasCaption = typeof props.caption === "string" && props.caption.trim().length > 0;
      return Math.round(element.frame.h + (hasCaption ? 28 : 0));
    }

    default:
      return element.frame.h;
  }
}
