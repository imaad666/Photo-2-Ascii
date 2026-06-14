export const CHARSETS = {
  standard: " .:-=+*#%@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  minimal: " .:#",
} as const;

export type CharsetKey = keyof typeof CHARSETS;

export type AsciiSettings = {
  columns: number;
  charset: CharsetKey;
  brightness: number;
  contrast: number;
  invert: boolean;
};

export const DEFAULT_SETTINGS: AsciiSettings = {
  columns: 100,
  charset: "standard",
  brightness: 0,
  contrast: 1,
  invert: false,
};

/** Monospace chars are roughly twice as tall as wide */
const CHAR_ASPECT = 0.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapBrightness(
  value: number,
  brightness: number,
  contrast: number,
  invert: boolean
) {
  let v = (value - 0.5) * contrast + 0.5 + brightness;
  v = clamp(v, 0, 1);
  if (invert) v = 1 - v;
  return v;
}

export function imageToAscii(
  image: HTMLImageElement,
  settings: AsciiSettings
): string {
  const charset = CHARSETS[settings.charset];
  const columns = Math.max(10, Math.round(settings.columns));
  const rows = Math.max(
    1,
    Math.round((image.height / image.width) * columns * CHAR_ASPECT)
  );

  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  ctx.drawImage(image, 0, 0, columns, rows);
  const { data } = ctx.getImageData(0, 0, columns, rows);

  const lines: string[] = [];

  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < columns; x++) {
      const i = (y * columns + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const mapped = mapBrightness(
        luminance,
        settings.brightness,
        settings.contrast,
        settings.invert
      );
      const index = Math.min(
        charset.length - 1,
        Math.floor(mapped * charset.length)
      );
      row += charset[index];
    }
    lines.push(row);
  }

  return lines.join("\n");
}

export function asciiToBlob(ascii: string): Blob {
  return new Blob([ascii], { type: "text/plain;charset=utf-8" });
}

export function downloadAscii(ascii: string, filename = "ascii-art.txt") {
  const url = URL.createObjectURL(asciiToBlob(ascii));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyAscii(ascii: string) {
  await navigator.clipboard.writeText(ascii);
}

export function renderAsciiToCanvas(
  ascii: string,
  options: { fontSize?: number; color?: string; background?: string } = {}
): HTMLCanvasElement {
  const fontSize = options.fontSize ?? 10;
  const color = options.color ?? "#33ff66";
  const background = options.background ?? "#0a0a0a";

  const lines = ascii.split("\n");
  const cols = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const rows = lines.length;

  const canvas = document.createElement("canvas");
  const charWidth = fontSize * 0.6;
  const charHeight = fontSize * 1.2;

  canvas.width = Math.ceil(cols * charWidth);
  canvas.height = Math.ceil(rows * charHeight);

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
  ctx.textBaseline = "top";

  for (let y = 0; y < lines.length; y++) {
    ctx.fillText(lines[y], 0, y * charHeight);
  }

  return canvas;
}

export function downloadAsciiPng(ascii: string, filename = "ascii-art.png") {
  const canvas = renderAsciiToCanvas(ascii);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  });
}
