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

// Simple icon drawings (16×16 at scale)
function drawClockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = "round";
  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  // Hour hand
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - size * 0.25);
  ctx.stroke();
  // Minute hand
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + size * 0.18, cy);
  ctx.stroke();
}

function drawDumbbellIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = "round";
  const hw = size * 0.38;
  const bw = size * 0.15;
  // Bar
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx + hw, cy);
  ctx.stroke();
  // Left weight
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - size * 0.22);
  ctx.lineTo(cx - hw, cy + size * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - hw + bw, cy - size * 0.16);
  ctx.lineTo(cx - hw + bw, cy + size * 0.16);
  ctx.stroke();
  // Right weight
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - size * 0.22);
  ctx.lineTo(cx + hw, cy + size * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + hw - bw, cy - size * 0.16);
  ctx.lineTo(cx + hw - bw, cy + size * 0.16);
  ctx.stroke();
}

function drawTrendUpIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size * 0.36;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy + s * 0.6);
  ctx.lineTo(cx - s * 0.1, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.1);
  ctx.lineTo(cx + s, cy - s * 0.6);
  ctx.stroke();
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.4, cy - s * 0.6);
  ctx.lineTo(cx + s, cy - s * 0.6);
  ctx.lineTo(cx + s, cy - s * 0.05);
  ctx.stroke();
}

function drawTrophyIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size * 0.35;
  // Cup body
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s);
  ctx.lineTo(cx - s * 0.7, cy + s * 0.3);
  ctx.quadraticCurveTo(cx, cy + s * 0.8, cx + s * 0.7, cy + s * 0.3);
  ctx.lineTo(cx + s, cy - s);
  ctx.stroke();
  // Base
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.lineTo(cx, cy + s * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy + s * 0.8);
  ctx.lineTo(cx + s * 0.5, cy + s * 0.8);
  ctx.stroke();
}

function drawStarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.fillStyle = color;
  const r = size * 0.35;
  const ir = r * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(outerAngle), cy + r * Math.sin(outerAngle));
    else ctx.lineTo(cx + r * Math.cos(outerAngle), cy + r * Math.sin(outerAngle));
    ctx.lineTo(cx + ir * Math.cos(innerAngle), cy + ir * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fill();
}

// ── Main Renderer ────────────────────────────────────────────────

const CARD_W_CSS = 370; // CSS pixels
const CARD_H_CSS = 490; // CSS pixels

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

  // Score number
  ctx.font = `700 ${46 * S}px "DM Mono"`;
  ctx.fillStyle = "#FAF8F5";
  ctx.textAlign = "right";
  const scoreStr = String(opts.score);
  const scoreW = ctx.measureText(scoreStr).width;
  const scoreRightX = centerX + scoreW / 2 + 4 * S;
  ctx.fillText(scoreStr, scoreRightX, ringCY + 16 * S);

  // "/100"
  ctx.font = `400 ${13 * S}px "DM Mono"`;
  ctx.fillStyle = "rgba(250,248,245,0.3)";
  ctx.textAlign = "left";
  ctx.fillText("/100", scoreRightX + 2 * S, ringCY + 16 * S);

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
    { icon: drawClockIcon, label: "DURACI\u00D3N", value: opts.duration },
    { icon: drawDumbbellIcon, label: "SETS", value: `${opts.completedSets}/${opts.totalSets}` },
    { icon: drawTrendUpIcon, label: "VOLUMEN", value: `${opts.volume.toLocaleString()} ${opts.weightUnit}` },
    { icon: drawTrophyIcon, label: "PRs", value: String(opts.prs) },
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

    // Icon
    const iconSize = 14 * S;
    stat.icon(ctx, bx + boxW / 2, by + 16 * S, iconSize, "rgba(250,248,245,0.4)");

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
        drawStarIcon(ctx, bx + 14 * S, by2 + bh / 2, 12 * S, badge.color);
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
