/**
 * Canvas-based Prime Score share card renderer.
 * Draws everything pixel-perfect without html2canvas.
 */

interface ShareCardOpts {
  score: number;
  scoreLabel: string;
  scoreColor: string;
  dayLabel: string;
  weekNumber: number;
  phaseLabel: string;
  duration: string;
  completedSets: number;
  totalSets: number;
  volume: number;
  prs: number;
  weightUnit: string;
  dateStr: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  font: string,
  color: string,
  letterSpacing = 0,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  if (letterSpacing === 0) {
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    return;
  }
  // Manual letter spacing
  ctx.textAlign = "left";
  const chars = text.split("");
  let totalW = 0;
  for (const c of chars) totalW += ctx.measureText(c).width + letterSpacing;
  totalW -= letterSpacing; // no trailing space
  let cx = x - totalW / 2;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + letterSpacing;
  }
}

// ── Lucide SVG icon rendering — exact same icons as the app ──

const LUCIDE_SVGS: Record<string, string> = {
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  dumbbell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="COLOR" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`,
};

/** Pre-load all icons as images at the desired size and color */
async function loadIcons(size: number, color: string): Promise<Record<string, HTMLImageElement>> {
  const results: Record<string, HTMLImageElement> = {};
  const promises = Object.entries(LUCIDE_SVGS).map(async ([name, svg]) => {
    const colored = svg.replace(/COLOR/g, color);
    const blob = new Blob([colored], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.width = size;
    img.height = size;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => { URL.revokeObjectURL(url); resolve(); };
      img.onerror = reject;
      img.src = url;
    });
    results[name] = img;
  });
  await Promise.all(promises);
  return results;
}

// ── Main Renderer ────────────────────────────────────────────────

const CARD_W_CSS = 370; // CSS pixels
const CARD_H_CSS = 530; // CSS pixels (extra room for badges + branding)

export async function renderShareCard(
  opts: ShareCardOpts,
  mode: "card" | "story",
): Promise<Blob | null> {
  await document.fonts.ready;

  const S = 3; // scale factor for retina

  // Card dimensions
  const cw = CARD_W_CSS * S;
  const ch = CARD_H_CSS * S;

  let canvasW: number;
  let canvasH: number;
  let offsetX: number;
  let offsetY: number;

  if (mode === "story") {
    canvasW = 1080;
    canvasH = 1920;
    offsetX = (canvasW - cw) / 2;
    offsetY = (canvasH - ch) / 2;
  } else {
    canvasW = cw;
    canvasH = ch;
    offsetX = 0;
    offsetY = 0;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  // Pre-load Lucide icons as SVG images
  const iconPx = 18 * S;
  const icons = await loadIcons(iconPx, "rgba(250,248,245,0.45)");

  // ── Story background ──
  if (mode === "story") {
    const bg = ctx.createLinearGradient(0, 0, canvasW * 0.15, canvasH);
    bg.addColorStop(0, "#1C1C1E");
    bg.addColorStop(0.5, "#0D0D0F");
    bg.addColorStop(1, "#1A1614");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Card background ──
  const cardGrad = ctx.createLinearGradient(
    offsetX,
    offsetY,
    offsetX + cw * 0.15,
    offsetY + ch,
  );
  cardGrad.addColorStop(0, "#1C1C1E");
  cardGrad.addColorStop(0.5, "#0D0D0F");
  cardGrad.addColorStop(1, "#1A1614");
  ctx.fillStyle = cardGrad;
  roundRect(ctx, offsetX, offsetY, cw, ch, 16 * S);
  ctx.fill();

  // All subsequent drawing is relative to the card
  const x0 = offsetX;
  const y0 = offsetY;
  const centerX = x0 + cw / 2;

  // ── PRIME SCORE title ──
  let y = y0 + 44 * S;
  drawCenteredText(ctx, "PRIME SCORE", centerX, y, `800 ${22 * S}px Syne`, "#FAF8F5", -0.7 * S);

  // ── Date ──
  y += 18 * S;
  drawCenteredText(ctx, opts.dateStr, centerX, y, `400 ${9 * S}px "DM Mono"`, "rgba(250,248,245,0.3)", 1 * S);

  // ── Score ring ──
  const ringCY = y + 62 * S;
  const ringR = 56 * S;

  // Glow
  ctx.save();
  ctx.shadowColor = opts.scoreColor + "30";
  ctx.shadowBlur = 20 * S;
  // Background ring
  ctx.beginPath();
  ctx.arc(centerX, ringCY, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 5 * S;
  ctx.stroke();
  ctx.restore();

  // Foreground ring
  const arcAngle = (opts.score / 100) * Math.PI * 2;
  ctx.save();
  ctx.shadowColor = opts.scoreColor + "88";
  ctx.shadowBlur = 10 * S;
  ctx.beginPath();
  ctx.arc(centerX, ringCY, ringR, -Math.PI / 2, -Math.PI / 2 + arcAngle);
  ctx.strokeStyle = opts.scoreColor;
  ctx.lineWidth = 5 * S;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // Score number + "/100" — baseline-aligned, centered as a group inside the ring
  ctx.font = `700 ${46 * S}px "DM Mono"`;
  const scoreStr = String(opts.score);
  const scoreTextW = ctx.measureText(scoreStr).width;
  ctx.font = `400 ${14 * S}px "DM Mono"`;
  const slashW = ctx.measureText("/100").width;
  const totalGroupW = scoreTextW + 2 * S + slashW;
  const groupStartX = centerX - totalGroupW / 2;

  // Score digits
  ctx.font = `700 ${46 * S}px "DM Mono"`;
  ctx.fillStyle = "#FAF8F5";
  ctx.textAlign = "left";
  ctx.fillText(scoreStr, groupStartX, ringCY + 16 * S);

  // "/100"
  ctx.font = `400 ${14 * S}px "DM Mono"`;
  ctx.fillStyle = "rgba(250,248,245,0.3)";
  ctx.fillText("/100", groupStartX + scoreTextW + 2 * S, ringCY + 16 * S);

  // ── Sticker label ──
  y = ringCY + ringR + 28 * S;
  ctx.save();
  ctx.shadowColor = opts.scoreColor + "66";
  ctx.shadowBlur = 20 * S;
  drawCenteredText(ctx, opts.scoreLabel, centerX, y, `800 ${13 * S}px Syne`, opts.scoreColor, 1 * S);
  ctx.restore();

  // ── Workout name ──
  y += 22 * S;
  drawCenteredText(ctx, opts.dayLabel, centerX, y, `600 ${15 * S}px Syne`, "rgba(250,248,245,0.85)", -0.2 * S);

  // ── Phase pill ──
  y += 20 * S;
  const pillText = `SEMANA ${opts.weekNumber} \u00B7 ${opts.phaseLabel}`;
  ctx.font = `700 ${9 * S}px "DM Mono"`;
  const pillW = ctx.measureText(pillText).width + 20 * S;
  const pillH = 20 * S;
  const pillX = centerX - pillW / 2;
  const pillY = y - pillH * 0.65;

  ctx.strokeStyle = "rgba(199,91,57,0.25)";
  ctx.lineWidth = 1 * S;
  ctx.fillStyle = "rgba(199,91,57,0.15)";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#C75B39";
  ctx.textAlign = "center";
  ctx.fillText(pillText, centerX, y);

  // ── Stats grid (2×2) ──
  y += 20 * S;
  const gridGap = 10 * S;
  const boxW = (cw - 48 * S * 2 - gridGap) / 2;
  const boxH = 72 * S;
  const gridX = x0 + 24 * S;

  const statsData = [
    { iconKey: "clock", label: "DURACI\u00D3N", value: opts.duration },
    { iconKey: "dumbbell", label: "SETS", value: `${opts.completedSets}/${opts.totalSets}` },
    { iconKey: "trendingUp", label: "VOLUMEN", value: `${opts.volume.toLocaleString()} ${opts.weightUnit}` },
    { iconKey: "trophy", label: "PRs", value: String(opts.prs) },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = gridX + col * (boxW + gridGap);
    const by = y + row * (boxH + gridGap);
    const stat = statsData[i];

    // Box background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1 * S;
    roundRect(ctx, bx, by, boxW, boxH, 12 * S);
    ctx.fill();
    ctx.stroke();

    // Lucide icon — rendered from SVG for pixel-perfect match with the app
    const iconImg = icons[stat.iconKey];
    if (iconImg) {
      ctx.drawImage(iconImg, bx + boxW / 2 - iconPx / 2, by + 10 * S, iconPx, iconPx);
    }

    // Value
    ctx.font = `600 ${17 * S}px "DM Mono"`;
    ctx.fillStyle = "#FAF8F5";
    ctx.textAlign = "center";
    ctx.fillText(stat.value, bx + boxW / 2, by + 42 * S);

    // Label
    ctx.font = `400 ${7.5 * S}px "DM Mono"`;
    ctx.fillStyle = "rgba(250,248,245,0.35)";
    drawCenteredText(ctx, stat.label, bx + boxW / 2, by + 58 * S, `400 ${7.5 * S}px "DM Mono"`, "rgba(250,248,245,0.35)", 1.5 * S);
  }

  // ── Badges row ──
  y += 2 * (boxH + gridGap) + 8 * S;

  const badges: { text: string; color: string; bg: string; border: string; hasIcon: boolean }[] = [];
  if (opts.prs > 0) {
    badges.push({
      text: `${opts.prs} PR${opts.prs > 1 ? "s" : ""}`,
      color: "#C9A96E",
      bg: "rgba(201,169,110,0.15)",
      border: "rgba(201,169,110,0.3)",
      hasIcon: true,
    });
  }
  if (opts.score >= 85) {
    badges.push({
      text: "\u00C9LITE",
      color: "#C75B39",
      bg: "rgba(199,91,57,0.15)",
      border: "rgba(199,91,57,0.3)",
      hasIcon: true,
    });
  }

  if (badges.length > 0) {
    ctx.font = `600 ${9 * S}px "DM Mono"`;
    const totalBadgeW = badges.reduce((acc, b) => {
      const tw = ctx.measureText(b.text).width + 24 * S + (b.hasIcon ? 14 * S : 0);
      return acc + tw;
    }, 0) + (badges.length - 1) * 8 * S;

    let bx = centerX - totalBadgeW / 2;
    for (const badge of badges) {
      const tw = ctx.measureText(badge.text).width + 24 * S + (badge.hasIcon ? 14 * S : 0);
      const bh = 24 * S;
      const by2 = y;

      ctx.fillStyle = badge.bg;
      ctx.strokeStyle = badge.border;
      ctx.lineWidth = 1 * S;
      roundRect(ctx, bx, by2, tw, bh, bh / 2);
      ctx.fill();
      ctx.stroke();

      if (badge.hasIcon) {
        // Load star icon with badge-specific color
        const starSize = 12 * S;
        const starSvg = LUCIDE_SVGS.star.replace(/COLOR/g, badge.color);
        const starBlob = new Blob([starSvg], { type: "image/svg+xml" });
        const starUrl = URL.createObjectURL(starBlob);
        const starImg = new Image();
        starImg.width = starSize;
        starImg.height = starSize;
        try {
          await new Promise<void>((res, rej) => { starImg.onload = () => { URL.revokeObjectURL(starUrl); res(); }; starImg.onerror = rej; starImg.src = starUrl; });
          ctx.drawImage(starImg, bx + 8 * S, by2 + bh / 2 - starSize / 2, starSize, starSize);
        } catch { /* skip icon if load fails */ }
      }

      ctx.fillStyle = badge.color;
      ctx.font = `600 ${9 * S}px "DM Mono"`;
      ctx.textAlign = "left";
      ctx.fillText(badge.text, bx + (badge.hasIcon ? 22 * S : 12 * S), by2 + bh / 2 + 3 * S);

      bx += tw + 8 * S;
    }
    y += 32 * S;
  } else {
    y += 8 * S;
  }

  // ── Divider + POWERED BY LIFTORY ──
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(x0 + 24 * S, y);
  ctx.lineTo(x0 + cw - 24 * S, y);
  ctx.stroke();

  y += 20 * S;
  ctx.font = `400 ${8 * S}px "DM Mono"`;
  ctx.fillStyle = "rgba(250,248,245,0.65)";
  ctx.textAlign = "right";
  ctx.fillText("POWERED BY  ", centerX + 2 * S, y);

  ctx.font = `800 ${10 * S}px Syne`;
  ctx.fillStyle = "#FAF8F5";
  ctx.textAlign = "left";
  ctx.fillText("LIFTORY", centerX + 2 * S, y);

  // ── Export ──
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}
