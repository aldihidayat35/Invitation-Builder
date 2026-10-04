"use client";

import { useMemo } from "react";
import { parseFrameImage } from "./PhotoFrameWidget";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";
import styles from "./runtime.module.css";

export interface CouplePerson {
  readonly name?: string;
  readonly fullName?: string;
  readonly role?: string;
  readonly parents?: string;
  readonly instagram?: string;
  readonly photo?: unknown;
}

export interface CoupleProfileWidgetProps {
  readonly title?: unknown;
  readonly subtitle?: unknown;
  readonly connector?: unknown;
  readonly order?: unknown;
  readonly showInstagram?: unknown;
  readonly showParents?: unknown;
  readonly groom?: unknown;
  readonly bride?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

export function parseCouplePerson(value: unknown, defaultRole?: string): CouplePerson {
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        return parseCouplePerson(value[0], defaultRole);
      }
      return { role: defaultRole };
    }
    const rec = value as Record<string, unknown>;
    return {
      name: typeof rec.name === "string" ? rec.name : undefined,
      fullName: typeof rec.fullName === "string" ? rec.fullName : undefined,
      role: typeof rec.role === "string" ? rec.role : defaultRole,
      parents: typeof rec.parents === "string" ? rec.parents : undefined,
      instagram: typeof rec.instagram === "string" ? rec.instagram.replace(/^@/, "").trim() : undefined,
      photo: rec.photo,
    };
  }
  return { role: defaultRole };
}

function InstagramIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function PersonCard({
  person,
  type,
  showInstagram,
  showParents,
}: {
  readonly person: CouplePerson;
  readonly type: "groom" | "bride";
  readonly showInstagram: boolean;
  readonly showParents: boolean;
}) {
  const photoSrc = parseFrameImage(person.photo);
  const initial = (person.name || person.fullName || (type === "groom" ? "R" : "A")).charAt(0).toUpperCase();

  return (
    <article className={styles.couplePersonCard} data-person={type}>
      {/* Photo / Monogram Container */}
      <div className={styles.couplePhotoViewport}>
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={person.fullName || person.name || (type === "groom" ? "Mempelai Pria" : "Mempelai Wanita")}
            className={styles.couplePhotoImg}
            loading="lazy"
          />
        ) : (
          <div className={styles.coupleMonogramFallback} aria-label={`Inisial ${initial}`}>
            <span className={styles.coupleMonogramLetter}>{initial}</span>
            <span className={styles.coupleMonogramSubtext}>
              {type === "groom" ? "Mempelai Pria" : "Mempelai Wanita"}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className={styles.couplePersonInfo}>
        {person.role && <span className={styles.couplePersonRole}>{person.role}</span>}
        {person.name && <h3 className={styles.couplePersonName}>{person.name}</h3>}
        {person.fullName && <h4 className={styles.couplePersonFullName}>{person.fullName}</h4>}
        {showParents && person.parents && (
          <p className={styles.couplePersonParents}>{person.parents}</p>
        )}
        {showInstagram && person.instagram && (
          <a
            href={`https://instagram.com/${person.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.coupleInstagramBtn}
            title={`Instagram @${person.instagram}`}
          >
            <InstagramIcon />
            <span>@{person.instagram}</span>
          </a>
        )}
      </div>
    </article>
  );
}

export function CoupleProfileWidget({
  title,
  subtitle,
  connector = "&",
  order = "groom-first",
  showInstagram = true,
  showParents = true,
  groom,
  bride,
  style,
}: CoupleProfileWidgetProps) {
  const resolvedGroom = useMemo(() => parseCouplePerson(groom, "Mempelai Pria"), [groom]);
  const resolvedBride = useMemo(() => parseCouplePerson(bride, "Mempelai Wanita"), [bride]);

  const groomFirst = order !== "bride-first";
  const firstPerson = groomFirst ? resolvedGroom : resolvedBride;
  const firstType = groomFirst ? ("groom" as const) : ("bride" as const);
  const secondPerson = groomFirst ? resolvedBride : resolvedGroom;
  const secondType = groomFirst ? ("bride" as const) : ("groom" as const);

  const headingText = typeof title === "string" ? title : undefined;
  const subHeadingText = typeof subtitle === "string" ? subtitle : undefined;
  const connSymbol = typeof connector === "string" && connector.trim() ? connector.trim() : "&";
  const displayIg = showInstagram !== false;
  const displayParents = showParents !== false;

  return (
    <WidgetFrame
      type="coupleProfile"
      style={style}
      className={styles.coupleProfileWidget}
      data-testid="couple-profile-widget"
    >
      {/* Header if specified */}
      {(headingText || subHeadingText) && (
        <header className={styles.coupleHeader}>
          {headingText && <h2 className={styles.coupleHeading}>{headingText}</h2>}
          {subHeadingText && <p className={styles.coupleSubheading}>{subHeadingText}</p>}
        </header>
      )}

      {/* Main Dual Person Display */}
      <div className={styles.couplePersonsWrapper} data-order={order as string}>
        <PersonCard
          person={firstPerson}
          type={firstType}
          showInstagram={displayIg}
          showParents={displayParents}
        />

        {/* Center Floating Connector Badge */}
        <div className={styles.coupleConnectorBadge} aria-hidden="true">
          <span className={styles.coupleConnectorSymbol}>{connSymbol}</span>
        </div>

        <PersonCard
          person={secondPerson}
          type={secondType}
          showInstagram={displayIg}
          showParents={displayParents}
        />
      </div>
    </WidgetFrame>
  );
}
