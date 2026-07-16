"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASCII_PRESETS,
  CHARSETS,
  type AsciiSettings,
  type CharsetKey,
  type PresetKey,
  DEFAULT_SETTINGS,
  copyAscii,
  downloadAscii,
  downloadAsciiPng,
  imageToAscii,
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

export default function Converter() {
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const [ascii, setAscii] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("balanced");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLPreElement>(null);

  const updateSetting = <K extends keyof AsciiSettings>(
    key: K,
    value: AsciiSettings[K]
  ) => {
    setSelectedPreset("balanced");
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: PresetKey) => {
    setSelectedPreset(preset);
    setSettings({ ...ASCII_PRESETS[preset] });
  };

  const resetSettings = () => {
    setSelectedPreset("balanced");
    setSettings({ ...DEFAULT_SETTINGS });
  };

  const runConversion = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    setAscii(imageToAscii(img, settings));
    setStatus("ready");
  }, [settings]);

  useEffect(() => {
    if (imageRef.current) {
      runConversion();
    }
  }, [runConversion]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !ascii) return;

    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const cols = ascii.split("\n")[0]?.length ?? 1;
      const rows = ascii.split("\n").length;
      const charW = 6;
      const charH = 10;
      const contentW = cols * charW;
      const contentH = rows * charH;
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
  }, [ascii]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setStatus("loading");
    setAscii("");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setAscii(imageToAscii(img, settings));
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
      {/* ── Header ── */}
      <header
        className="relative z-10 px-6 py-7"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Brand */}
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

          {/* Status + export actions */}
          <div className="flex items-center gap-3">
            {status === "ready" && (
              <>
                <span className="status-pill hidden sm:inline-flex">
                  ready
                </span>
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
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--accent)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--muted)";
                    }}
                  >
                    .txt
                  </button>
                  <button
                    onClick={() =>
                      downloadAsciiPng(ascii, `${baseName}.png`)
                    }
                    className="px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background: "var(--accent)",
                      color: "#020a04",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.filter =
                        "brightness(1.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.filter = "";
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

      {/* ── Main layout ── */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-8 grid lg:grid-cols-[300px_1fr] gap-5 lg:gap-6">

        {/* ── Sidebar ── */}
        <aside className="flex flex-col gap-5">

          {/* Upload */}
          <div>
            <div
              className="panel-heading mb-3"
              style={{ color: "var(--muted)" }}
            >
              01 — image
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer relative overflow-hidden transition-all"
              style={{
                border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
                background: isDragging ? "var(--accent-soft)" : "transparent",
                padding: "28px 20px",
                textAlign: "center",
              }}
            >
              {/* Corner decorations */}
              <span
                className="absolute top-0 left-0"
                style={{ width: 12, height: 12, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", opacity: isDragging ? 1 : 0.5 }}
              />
              <span
                className="absolute top-0 right-0"
                style={{ width: 12, height: 12, borderTop: "2px solid var(--accent)", borderRight: "2px solid var(--accent)", opacity: isDragging ? 1 : 0.5 }}
              />
              <span
                className="absolute bottom-0 left-0"
                style={{ width: 12, height: 12, borderBottom: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", opacity: isDragging ? 1 : 0.5 }}
              />
              <span
                className="absolute bottom-0 right-0"
                style={{ width: 12, height: 12, borderBottom: "2px solid var(--accent)", borderRight: "2px solid var(--accent)", opacity: isDragging ? 1 : 0.5 }}
              />

              <svg
                className="mx-auto mb-3"
                style={{ width: 28, height: 28, color: isDragging ? "var(--accent)" : "var(--muted)", opacity: isDragging ? 1 : 0.5 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m-4 4l4-4 4 4M4 20h16" />
              </svg>
              <p
                className="text-xs"
                style={{ color: isDragging ? "var(--accent)" : "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}
              >
                {isDragging ? "release to convert" : fileName ? fileName : "drop or click to upload"}
              </p>
              {fileName && !isDragging && (
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--accent)", opacity: 0.8, letterSpacing: "0.08em" }}
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

          {/* Settings panel */}
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
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.6";
                }}
              >
                reset ↺
              </button>
            </div>

            <div className="glass-panel p-5 flex flex-col gap-6">
              {/* Presets */}
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
                          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                          background: active ? "var(--accent-soft)" : "transparent",
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

              {/* Core detail */}
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
                    onChange={(e) => updateSetting("columns", Number(e.target.value))}
                  />
                </ControlRow>

                <ControlRow label="charset" value={settings.charset}>
                  <select
                    value={settings.charset}
                    onChange={(e) => updateSetting("charset", e.target.value as CharsetKey)}
                    className="w-full text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "7px 8px",
                    }}
                  >
                    {(Object.keys(CHARSETS) as CharsetKey[]).map((key) => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </ControlRow>
              </div>

              {/* Tone shaping */}
              <div
                className="flex flex-col gap-5"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
              >
                <SectionLabel>tone</SectionLabel>

                <ControlRow label="contrast" value={settings.contrast.toFixed(1)}>
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={settings.contrast}
                    onChange={(e) => updateSetting("contrast", Number(e.target.value))}
                  />
                </ControlRow>

                <ControlRow label="brightness" value={settings.brightness.toFixed(2)}>
                  <input
                    type="range"
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                    value={settings.brightness}
                    onChange={(e) => updateSetting("brightness", Number(e.target.value))}
                  />
                </ControlRow>
              </div>

              {/* Effects */}
              <div
                className="flex flex-col gap-4"
                style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
              >
                <SectionLabel>effects</SectionLabel>

                <label
                  className="flex items-center justify-between text-xs cursor-pointer"
                  style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}
                >
                  <span>invert</span>
                  <div
                    onClick={() => updateSetting("invert", !settings.invert)}
                    className="relative transition-all"
                    style={{
                      width: 36,
                      height: 18,
                      borderRadius: 999,
                      background: settings.invert ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${settings.invert ? "var(--accent)" : "var(--border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="absolute top-0.5 transition-all"
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: settings.invert ? "var(--accent)" : "var(--muted)",
                        left: settings.invert ? 20 : 2,
                        boxShadow: settings.invert ? "0 0 8px var(--accent)" : "none",
                      }}
                    />
                  </div>
                </label>

                <label
                  className="flex items-center justify-between text-xs cursor-pointer"
                  style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}
                >
                  <span>dither</span>
                  <div
                    onClick={() => updateSetting("dither", !settings.dither)}
                    className="relative transition-all"
                    style={{
                      width: 36,
                      height: 18,
                      borderRadius: 999,
                      background: settings.dither ? "var(--accent-soft)" : "transparent",
                      border: `1px solid ${settings.dither ? "var(--accent)" : "var(--border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="absolute top-0.5 transition-all"
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: settings.dither ? "var(--accent)" : "var(--muted)",
                        left: settings.dither ? 20 : 2,
                        boxShadow: settings.dither ? "0 0 8px var(--accent)" : "none",
                      }}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Preview ── */}
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
            style={{ minHeight: 480 }}
          >
            {/* idle */}
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

            {/* loading */}
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
                  style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase" }}
                >
                  converting
                </p>
              </div>
            )}

            {/* error */}
            {status === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
                <svg
                  style={{ width: 40, height: 40, color: "#f87171", opacity: 0.7 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div className="space-y-1">
                  <p className="text-sm" style={{ color: "#f87171" }}>failed to load image</p>
                  <p className="text-xs" style={{ color: "var(--muted)", opacity: 0.6 }}>
                    use a valid image file (jpg, png, gif, webp…)
                  </p>
                </div>
              </div>
            )}

            {/* ready */}
            {status === "ready" && ascii && (
              <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
                <pre
                  ref={previewRef}
                  className="ascii-output ascii-glow select-all cursor-text"
                  style={{
                    fontSize: `${previewScale * 10}px`,
                    transformOrigin: "center center",
                  }}
                >
                  {ascii}
                </pre>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
