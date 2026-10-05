import type { ResolvedOpeningScreen } from "@/lib/engine";

export interface OpeningTemplateProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly coupleName: string;
  readonly dateText?: string;
  readonly locationText?: string;
  readonly guestLabel: string;
  readonly guestName: string;
  readonly buttonText: string;
  readonly isClosing: boolean;
  readonly onOpen: () => void;
}
