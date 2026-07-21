"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ASCII_PRESETS,
  CHARSETS,
  COLOR_PALETTES,
  DEFAULT_THEME,
  type AsciiRenderData,
  type AsciiSettings,
  type AsciiTheme,
  type CharsetKey,
  type PalettePresetKey,
  type PresetKey,
  DEFAULT_SETTINGS,
  copyAscii,
  downloadAscii,
  downloadAsciiPng,
  imageToAsciiRenderData,
} from "@/lib/ascii";

type Status = "idle" | "loading" | "ready" | "error";

function ControlRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between panel-heading">
        <span>{label}</span>
        <span style={{ color: "var(--accent)" }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="panel-heading"
      style={{ color: "var(--muted)", opacity: 0.6, fontSize: "9px" }}
    >
      {children}
    </p>
  );
}

function toggleStyle(active: boolean) {
  return {
    width: 36,
    height: 18,
    borderRadius: 999,
    background: active ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    cursor: "pointer",
    position: "relative" as const,
    transition: "all 160ms ease",
  };
}

function knobStyle(active: boolean) {
  return {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: active ? "var(--accent)" : "var(--muted)",
    left: active ? 20 : 2,
    top: 2,
    boxShadow: active ? "0 0 8px var(--accent)" : "none",
    position: "absolute" as const,
    transition: "all 160ms ease",
  };
}

export default function Converter() {
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<AsciiTheme>(DEFAULT_THEME);
  const [renderData, setRenderData] = useState<AsciiRenderData | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("balanced");
  const [selectedPalette, setSelectedPalette] =
    useState<PalettePresetKey>("terminal");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const ascii = renderData?.ascii ?? "";

  const asciiRows = useMemo(() => {
    if (!renderData) return [];
    return Array.from({ length: renderData.rows }, (_, rowIndex) =>
      renderData.cells.slice(
        rowIndex * renderData.columns,
        (rowIndex + 1) * renderData.columns
      )
    );
  }, [renderData]);

  const updateSetting = <K extends keyof AsciiSettings>(
    key: K,
    value: AsciiSettings[K]
  ) => {
    setSelectedPreset("balanced");
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateTheme = <K extends keyof AsciiTheme>(
    key: K,
    value: AsciiTheme[K]
  ) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const updatePaletteColor = (index: number, color: string) => {
    setTheme((prev) => ({
      ...prev,
      palette: prev.palette.map((value, paletteIndex) =>
        paletteIndex === index ? color : value
      ),
    }));
  };

  const applyPreset = (preset: PresetKey) => {
    setSelectedPreset(preset);
    setSettings({ ...ASCII_PRESETS[preset] });
  };

  const applyPalettePreset = (paletteKey: PalettePresetKey) => {
    setSelectedPalette(paletteKey);
    setTheme((prev) => ({
      ...prev,
      palette: [...COLOR_PALETTES[paletteKey]],
      foreground: COLOR_PALETTES[paletteKey][0],
    }));
  };

  const resetSettings = () => {
    setSelectedPreset("balanced");
    setSelectedPalette("terminal");
    setSettings({ ...DEFAULT_SETTINGS });
    setTheme({
      ...DEFAULT_THEME,
      palette: [...DEFAULT_THEME.palette],
    });
  };

  const runConversion = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    setRenderData(imageToAsciiRenderData(img, settings, theme));
    setStatus("ready");
  }, [settings, theme]);

  useEffect(() => {
    if (imageRef.current) {
      runConversion();
    }
  }, [runConversion]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !renderData) return;

    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const contentW = renderData.columns * 6;
      const contentH = renderData.rows * 10;
      const scale = Math.min(
        1,
        (parent.clientWidth - 48) / contentW,
        (parent.clientHeight - 48) / contentH
      );
      setPreviewScale(scale || 1);
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [renderData]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setStatus("loading");
    setRenderData(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setRenderData(imageToAsciiRenderData(img, settings, theme));
        setStatus("ready");
      };
      img.onerror = () => setStatus("error");
      img.src = reader.result as string;
    };
    reader.onerror = () => setStatus("error");
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleCopy = async () => {
    if (!ascii) return;
    await copyAscii(ascii);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseName = fileName.replace(/\.[^.]+$/, "") || "ascii-art";

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <header
        className="relative z-10 px-6 py-7"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-3">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              img
              <span style={{ color: "var(--accent)" }}>▸</span>
              ascii
            </h1>
            <span
              className="panel-heading hidden sm:block"
              style={{ color: "var(--muted)" }}
            >
              browser-native · no upload
            </span>
          </div>

          <div className="flex items-center gap-3">
            {status === "ready" && renderData && (
              <>
                <span className="status-pill hidden sm:inline-flex">ready</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs transition-all"
                    style={{
                      border: "1px solid var(--border)",
                      color: copied ? "var(--accent)" : "var(--muted)",
                      borderColor: copied ? "var(--accent)" : undefined,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {copied ? "✓ copied" : "copy"}
                  </button>
                  <button
                    onClick={() => downloadAscii(ascii, `${baseName}.txt`)}
                    className="px-3 py-1.5 text-xs transition-all"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    .txt
                  </button>
                  <button
                    onClick={() =>
                      downloadAsciiPng(renderData, theme, `${baseName}.png`)
                    }
                    className="px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background: "var(--accent)",
                      color: "#020a04",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    .png
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-8 grid lg:grid-cols-[320px_1fr] gap-5 lg:gap-6">
        <aside className="flex flex-col gap-5">
          <div>
            <div
              className="panel-heading mb-3"
              style={{ color: "var(--muted)" }}
            >
              01 — image
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer relative overflow-hidden transition-all"
              style={{
                border: `2px dashed ${
                  isDragging ? "var(--accent)" : "var(--border)"
                }`,
                background: isDragging ? "var(--accent-soft)" : "transparent",
                padding: "28px 20px",
                textAlign: "center",
              }}
            >
              <span
                className="absolute top-0 left-0"
                style={{
                  width: 12,
                  height: 12,
                  borderTop: "2px solid var(--accent)",
                  borderLeft: "2px solid var(--accent)",
                  opacity: isDragging ? 1 : 0.5,
                }}
              />
              <span
                className="absolute top-0 right-0"
                style={{
                  width: 12,
                  height: 12,
                  borderTop: "2px solid var(--accent)",
                  borderRight: "2px solid var(--accent)",
                  opacity: isDragging ? 1 : 0.5,
                }}
              />
              <span
                className="absolute bottom-0 left-0"
                style={{
                  width: 12,
                  height: 12,
                  borderBottom: "2px solid var(--accent)",
                  borderLeft: "2px solid var(--accent)",
                  opacity: isDragging ? 1 : 0.5,
                }}
              />
              <span
                className="absolute bottom-0 right-0"
                style={{
                  width: 12,
                  height: 12,
                  borderBottom: "2px solid var(--accent)",
                  borderRight: "2px solid var(--accent)",
                  opacity: isDragging ? 1 : 0.5,
                }}
              />

              <svg
                className="mx-auto mb-3"
                style={{
                  width: 28,
                  height: 28,
                  color: isDragging ? "var(--accent)" : "var(--muted)",
                  opacity: isDragging ? 1 : 0.5,
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16v-8m-4 4l4-4 4 4M4 20h16"
                />
              </svg>
              <p
                className="text-xs"
                style={{
                  color: isDragging ? "var(--accent)" : "var(--muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {isDragging
                  ? "release to convert"
                  : fileName
                    ? fileName
                    : "drop or click to upload"}
              </p>
              {fileName && !isDragging && (
                <p
                  className="mt-2 text-xs"
                  style={{
                    color: "var(--accent)",
                    opacity: 0.8,
                    letterSpacing: "0.08em",
                  }}
                >
                  ↑ click to change
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="panel-heading" style={{ color: "var(--muted)" }}>
                02 — settings
              </div>
              <button
                type="button"
                onClick={resetSettings}
                className="panel-heading transition-colors"
                style={{ color: "var(--muted)", opacity: 0.6 }}
              >
                reset ↺
              </button>
            </div>

            <div className="glass-panel p-5 flex flex-col gap-6">
              <div className="space-y-3">
                <SectionLabel>preset</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ASCII_PRESETS) as PresetKey[]).map((preset) => {
                    const active = selectedPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="py-2 text-xs transition-all"
                        style={{
                          border: `1px solid ${
                            active ? "var(--accent)" : "var(--border)"
                          }`,
                          background: active
                            ? "var(--accent-soft)"
                            : "transparent",
                          color: active ? "var(--accent)" : "var(--muted)",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="flex flex-col gap-5"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
              >
                <SectionLabel>detail</SectionLabel>

                <ControlRow label="width" value={`${settings.columns} cols`}>
                  <input
                    type="range"
                    min={30}
                    max={200}
                    value={settings.columns}
                    onChange={(e) =>
                      updateSetting("columns", Number(e.target.value))
                    }
                  />
                </ControlRow>

                <ControlRow label="charset" value={settings.charset}>
                  <select
                    value={settings.charset}
                    onChange={(e) =>
                      updateSetting("charset", e.target.value as CharsetKey)
                    }
                    className="w-full text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "7px 8px",
                    }}
                  >
                    {(Object.keys(CHARSETS) as CharsetKey[]).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </ControlRow>
              </div>

              <div
                className="flex flex-col gap-5"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
              >
                <SectionLabel>tone</SectionLabel>

                <ControlRow
                  label="contrast"
                  value={settings.contrast.toFixed(1)}
                >
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={settings.contrast}
                    onChange={(e) =>
                      updateSetting("contrast", Number(e.target.value))
                    }
                  />
                </ControlRow>

                <ControlRow
                  label="brightness"
                  value={settings.brightness.toFixed(2)}
                >
                  <input
                    type="range"
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                    value={settings.brightness}
                    onChange={(e) =>
                      updateSetting("brightness", Number(e.target.value))
                    }
                  />
                </ControlRow>

                <ControlRow label="gamma" value={settings.gamma.toFixed(2)}>
                  <input
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.05}
                    value={settings.gamma}
                    onChange={(e) =>
                      updateSetting("gamma", Number(e.target.value))
                    }
                  />
                </ControlRow>

                <ControlRow
                  label="black point"
                  value={settings.blackPoint.toFixed(2)}
                >
                  <input
                    type="range"
                    min={0}
                    max={0.45}
                    step={0.01}
                    value={settings.blackPoint}
                    onChange={(e) =>
                      updateSetting(
                        "blackPoint",
                        Math.min(Number(e.target.value), settings.whitePoint - 0.01)
                      )
                    }
                  />
                </ControlRow>

                <ControlRow
                  label="white point"
                  value={settings.whitePoint.toFixed(2)}
                >
                  <input
                    type="range"
                    min={0.55}
                    max={1}
                    step={0.01}
                    value={settings.whitePoint}
                    onChange={(e) =>
                      updateSetting(
                        "whitePoint",
                        Math.max(Number(e.target.value), settings.blackPoint + 0.01)
                      )
                    }
                  />
                </ControlRow>
              </div>

              <div
                className="flex flex-col gap-4"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
              >
                <SectionLabel>effects</SectionLabel>

                <label
                  className="flex items-center justify-between text-xs cursor-pointer"
                  style={{
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  <span>invert</span>
                  <div
                    onClick={() => updateSetting("invert", !settings.invert)}
                    style={toggleStyle(settings.invert)}
                  >
                    <span style={knobStyle(settings.invert)} />
                  </div>
                </label>

                <label
                  className="flex items-center justify-between text-xs cursor-pointer"
                  style={{
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  <span>dither</span>
                  <div
                    onClick={() => updateSetting("dither", !settings.dither)}
                    style={toggleStyle(settings.dither)}
                  >
                    <span style={knobStyle(settings.dither)} />
                  </div>
                </label>
              </div>

              <div
                className="flex flex-col gap-5"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
              >
                <SectionLabel>color</SectionLabel>

                <ControlRow label="mode" value={theme.mode}>
                  <div className="grid grid-cols-2 gap-2">
                    {(["mono", "palette"] as const).map((mode) => {
                      const active = theme.mode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateTheme("mode", mode)}
                          className="py-2 text-xs transition-all"
                          style={{
                            border: `1px solid ${
                              active ? "var(--accent)" : "var(--border)"
                            }`,
                            background: active
                              ? "var(--accent-soft)"
                              : "transparent",
                            color: active ? "var(--accent)" : "var(--muted)",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                          }}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </ControlRow>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="panel-heading">text</span>
                    <input
                      type="color"
                      value={theme.foreground}
                      onChange={(e) => updateTheme("foreground", e.target.value)}
                      className="w-full h-10 bg-transparent border-0 cursor-pointer"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="panel-heading">background</span>
                    <input
                      type="color"
                      value={theme.background}
                      onChange={(e) => updateTheme("background", e.target.value)}
                      className="w-full h-10 bg-transparent border-0 cursor-pointer"
                    />
                  </label>
                </div>

                {theme.mode === "palette" && (
                  <>
                    <ControlRow label="palette" value={selectedPalette}>
                      <select
                        value={selectedPalette}
                        onChange={(e) =>
                          applyPalettePreset(
                            e.target.value as PalettePresetKey
                          )
                        }
                        className="w-full text-xs outline-none"
                        style={{
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                          padding: "7px 8px",
                        }}
                      >
                        {(Object.keys(COLOR_PALETTES) as PalettePresetKey[]).map(
                          (paletteKey) => (
                            <option key={paletteKey} value={paletteKey}>
                              {paletteKey}
                            </option>
                          )
                        )}
                      </select>
                    </ControlRow>

                    <div className="grid grid-cols-3 gap-3">
                      {theme.palette.map((color, index) => (
                        <label key={`${color}-${index}`} className="space-y-2">
                          <span className="panel-heading">c{index + 1}</span>
                          <input
                            type="color"
                            value={color}
                            onChange={(e) =>
                              updatePaletteColor(index, e.target.value)
                            }
                            className="w-full h-10 bg-transparent border-0 cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-0" style={{ minHeight: 520 }}>
          <div
            className="panel-heading mb-3"
            style={{ color: "var(--muted)" }}
          >
            03 — preview
            {status === "ready" && fileName && (
              <span style={{ color: "var(--accent)", marginLeft: 12 }}>
                {fileName}
              </span>
            )}
          </div>

          <div
            className="preview-frame glass-panel flex-1 flex flex-col overflow-hidden"
            style={{ minHeight: 480, background: theme.background }}
          >
            {status === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10 text-center">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 4,
                    width: 48,
                    opacity: 0.25,
                  }}
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 22,
                        background: "var(--muted)",
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    no image loaded
                  </p>
                  <p
                    className="text-xs max-w-xs"
                    style={{ color: "var(--muted)", opacity: 0.5 }}
                  >
                    drop an image in the panel on the left to begin
                  </p>
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
                <div
                  className="animate-spin"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2px solid var(--border)",
                    borderTopColor: "var(--accent)",
                  }}
                />
                <p
                  className="text-xs animate-pulse"
                  style={{
                    color: "var(--accent)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  converting
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
                <svg
                  style={{
                    width: 40,
                    height: 40,
                    color: "#f87171",
                    opacity: 0.7,
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <div className="space-y-1">
                  <p className="text-sm" style={{ color: "#f87171" }}>
                    failed to load image
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--muted)", opacity: 0.6 }}
                  >
                    use a valid image file (jpg, png, gif, webp…)
                  </p>
                </div>
              </div>
            )}

            {status === "ready" && renderData && (
              <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
                <div
                  ref={previewRef}
                  className="ascii-output select-all cursor-text"
                  style={{
                    fontSize: `${previewScale * 10}px`,
                    transformOrigin: "center center",
                    lineHeight: 1,
                    background: theme.background,
                    color: theme.foreground,
                  }}
                >
                  {asciiRows.map((row, rowIndex) => (
                    <div key={rowIndex} style={{ height: `${previewScale * 10}px` }}>
                      {row.map((cell, cellIndex) => (
                        <span key={`${rowIndex}-${cellIndex}`} style={{ color: cell.color }}>
                          {cell.char}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
