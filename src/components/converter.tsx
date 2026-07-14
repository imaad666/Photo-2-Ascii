"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHARSETS,
  type AsciiSettings,
  type CharsetKey,
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
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--muted)]">
        <span>{label}</span>
        <span className="text-[var(--accent)]">{value}</span>
      </div>
      {children}
    </div>
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLPreElement>(null);

  const updateSetting = <K extends keyof AsciiSettings>(
    key: K,
    value: AsciiSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
        (parent.clientWidth - 32) / contentW,
        (parent.clientHeight - 32) / contentH
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
    <div className="min-h-screen flex flex-col">
      {/* Hero Header */}
      <header className="border-b border-[var(--border)] px-6 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            Image<span className="text-[var(--accent)]">→</span>ASCII
          </h1>
          <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
            Transform any image into beautiful ASCII art. Upload, tune, and export in seconds — all in your browser.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-8 grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar Controls */}
        <aside className="space-y-6">
          {/* Upload Area */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">
              1. Upload Image
            </h2>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-sm p-8 text-center transition-all ${
                isDragging
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.02]"
                  : "border-[var(--border)] hover:border-[var(--accent)]/50"
              }`}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 text-sm font-medium border-2 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all rounded-sm"
              >
                Choose Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <p className="text-[10px] text-[var(--muted)] mt-4 uppercase tracking-wider">
                or drag & drop here
              </p>
              {fileName && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-[10px] text-[var(--accent)] truncate font-medium">
                    {fileName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tuning Controls */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">
              2. Tune Settings
            </h2>
            <div className="border border-[var(--border)] bg-[var(--surface)] rounded-sm p-5 space-y-5">
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
                className="w-full bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              >
                {(Object.keys(CHARSETS) as CharsetKey[]).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </ControlRow>

            <ControlRow label="contrast" value={settings.contrast.toFixed(1)}>
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

            <label className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--muted)] cursor-pointer">
              <span>invert</span>
              <input
                type="checkbox"
                checked={settings.invert}
                onChange={(e) => updateSetting("invert", e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--muted)] cursor-pointer">
              <span>dither</span>
              <input
                type="checkbox"
                checked={settings.dither}
                onChange={(e) => updateSetting("dither", e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
            </label>
            </div>
          </div>

          {/* Export Actions */}
          {status === "ready" && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">
                3. Export
              </h2>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-2.5 text-sm font-medium border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all rounded-sm"
                >
                  {copied ? "✓ Copied!" : "Copy to Clipboard"}
                </button>
                <button
                  onClick={() => downloadAscii(ascii, `${baseName}.txt`)}
                  className="w-full px-4 py-2.5 text-sm font-medium border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all rounded-sm"
                >
                  Download .txt
                </button>
                <button
                  onClick={() => downloadAsciiPng(ascii, `${baseName}.png`)}
                  className="w-full px-4 py-2.5 text-sm font-medium bg-[var(--accent)] text-black hover:brightness-110 transition-all rounded-sm"
                >
                  Download .png
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Preview Section */}
        <section className="border border-[var(--border)] bg-[var(--surface)] rounded-sm min-h-[500px] lg:min-h-0 flex flex-col overflow-hidden">
          {status === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <svg className="w-16 h-16 text-[var(--muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="space-y-2">
                <p className="text-[var(--muted)] text-sm font-medium">No image loaded</p>
                <p className="text-[var(--muted)] text-xs max-w-xs">
                  Upload an image to start creating ASCII art
                </p>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-12 h-12 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
              <div className="space-y-1">
                <p className="text-[var(--accent)] text-sm font-medium animate-pulse">
                  Converting to ASCII...
                </p>
                <p className="text-[var(--muted)] text-xs">This will just take a moment</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <svg className="w-16 h-16 text-red-400 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="space-y-2">
                <p className="text-red-400 text-sm font-medium">Failed to load image</p>
                <p className="text-[var(--muted)] text-xs max-w-xs">
                  Please make sure the file is a valid image format (JPG, PNG, GIF, etc.)
                </p>
              </div>
            </div>
          )}

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
        </section>
      </main>
    </div>
  );
}
