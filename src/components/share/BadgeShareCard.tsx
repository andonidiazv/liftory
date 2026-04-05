import { forwardRef } from "react";
import { getBadgeIcon } from "@/lib/badgeIcons";

export interface BadgeShareCardProps {
  badgeName: string;
  tierLabel: string;
  tierColor: string;
  exerciseName: string;
  iconName: string | null;
  athleteName: string;
  avatarUrl: string | null;
}

/**
 * Hidden off-screen card rendered at 360×640 px.
 * html2canvas captures it at scale 3 → 1080×1920 (Instagram Story).
 * Uses ONLY inline styles — html2canvas doesn't reliably capture Tailwind.
 */
const BadgeShareCard = forwardRef<HTMLDivElement, BadgeShareCardProps>(
  ({ badgeName, tierLabel, tierColor, exerciseName, iconName, athleteName, avatarUrl }, ref) => {
    const Icon = getBadgeIcon(iconName);
    const initial = athleteName?.charAt(0)?.toUpperCase() || "?";

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          height: 640,
          background: "linear-gradient(170deg, #1C1C1E 0%, #0D0D0F 40%, #1A1614 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow behind icon */}
        <div
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${tierColor}18 0%, transparent 70%)`,
            filter: "blur(60px)",
            top: "32%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Top: BADGE EARNED */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: "rgba(250,248,245,0.35)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            BADGE DESBLOQUEADO
          </span>
        </div>

        {/* Badge icon with glow rings */}
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 28,
            zIndex: 1,
          }}
        >
          {/* Outer glow ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1.5px solid ${tierColor}15`,
              background: `${tierColor}06`,
            }}
          />
          {/* Inner glow ring */}
          <div
            style={{
              position: "absolute",
              inset: 16,
              borderRadius: "50%",
              border: `1.5px solid ${tierColor}25`,
              background: `${tierColor}10`,
            }}
          />
          {/* Icon circle */}
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: `${tierColor}20`,
              border: `2px solid ${tierColor}45`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Icon style={{ width: 34, height: 34, color: tierColor }} />
          </div>
        </div>

        {/* Badge name */}
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 26,
            color: "#FAF8F5",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginTop: 24,
            textAlign: "center",
            lineHeight: 1.1,
            zIndex: 1,
          }}
        >
          {badgeName}
        </span>

        {/* Tier pill */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            fontWeight: 700,
            color: tierColor,
            background: `${tierColor}15`,
            border: `1px solid ${tierColor}30`,
            borderRadius: 999,
            padding: "4px 14px",
            textTransform: "uppercase",
            marginTop: 12,
            zIndex: 1,
          }}
        >
          {tierLabel}
        </span>

        {/* Exercise name */}
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "#8A8A8E",
            marginTop: 8,
            textAlign: "center",
            zIndex: 1,
          }}
        >
          {exerciseName}
        </span>

        {/* Separator line */}
        <div
          style={{
            width: 60,
            height: 1,
            background: `${tierColor}25`,
            marginTop: 28,
            zIndex: 1,
          }}
        />

        {/* Athlete info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 24,
            zIndex: 1,
          }}
        >
          {/* Avatar or initial */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              crossOrigin="anonymous"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                border: `1.5px solid ${tierColor}30`,
              }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `${tierColor}20`,
                border: `1.5px solid ${tierColor}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: tierColor,
                }}
              >
                {initial}
              </span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 14,
                color: "#FAF8F5",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {athleteName}
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                color: tierColor,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop: 1,
              }}
            >
              VERIFICADO
            </span>
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: "auto",
            paddingTop: 20,
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              color: "rgba(250,248,245,0.65)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            POWERED BY
          </span>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 11,
              color: "#FAF8F5",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            LIFTORY
          </span>
        </div>
      </div>
    );
  },
);

BadgeShareCard.displayName = "BadgeShareCard";

export default BadgeShareCard;
