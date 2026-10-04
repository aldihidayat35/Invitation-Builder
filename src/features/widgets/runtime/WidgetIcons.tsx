import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

const common = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function PinIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function RouteIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="m4 6 5-3 6 3 5-3v15l-5 3-6-3-5 3Z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

export function PlayIcon({ paused = false, ...props }: IconProps & { paused?: boolean }) {
  return (
    <svg {...common} {...props}>
      {paused ? (
        <>
          <path d="M8 5v14M16 5v14" />
        </>
      ) : (
        <path d="m8 5 11 7-11 7Z" />
      )}
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}
