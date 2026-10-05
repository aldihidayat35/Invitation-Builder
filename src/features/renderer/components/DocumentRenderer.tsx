import type { CSSProperties, ReactElement } from "react";
import { AccessibleAnimatedText } from "@/features/animations/text-splitter";
import { WidgetRuntime } from "@/features/widgets/runtime";
import { WidgetErrorBoundary } from "@/features/widgets/runtime/WidgetErrorBoundary";
import type {
  ResolvedDocument,
  ResolvedElement,
  ResolvedSection,
  ResolvedShapeElement,
  ResolvedTextElement,
} from "@/lib/engine";
import type { RuntimeMode } from "../types";
import { buildGoogleFontsUrl, collectDocumentFonts, getFontFallback } from "@/lib/fonts";
import { assetUrl } from "@/features/assets/urls";
import { AnimatedElement } from "./AnimatedElement";
import { AnimatedSection } from "./AnimatedSection";
import { PublicImage } from "./PublicImage";
import { RendererViewport } from "./RendererViewport";
import { OpeningCoverCanvas } from "./opening";
import styles from "./DocumentRenderer.module.css";

export interface DocumentRendererProps {
  readonly document: ResolvedDocument;
  readonly runtimeMode: RuntimeMode;
  readonly showOpeningScreen?: boolean;
}

type ColorInput = string | { readonly token: string };
type Tokens = ResolvedDocument["tokens"];

/** Resolves a hex literal or theme-token reference to a CSS color (undefined when unknown). */
function cssColor(value: ColorInput | undefined, tokens: Tokens): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : tokens.colors[value.token];
}

function cssFont(value: ColorInput | undefined, tokens: Tokens): string | undefined {
  if (value === undefined) return undefined;
  const name = typeof value === "string" ? value : tokens.fonts[value.token];
  if (!name) return undefined;
  const fallback = getFontFallback(name);
  return `'${name}', ${fallback}`;
}

/**
 * Frame = absolute box in 390px artboard coordinates; pivot = center (ADR 0005).
 * Geometry is exposed as unitless custom properties and multiplied by the
 * section scale unit `--u` (= container width / baseWidth) in CSS, so one
 * artboard scales proportionally to any viewport 320-430px (ADR 0009).
 */
function frameStyle(element: ResolvedElement): CSSProperties {
  const { x, y, w, h, rotation } = element.frame;
  return {
    position: "absolute",
    "--x": x,
    "--y": y,
    "--w": w,
    "--h": h,
    transformOrigin: "center center",
    ...(rotation !== 0 && { transform: `rotate(${rotation}deg)` }),
  } as CSSProperties;
}

function TextBody({ element, tokens }: { element: ResolvedTextElement; tokens: Tokens }) {
  const { style } = element;
  const css = {
    "--fs": style.fontSize,
    "--ls": style.letterSpacing ?? 0,
    fontFamily: cssFont(style.fontFamily, tokens),
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    textAlign: style.textAlign,
    color: cssColor(style.color, tokens),
    opacity: style.opacity,
  } as CSSProperties;
  const staggerUnit = element.animations?.enter?.staggerUnit ?? "none";
  return (
    <p className={styles.text} style={css} data-element-text="">
      <AccessibleAnimatedText text={element.text} staggerUnit={staggerUnit} />
    </p>
  );
}

function ShapeBody({ element, tokens }: { element: ResolvedShapeElement; tokens: Tokens }) {
  const { style, shapeType } = element;
  const stroke = style.stroke;
  const strokeColor = stroke ? cssColor(stroke.color, tokens) : undefined;
  if (shapeType === "line") {
    return (
      <div
        className={styles.line}
        data-shape="line"
        style={
          {
            "--bw": stroke?.width ?? 1,
            background: strokeColor,
            opacity: style.opacity,
          } as CSSProperties
        }
      />
    );
  }
  return (
    <div
      className={styles.shape}
      data-shape={shapeType}
      style={
        {
          "--bw": stroke && strokeColor ? stroke.width : 0,
          "--r": style.radius ?? 0,
          background: cssColor(style.fill, tokens),
          ...(stroke && strokeColor && { borderColor: strokeColor }),
          ...(shapeType === "circle" && { borderRadius: "50%" }),
          opacity: style.opacity,
        } as CSSProperties
      }
    />
  );
}

function ElementView({
  element,
  tokens,
  runtimeMode,
  priority,
}: {
  element: ResolvedElement;
  tokens: Tokens;
  runtimeMode: RuntimeMode;
  priority: boolean;
}): ReactElement | null {
  if (element.hidden) return null;

  let body: ReactElement | null;
  switch (element.type) {
    case "text":
      body = <TextBody element={element} tokens={tokens} />;
      break;
    case "image":
      body = element.image ? (
        <PublicImage
          assetId={element.image.assetId}
          alt={element.alt ?? ""}
          width={element.frame.w}
          height={element.frame.h}
          fit={element.style.fit}
          focal={element.style.focal}
          radius={element.style.radius}
          opacity={element.style.opacity}
          flipH={element.style.flipH}
          flipV={element.style.flipV}
          fade={element.style.fade}
          priority={priority}
        />
      ) : null;
      break;
    case "shape":
      body = <ShapeBody element={element} tokens={tokens} />;
      break;
    case "widget": {
      const color = cssColor(element.style.color, tokens);
      const background = cssColor(element.style.background, tokens);
      body = (
        <WidgetErrorBoundary widgetType={element.widgetType}>
          <WidgetRuntime
            widgetType={element.widgetType}
            props={element.props}
            showFallback={runtimeMode === "preview"}
            style={{
              ...(color !== undefined && { color }),
              ...(background !== undefined && { background }),
              ...(element.style.radius !== undefined && { radius: element.style.radius }),
              ...(element.style.opacity !== undefined && { opacity: element.style.opacity }),
              ...(element.style.variant !== undefined && { variant: element.style.variant }),
            }}
          />
        </WidgetErrorBoundary>
      );
      break;
    }
  }

  return (
    <AnimatedElement
      element={element}
      className={styles.frame}
      style={frameStyle(element)}
      data-testid={`element-${element.id}`}
      data-element-type={element.type}
    >
      {body}
    </AnimatedElement>
  );
}

function BaseBackgroundView({
  background,
  tokens,
  baseWidth,
}: {
  background: ResolvedDocument["background"];
  tokens: Tokens;
  baseWidth: number;
}) {
  const color = cssColor(background?.color, tokens) ?? tokens.colors["surface"] ?? "#ffffff";
  const overlay = background?.overlayColor;
  const overlayOpacity = background?.overlayOpacity ?? 0;

  return (
    <div
      className={styles.baseBackground}
      style={{ backgroundColor: color }}
      data-testid="renderer-base-background"
      aria-hidden="true"
    >
      {background?.image ? (
        background.fit === "repeat" ? (
          <div
            className={styles.baseBackgroundRepeat}
            style={{
              backgroundImage: `url(${assetUrl(background.image.assetId)})`,
            }}
          />
        ) : (
          <div className={styles.baseBackgroundImage}>
            <PublicImage
              assetId={background.image.assetId}
              alt=""
              width={baseWidth}
              height={Math.round(baseWidth * (16 / 9))}
              fit={background.fit}
              priority
            />
          </div>
        )
      ) : null}
      {overlay && overlayOpacity > 0 ? (
        <div
          className={styles.baseBackgroundOverlay}
          style={{
            backgroundColor: overlay,
            opacity: overlayOpacity,
          }}
        />
      ) : null}
    </div>
  );
}

function SectionView({
  section,
  tokens,
  baseWidth,
  runtimeMode,
  first,
}: {
  section: ResolvedSection;
  tokens: Tokens;
  baseWidth: number;
  runtimeMode: RuntimeMode;
  first: boolean;
}) {
  if (section.hidden) return null;
  const rawBg = cssColor(section.background.color, tokens);
  const background = rawBg ?? (section.background.image ? undefined : "transparent");

  return (
    <AnimatedSection
      section={section}
      className={styles.section}
      first={first}
      style={{
        aspectRatio: `${baseWidth} / ${section.baseHeight}`,
        overflow: section.overflow,
        background,
      }}
    >
      <div
        className={styles.sectionInner}
        style={{ "--u": `calc(100cqw / ${baseWidth})` } as CSSProperties}
      >
        {section.background.image ? (
          <div className={styles.sectionBackground} aria-hidden="true">
            <PublicImage
              assetId={section.background.image.assetId}
              alt=""
              width={baseWidth}
              height={section.baseHeight}
              fit={section.background.fit}
              priority={first}
            />
          </div>
        ) : null}
        {section.elements.map((element, index) => (
          <ElementView
            key={element.id}
            element={element}
            tokens={tokens}
            runtimeMode={runtimeMode}
            priority={first && index === 0}
          />
        ))}
      </div>
    </AnimatedSection>
  );
}


/**
 * HTML renderer for a resolved document (P-04, FR-PRV-001). Shared by dashboard
 * preview and - from Fase 9 - the public invitation page. DOM only: it never
 * renders a canvas and never imports Konva or editor modules. Text is rendered
 * as React text nodes (always escaped), never as markup.
 */
export function DocumentRenderer({
  document,
  runtimeMode,
  showOpeningScreen = true,
}: DocumentRendererProps) {
  const fonts = collectDocumentFonts(document);
  const googleFontsUrl = buildGoogleFontsUrl(fonts);

  const openingSection = document.sections.find((s) => s.isOpening);
  const contentSections =
    openingSection && document.sections.length > 1
      ? document.sections.filter((s) => s.id !== openingSection.id)
      : document.sections;
  const nextSectionId = contentSections[0]?.id;

  return (
    <RendererViewport runtimeMode={runtimeMode}>
      {googleFontsUrl ? <link rel="stylesheet" href={googleFontsUrl} /> : null}
      <BaseBackgroundView
        background={document.background}
        tokens={document.tokens}
        baseWidth={document.baseWidth}
      />
      {openingSection && showOpeningScreen ? (
        <OpeningCoverCanvas
          openingSection={openingSection}
          nextSectionId={nextSectionId}
          tokens={document.tokens}
          baseWidth={document.baseWidth}
          runtimeMode={runtimeMode}
          renderElements={(sec) =>
            sec.elements.map((element, index) => (
              <ElementView
                key={element.id}
                element={element}
                tokens={document.tokens}
                runtimeMode={runtimeMode}
                priority={index === 0}
              />
            ))
          }
        />
      ) : null}
      <div className={styles.document} data-renderer-document="" data-testid="renderer-document">
        {contentSections.map((section, index) => (
          <SectionView
            key={section.id}
            section={section}
            tokens={document.tokens}
            baseWidth={document.baseWidth}
            runtimeMode={runtimeMode}
            first={index === 0}
          />
        ))}
      </div>
    </RendererViewport>
  );
}
