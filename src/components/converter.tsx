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
      <header className="border-b border-[var(--border)] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              P<span className="text-[var(--accent)]">→</span>Ascii
            </h1>
          </div>
          {status === "ready" && (
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-xs border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
              >
                {copied ? "copied!" : "copy"}
              </button>
              <button
                onClick={() => downloadAscii(ascii, `${baseName}.txt`)}
                className="px-3 py-1.5 text-xs border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
              >
                .txt
              </button>
              <button
                onClick={() => downloadAsciiPng(ascii, `${baseName}.png`)}
                className="px-3 py-1.5 text-xs bg-[var(--accent)] text-black font-medium hover:brightness-110 transition-all"
              >
                .png
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--border)]"
            }`}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-colors"
            >
              choose image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
            <p className="text-[10px] text-[var(--muted)] mt-3 uppercase tracking-wider">
              or drop here
            </p>
            {fileName && (
              <p className="text-[10px] text-[var(--muted)] mt-2 truncate">
                {fileName}
              </p>
            )}
          </div>

          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-5">
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
          </div>
        </aside>

        <section className="border border-[var(--border)] bg-[var(--surface)] min-h-[400px] lg:min-h-0 flex flex-col">
          {status === "idle" && (
            <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
              upload an image to begin
            </div>
          )}

          {status === "loading" && (
            <div className="flex-1 flex items-center justify-center text-[var(--accent)] text-sm animate-pulse">
              converting…
            </div>
          )}

          {status === "error" && (
            <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
              failed to load image
            </div>
          )}

          {status === "ready" && ascii && (
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
              <pre
                ref={previewRef}
                className="ascii-output ascii-glow select-all"
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
