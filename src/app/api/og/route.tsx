import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || "Undangan.id";
    const description =
      searchParams.get("desc") ||
      "Platform pembuatan website undangan digital yang elegan, praktis, dan modern.";
    const badge = searchParams.get("badge") || "✨ TEMPLATE UNDANGAN DIGITAL";
    const category = searchParams.get("category");
    const price = searchParams.get("price");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#111110",
            backgroundImage:
              "radial-gradient(circle at 85% 15%, rgba(197, 139, 85, 0.22) 0%, transparent 55%), radial-gradient(circle at 10% 85%, rgba(138, 154, 134, 0.18) 0%, transparent 50%)",
            padding: "60px 70px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#ffffff",
            position: "relative",
            border: "12px solid #232220",
          }}
        >
          {/* Subtle frame corner decoration */}
          <div
            style={{
              position: "absolute",
              top: "24px",
              left: "24px",
              right: "24px",
              bottom: "24px",
              border: "1px solid rgba(197, 139, 85, 0.25)",
              borderRadius: "8px",
              pointerEvents: "none",
            }}
          />

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "rgba(197, 139, 85, 0.15)",
                border: "1px solid rgba(197, 139, 85, 0.4)",
                padding: "8px 18px",
                borderRadius: "30px",
                color: "#e8b88a",
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {badge}
            </div>

            {category && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "16px",
                  color: "#d0d0d0",
                  fontWeight: 500,
                }}
              >
                Kategori: {category}
              </div>
            )}
          </div>

          {/* Main content center */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", zIndex: 10, maxWidth: "1000px" }}>
            <h1
              style={{
                fontSize: title.length > 35 ? "52px" : "64px",
                lineHeight: 1.15,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 4px 20px rgba(0,0,0,0.6)",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: "24px",
                lineHeight: 1.5,
                color: "#c2c2c0",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                maxWidth: "920px",
              }}
            >
              {description}
            </p>
          </div>

          {/* Footer bottom bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "24px",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#c58b55",
                  letterSpacing: "-0.02em",
                }}
              >
                Undangan.id
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "16px", color: "#a5a5a0" }}>
                <span>• Mobile Responsive</span>
                <span>• Musik & RSVP</span>
                <span>• Amplop Digital</span>
              </div>
            </div>

            {price ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "6px",
                  backgroundColor: "rgba(197, 139, 85, 0.2)",
                  border: "1px solid #c58b55",
                  padding: "8px 20px",
                  borderRadius: "12px",
                }}
              >
                <span style={{ fontSize: "16px", color: "#d0d0d0" }}>Mulai</span>
                <span style={{ fontSize: "28px", fontWeight: 700, color: "#f3c79b" }}>{price}</span>
              </div>
            ) : (
              <div style={{ fontSize: "18px", color: "#8a9a86", fontWeight: 600 }}>
                ✨ Siap Bagikan ke Seluruh Tamu
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("[api/og] Generation error:", error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
