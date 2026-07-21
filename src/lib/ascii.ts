export const CHARSETS = {
  standard: " .:-=+*#%@",
  detailed:
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
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
  dither: boolean;
};

export type ColorMode = "mono" | "palette";

export type AsciiTheme = {
  mode: ColorMode;
  foreground: string;
  background: string;
  palette: string[];
};

export type PalettePresetKey = keyof typeof COLOR_PALETTES;
export type PresetKey = keyof typeof ASCII_PRESETS;

export const DEFAULT_SETTINGS: AsciiSettings = {
  columns: 110,
  charset: "detailed",
  brightness: 0,
  contrast: 1.2,
  invert: false,
  dither: false,
};

export const DEFAULT_THEME: AsciiTheme = {
  mode: "mono",
  foreground: "#59ffa0",
  background: "#050807",
  palette: ["#59ffa0", "#c8ffe2"],
};

export const ASCII_PRESETS = {
  balanced: DEFAULT_SETTINGS,
  crisp: {
    columns: 120,
    charset: "detailed",
    brightness: -0.02,
    contrast: 1.5,
    invert: false,
    dither: false,
  },
  punchy: {
    columns: 100,
    charset: "standard",
    brightness: 0.08,
    contrast: 1.8,
    invert: false,
    dither: true,
  },
  retro: {
    columns: 90,
    charset: "blocks",
    brightness: 0,
    contrast: 1.3,
    invert: false,
    dither: true,
  },
} as const satisfies Record<string, AsciiSettings>;

export const COLOR_PALETTES = {
  terminal: ["#2ee66b", "#7dffb0", "#d7ffe8"],
  amber: ["#ff9a1f", "#ffc15a", "#ffe1a8"],
  synthwave: ["#ff4fd8", "#9d7dff", "#71e5ff"],
  ice: ["#7fe7ff", "#b9f2ff", "#effcff"],
  fire: ["#ff5a36", "#ff9d2d", "#ffe066"],
} as const satisfies Record<string, readonly string[]>;

export type AsciiRenderCell = {
  char: string;
  tone: number;
  color: string;
};

export type AsciiRenderData = {
  ascii: string;
  columns: number;
  rows: number;
  cells: AsciiRenderCell[];
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

function normalizePalette(palette: string[]) {
  return palette.filter(Boolean).slice(0, 5);
}

function getToneColor(tone: number, theme: AsciiTheme) {
  if (theme.mode === "mono") return theme.foreground;

  const palette = normalizePalette(theme.palette);
  if (palette.length === 0) return theme.foreground;
  if (palette.length === 1) return palette[0];

  const index = Math.round(clamp(tone, 0, 1) * (palette.length - 1));
  return palette[index];
}

/** Floyd–Steinberg error diffusion in charset index space */
function ditherIndices(
  tones: Float32Array,
  columns: number,
  rows: number,
  maxIndex: number
): Uint8Array {
  const grid = new Float32Array(tones);
  const indices = new Uint8Array(columns * rows);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const pos = y * columns + x;
      const old = grid[pos];
      const index = Math.round(clamp(old, 0, maxIndex));
      indices[pos] = index;

      const error = old - index;
      if (x + 1 < columns) grid[pos + 1] += error * (7 / 16);
      if (y + 1 < rows) {
        const below = pos + columns;
        if (x > 0) grid[below - 1] += error * (3 / 16);
        grid[below] += error * (5 / 16);
        if (x + 1 < columns) grid[below + 1] += error * (1 / 16);
      }
    }
  }

  return indices;
}

export function imageToAscii(
  image: HTMLImageElement,
  settings: AsciiSettings
): string {
  return imageToAsciiRenderData(image, settings, DEFAULT_THEME).ascii;
}

export function imageToAsciiRenderData(
  image: HTMLImageElement,
  settings: AsciiSettings,
  theme: AsciiTheme
): AsciiRenderData {
  const charset = CHARSETS[settings.charset];
  const maxIndex = charset.length - 1;
  const columns = Math.max(10, Math.round(settings.columns));
  const rows = Math.max(
    1,
    Math.round((image.height / image.width) * columns * CHAR_ASPECT)
  );

  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { ascii: "", columns, rows, cells: [] };
  }

  ctx.drawImage(image, 0, 0, columns, rows);
  const { data } = ctx.getImageData(0, 0, columns, rows);

  const tones = new Float32Array(columns * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = (y * columns + x) * 4;
      const luminance =
        (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      tones[y * columns + x] = mapBrightness(
        luminance,
        settings.brightness,
        settings.contrast,
        settings.invert
      );
    }
  }

  const scaled = new Float32Array(columns * rows);
  for (let i = 0; i < tones.length; i++) {
    scaled[i] = tones[i] * maxIndex;
  }

  const indices = settings.dither
    ? ditherIndices(scaled, columns, rows, maxIndex)
    : Uint8Array.from(scaled, (v) => Math.round(clamp(v, 0, maxIndex)));

  const lines: string[] = [];
  const cells: AsciiRenderCell[] = [];

  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < columns; x++) {
      const position = y * columns + x;
      const tone = tones[position];
      const char = charset[indices[position]];
      row += char;
      cells.push({ char, tone, color: getToneColor(tone, theme) });
    }
    lines.push(row);
  }

  return {
    ascii: lines.join("\n"),
    columns,
    rows,
    cells,
  };
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
  renderData: AsciiRenderData,
  theme: AsciiTheme,
  options: { fontSize?: number } = {}
): HTMLCanvasElement {
  const fontSize = options.fontSize ?? 10;
  const canvas = document.createElement("canvas");
  const charWidth = fontSize * 0.6;
  const charHeight = fontSize * 1.2;

  canvas.width = Math.ceil(renderData.columns * charWidth);
  canvas.height = Math.ceil(renderData.rows * charHeight);

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
  ctx.textBaseline = "top";

  for (let y = 0; y < renderData.rows; y++) {
    for (let x = 0; x < renderData.columns; x++) {
      const cell = renderData.cells[y * renderData.columns + x];
      if (!cell || cell.char === " ") continue;
      ctx.fillStyle = cell.color;
      ctx.fillText(cell.char, x * charWidth, y * charHeight);
    }
  }

  return canvas;
}

export function downloadAsciiPng(
  renderData: AsciiRenderData,
  theme: AsciiTheme,
  filename = "ascii-art.png"
) {
  const canvas = renderAsciiToCanvas(renderData, theme);
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
