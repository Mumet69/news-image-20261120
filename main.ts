// The World in One Day — Friday 20 November 2026.
// A newspaper front page drawn entirely in code: no network, no fonts,
// no images. Every pixel is produced by this file, deterministically.
// Run: node main.ts  (writes /output/entry.png, 1024x1024, < 1 MiB)
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette ----
const PAPER: Color = [247, 243, 232, 255];
const INK: Color = [17, 17, 17, 255];
const RED: Color = [185, 28, 28, 255];
const BLUE: Color = [29, 78, 216, 255];
const GOLD: Color = [180, 130, 29, 255];
const TEAL: Color = [13, 116, 128, 255];
const GREEN: Color = [21, 128, 61, 255];
const DARK: Color = [30, 32, 38, 255];
const LIGHT: Color = [255, 255, 255, 255];
const GREY: Color = [90, 88, 80, 255];
const PANEL: Color = [255, 252, 244, 255];
const SKY: Color = [219, 234, 254, 255];
const SAND: Color = [254, 243, 199, 255];
const ROSE: Color = [254, 226, 226, 255];
const MINT: Color = [220, 252, 231, 255];
const LILAC: Color = [237, 233, 254, 255];

type Color = [number, number, number, number];

// ---- canvas ----
const px = new Uint8Array(W * H * 4);
function fill(c: Color): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = c[3];
  }
}
function setPix(x: number, y: number, c: Color): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
}
function rect(x: number, y: number, w: number, h: number, c: Color): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPix(xx, yy, c);
}
function hline(x: number, y: number, w: number, c: Color): void { rect(x, y, w, 1, c); }
function vline(x: number, y: number, h: number, c: Color): void { rect(x, y, 1, h, c); }
function box(x: number, y: number, w: number, h: number, c: Color): void {
  rect(x, y, w, 2, c); rect(x, y + h - 2, w, 2, c);
  rect(x, y, 2, h, c); rect(x + w - 2, y, 2, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: Color): void {
  const dx = Math.abs(x1 - x0); const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; let x = x0; let y = y0;
  for (let n = 0; n < 4000; n++) {
    setPix(x, y, c); setPix(x + 1, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function circle(cx: number, cy: number, r: number, c: Color): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
  }
}
function ring(cx: number, cy: number, r: number, c: Color): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    setPix(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
    setPix(Math.round(cx + r * Math.cos(t)) + 1, Math.round(cy + r * Math.sin(t)), c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Color): void {
  const minX = Math.min(x0, x1, x2); const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2); const maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
    const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
    const g = 1 - a - b;
    if (a >= 0 && b >= 0 && g >= 0) setPix(x, y, c);
  }
}
function star(cx: number, cy: number, r: number, c: Color): void {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    line(cx, cy, Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)), c);
  }
  circle(cx, cy, Math.max(2, Math.floor(r / 4)), c);
}

// ---- 5x7 bitmap font (capitals, digits, punctuation) ----
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};
function charW(scale: number): number { return 6 * scale; }
function textW(s: string, scale: number): number {
  return s.length * charW(scale) - scale;
}
function drawChar(ch: string, x: number, y: number, scale: number, c: Color): void {
  const g = GLYPHS[ch] ?? GLYPHS["?"];
  for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
    if (g[r][col] === "1") rect(x + col * scale, y + r * scale, scale, scale, c);
  }
}
function drawText(s: string, x: number, y: number, scale: number, c: Color): void {
  for (let i = 0; i < s.length; i++) drawChar(s[i], x + i * charW(scale), y, scale, c);
}
function drawCentered(s: string, cx: number, y: number, scale: number, c: Color): void {
  drawText(s, cx - Math.floor(textW(s, scale) / 2), y, scale, c);
}
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textW(test, scale) <= maxW) { cur = test; continue; }
    if (cur !== "") lines.push(cur);
    cur = w;
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawPara(s: string, x: number, y: number, maxW: number, scale: number, c: Color, lh: number): number {
  const lines = wrap(s, maxW, scale);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x, y + i * lh, scale, c);
  return y + lines.length * lh;
}

// ---- PNG encoder (stdlib only) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      const di = y * (1 + W * 3) + 1 + x * 3;
      raw[di] = px[si]; raw[di + 1] = px[si + 1]; raw[di + 2] = px[si + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- picture helpers: one small drawn scene per story ----
function tag(x: number, y: number, s: string, bg: Color): void {
  const w = textW(s, 2) + 16;
  rect(x, y, w, 24, bg);
  drawText(s, x + 8, y + 5, 2, LIGHT);
}
function panel(x: number, y: number, w: number, h: number, bg: Color): void {
  rect(x, y, w, h, PANEL);
  box(x, y, w, h, INK);
  rect(x, y, w, 4, INK);
}

function drawScales(cx: number, cy: number, s: number): void {
  // scales of justice, gold on dark blue disc
  circle(cx, cy, 52 * s, BLUE);
  ring(cx, cy, 52 * s, GOLD);
  vline(cx, cy - 34 * s, 62 * s, GOLD);
  line(cx - 30 * s, cy - 18 * s, cx + 30 * s, cy - 18 * s, GOLD);
  circle(cx, cy - 34 * s, 5 * s, GOLD);
  tri(cx - 40 * s, cy + 8 * s, cx - 20 * s, cy + 8 * s, cx - 30 * s, cy - 16 * s, GOLD);
  tri(cx + 20 * s, cy + 8 * s, cx + 40 * s, cy + 8 * s, cx + 30 * s, cy - 16 * s, GOLD);
  rect(cx - 40 * s, cy + 8 * s, 20 * s, 3 * s, GOLD);
  rect(cx + 20 * s, cy + 8 * s, 20 * s, 3 * s, GOLD);
  rect(cx - 8 * s, cy + 28 * s, 16 * s, 4 * s, GOLD);
}
function drawSummit(cx: number, cy: number): void {
  // three leaders at one table: three heads, three flag bars
  circle(cx, cy - 8, 46, TEAL);
  ring(cx, cy - 8, 46, INK);
  const heads: [number, Color][] = [[-32, RED], [0, GOLD], [32, BLUE]];
  for (const [dx, col] of heads) {
    circle(cx + dx, cy - 22, 13, col);
    rect(cx + dx - 15, cy - 8, 30, 22, col);
  }
  rect(cx - 52, cy + 16, 104, 6, INK);
  rect(cx - 52, cy + 16, 34, 6, RED);
  rect(cx - 17, cy + 16, 34, 6, GOLD);
  rect(cx + 18, cy + 16, 34, 6, BLUE);
}
function drawTanker(cx: number, cy: number): void {
  circle(cx, cy, 48, SKY);
  ring(cx, cy, 48, INK);
  rect(cx - 34, cy - 6, 68, 16, RED);
  tri(cx - 34, cy - 6, cx - 22, cy - 6, cx - 34, cy + 10, RED);
  rect(cx - 26, cy - 18, 12, 12, BLUE);
  rect(cx - 12, cy - 18, 12, 12, GOLD);
  rect(cx + 2, cy - 18, 12, 12, TEAL);
  line(cx - 44, cy + 26, cx - 20, cy + 20, BLUE);
  line(cx - 20, cy + 26, cx + 4, cy + 20, BLUE);
  line(cx + 4, cy + 26, cx + 28, cy + 20, BLUE);
  line(cx + 28, cy + 26, cx + 44, cy + 22, BLUE);
}
function drawTower(cx: number, cy: number): void {
  circle(cx, cy, 48, ROSE);
  ring(cx, cy, 48, INK);
  tri(cx - 14, cy - 40, cx + 14, cy - 40, cx, cy - 52, INK);
  rect(cx - 12, cy - 40, 24, 62, INK);
  for (let i = 0; i < 5; i++) rect(cx - 8, cy - 32 + i * 11, 16, 4, GOLD);
  line(cx - 44, cy - 44, cx - 10, cy - 30, RED);
  line(cx - 10, cy - 30, cx - 2, cy - 18, RED);
  star(cx - 44, cy - 44, 8, RED);
  circle(cx + 26, cy + 30, 4, RED);
}
function drawBridge(cx: number, cy: number): void {
  circle(cx, cy, 48, SAND);
  ring(cx, cy, 48, INK);
  rect(cx - 40, cy + 8, 80, 6, INK);
  rect(cx - 32, cy - 26, 6, 34, INK);
  rect(cx + 26, cy - 26, 6, 34, INK);
  line(cx - 32, cy - 26, cx, cy + 8, INK);
  line(cx + 32, cy - 26, cx, cy + 8, INK);
  star(cx, cy - 6, 14, RED);
  circle(cx, cy - 6, 4, GOLD);
}
function drawMarket(cx: number, cy: number): void {
  circle(cx, cy, 48, MINT);
  ring(cx, cy, 48, INK);
  line(cx - 36, cy + 28, cx - 36, cy - 28, INK);
  line(cx - 36, cy + 28, cx + 40, cy + 28, INK);
  line(cx - 30, cy + 10, cx - 12, cy + 18, RED);
  line(cx - 12, cy + 18, cx + 6, cy + 2, RED);
  line(cx + 6, cy + 2, cx + 34, cy - 22, GREEN);
  tri(cx + 34, cy - 22, cx + 22, cy - 20, cx + 32, cy - 10, GREEN);
  circle(cx + 6, cy + 2, 3, RED);
}
function drawCyclone(cx: number, cy: number): void {
  circle(cx, cy, 48, LILAC);
  ring(cx, cy, 48, INK);
  for (let r = 8; r <= 36; r += 8) {
    for (let a = 0; a < 270; a += 6) {
      const t = (a * Math.PI) / 180;
      setPix(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), TEAL);
      setPix(Math.round(cx + r * Math.cos(t)) + 1, Math.round(cy + r * Math.sin(t)), TEAL);
    }
  }
  circle(cx, cy, 6, RED);
  rect(cx - 40, cy + 34, 80, 4, BLUE);
}
function drawTaiwan(cx: number, cy: number): void {
  circle(cx, cy, 48, SKY);
  ring(cx, cy, 48, INK);
  const xs = [-28, -12, 4, 20];
  const hs = [18, 30, 22, 38];
  for (let i = 0; i < 4; i++) {
    rect(cx + xs[i], cy + 26 - hs[i], 10, hs[i], RED);
    vline(cx + xs[i] + 5, cy + 20 - hs[i], 6, RED);
    vline(cx + xs[i] + 5, cy + 26, 6, RED);
  }
  line(cx - 38, cy + 26, cx + 38, cy + 26, INK);
  circle(cx + 28, cy - 28, 9, GOLD);
  ring(cx + 28, cy - 28, 9, INK);
}

// ---- front page layout ----
function smallPanel(
  x: number, y: number, w: number, h: number,
  tagText: string, tagBg: Color,
  drawIcon: (cx: number, cy: number) => void,
  head1: string, head2: string, sub: string,
): void {
  panel(x, y, w, h, PANEL);
  tag(x + 12, y + 12, tagText, tagBg);
  drawIcon(x + Math.floor(w / 2), y + 88);
  drawCentered(head1, x + Math.floor(w / 2), y + 146, 2, INK);
  if (head2 !== "") drawCentered(head2, x + Math.floor(w / 2), y + 164, 2, INK);
  drawPara(sub, x + 14, y + 190, w - 28, 2, GREY, 17);
}

function drawPage(): void {
  fill(PAPER);
  // masthead
  rect(24, 14, 976, 3, INK);
  drawCentered("THE WORLD IN ONE DAY", 512, 28, 5, INK);
  drawText("8 STORIES", 24, 76, 2, RED);
  drawCentered("FRIDAY 20 NOVEMBER 2026", 512, 74, 3, INK);
  const six = "6 CONTINENTS";
  drawText(six, 1000 - textW(six, 2), 76, 2, RED);
  rect(24, 102, 976, 4, INK);
  rect(24, 108, 976, 2, RED);

  // lead: ICJ genocide ruling
  panel(24, 118, 560, 290, PANEL);
  tag(36, 130, "THE HAGUE - JUSTICE", RED);
  drawScales(122, 252, 1);
  drawText("MYANMAR GUILTY", 200, 176, 3, INK);
  drawText("OF GENOCIDE", 200, 204, 3, RED);
  drawPara(
    "ICJ RULES THE 2017 ROHINGYA CAMPAIGN WAS GENOCIDE - THE FIRST SUCH FINDING AGAINST A STATE",
    36, 322, 512, 2, INK, 18,
  );

  // lead 2: Shenzhen trilateral
  panel(596, 118, 404, 290, PANEL);
  tag(608, 130, "SHENZHEN - SUMMIT", BLUE);
  drawSummit(798, 226);
  drawCentered("TRUMP, XI, PUTIN MEET", 798, 288, 3, INK);
  drawPara(
    "FIRST THREE-WAY SUMMIT - 4-POINT PEACE DECLARATION; UKRAINE FIRST",
    612, 318, 372, 2, INK, 18,
  );

  // row 2
  smallPanel(24, 420, 317, 228, "IRAN - HORMUZ", RED, drawTanker,
    "TRUMP DEFERS", "IRAN DECISION", "TO NEW YEAR - HORMUZ ATTACKS GO ON");
  smallPanel(353, 420, 317, 228, "RIYADH - ATTACK", RED, drawTower,
    "MISSILE HITS", "RIYADH TOWER", "HOUTHI CLAIM 4 TARGETS IN SAUDI ARABIA");
  smallPanel(682, 420, 317, 228, "UKRAINE - WAR", BLUE, drawBridge,
    "CRIMEA BRIDGE", "HIT AGAIN", "3RD STRIKE IN 4 DAYS - BERLIN READY FOR TALKS");

  // row 3
  smallPanel(24, 660, 317, 228, "MARKETS - IPO", GREEN, drawMarket,
    "ANTHROPIC SOARS", "ON RECORD IPO", "$81.3BN - SHARES +17% TO $97");
  smallPanel(353, 660, 317, 228, "INDIA - STORM", TEAL, drawCyclone,
    "CYCLONE AKVAN", "NEARS INDIA", "LANDFALL NEAR GOPALPUR - TRAINS CUT");
  smallPanel(682, 660, 317, 228, "TAIWAN - MARKETS", GOLD, drawTaiwan,
    "TAIWAN ACTS AS", "STOCKS SLIDE", "5,248 PTS LOST IN 3 DAYS - CURBS START");

  // footer ticker
  rect(24, 900, 976, 100, DARK);
  drawText("ALSO TODAY", 40, 916, 2, GOLD);
  drawText("APEC LEADERS MEET - NVIDIA FACES CALIFORNIA PROBE", 40, 940, 2, LIGHT);
  drawText("TOKYO PROTEST DRAWS 13,000 - TRUMP PLANS FRIDAY PRESS CONFERENCE", 40, 962, 2, LIGHT);
}

function main(): void {
  drawPage();
  const png = encodePNG();
  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.png", png);
}

main();
