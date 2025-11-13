"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Upload, Copy, Download, Loader2, RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

const CHAR_SETS = {
  standard: {
    label: "Standard",
    hint: "Balanced contrast",
    chars: " .:-=+*#%@",
  },
  block: {
    label: "Block",
    hint: "Posterized blocks",
    chars: " ░▒▓█",
  },
  detail: {
    label: "Detail",
    hint: "Fine gradients",
    chars: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  },
  minimal: {
    label: "Minimal",
    hint: "Three tone",
    chars: " .:█",
  },
  retro: {
    label: "Retro",
    hint: "Terminal vibe",
    chars: " .:;+=xX$&@",
  },
} as const

type CharSetKey = keyof typeof CHAR_SETS

const RESOLUTION_PRESETS = [
  { label: "+ Chunky", value: 0.1 },
  { label: "+ Balanced", value: 0.16 },
  { label: "+ Detailed", value: 0.22 },
]

export default function AsciiConverter() {
  const [asciiArt, setAsciiArt] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState("")
  const [resolution, setResolution] = useState(0.16)
  const [charSet, setCharSet] = useState<CharSetKey>("standard")
  const [invert, setInvert] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const stats = useMemo(() => {
    const rows = asciiArt ? asciiArt.split("\n") : []
    const columns = rows.length ? Math.max(...rows.map((row) => row.length)) : 0
    return {
      rows: rows.length,
      columns,
      characters: asciiArt.length,
    }
  }, [asciiArt])

  const convertImageToAscii = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current
      if (!canvas) {
        setError("Canvas is not available.")
        setAsciiArt("")
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        setError("Canvas context is not supported.")
        setAsciiArt("")
        return
      }

      const scaledWidth = Math.max(1, Math.floor(img.width * resolution))
      const scaledHeight = Math.max(1, Math.floor(img.height * resolution * 0.5))

      canvas.width = scaledWidth
      canvas.height = scaledHeight

      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

      const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight)
      const { data } = imageData

      let ascii = ""
      const palette = CHAR_SETS[charSet].chars
      const paletteLength = palette.length - 1

      for (let y = 0; y < scaledHeight; y++) {
        let row = ""
        for (let x = 0; x < scaledWidth; x++) {
          const offset = (y * scaledWidth + x) * 4
          const r = data[offset]
          const g = data[offset + 1]
          const b = data[offset + 2]

          let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
          if (invert) {
            brightness = 1 - brightness
          }

          const charIndex = Math.min(paletteLength, Math.floor(brightness * paletteLength))
          row += palette[charIndex]
        }
        ascii += row
        if (y < scaledHeight - 1) {
          ascii += "\n"
        }
      }

      setAsciiArt(ascii)
      setError(null)
    },
    [resolution, charSet, invert]
  )

  useEffect(() => {
    if (imageRef.current) {
      convertImageToAscii(imageRef.current)
    }
  }, [convertImageToAscii])

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.")
      setAsciiArt("")
      return
    }

    setFileName(file.name)
    setLoading(true)
    setError(null)
    setAsciiArt("")

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        imageRef.current = img
        convertImageToAscii(img)
        setLoading(false)
      }
      img.onerror = () => {
        setError("Could not load the selected image.")
        setLoading(false)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => {
      setError("Failed to read the file.")
      setLoading(false)
    }

    reader.readAsDataURL(file)
  }

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }

  const triggerFileDialog = () => {
    fileInputRef.current?.click()
  }

  const resetInterface = () => {
    setAsciiArt("")
    setError(null)
    setFileName("")
    setResolution(0.16)
    setCharSet("standard")
    setInvert(false)
    imageRef.current = null
  }

  const copyAscii = async () => {
    if (!asciiArt) return

    try {
      await navigator.clipboard.writeText(asciiArt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Could not copy to clipboard.")
      setCopied(false)
    }
  }

  const downloadAscii = () => {
    if (!asciiArt) return

    const blob = new Blob([asciiArt], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "ascii-art.txt"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-neutral-900">
      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tracking-tight text-neutral-900">Piggy ASCII</span>
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              Visual Console
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button className="border border-neutral-300 bg-white px-4 py-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800">
              Network: Local
            </button>
            <button className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800">
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="grid gap-8 lg:grid-cols-[1.6fr,2fr]">
          <div className="space-y-6">
            <div className="space-y-4 border border-neutral-300 bg-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-600">
                    Processing Window
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Adjust sampling for sharper or smoother ASCII output.
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {RESOLUTION_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setResolution(preset.value)}
                      className="border border-neutral-300 bg-white px-3 py-2 font-medium uppercase tracking-wider text-neutral-600 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span>Pixel Sample Rate</span>
                  <span className="font-mono text-neutral-900">{resolution.toFixed(2)}</span>
                </div>
                <Slider
                  value={[resolution]}
                  min={0.08}
                  max={0.24}
                  step={0.01}
                  onValueChange={(value) => setResolution(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Low fidelity</span>
                  <span>High fidelity</span>
                </div>
              </div>
            </div>

            <div className="border border-neutral-300 bg-white px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-600">
                    Source Upload
                  </h2>
                  <p className="text-xs text-neutral-500">Connect any local image to begin rendering.</p>
                </div>
                <button
                  onClick={triggerFileDialog}
                  className="flex items-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileInputChange}
                className="hidden"
              />

              <div className="mt-4 border border-dashed border-neutral-400 bg-neutral-100 px-4 py-3 text-xs uppercase tracking-widest text-neutral-500">
                {fileName || "Awaiting source... (.png / .jpg / .webp)"}
              </div>

              <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
                <label className="flex items-center gap-2 uppercase tracking-widest">
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(event) => setInvert(event.target.checked)}
                    className="h-3 w-3 border border-neutral-400 accent-neutral-900"
                  />
                  Invert Brightness
                </label>
                <button
                  onClick={resetInterface}
                  className="flex items-center gap-1 border border-neutral-300 bg-white px-3 py-2 uppercase tracking-widest text-neutral-500 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>

              {error && (
                <p className="mt-4 border border-red-400 bg-red-50 px-4 py-3 text-xs font-medium uppercase tracking-widest text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="border border-neutral-300 bg-white px-6 py-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-600">
                  ASCII Style Presets
                </h2>
                <p className="text-xs text-neutral-500">
                  Tap a palette to swap character density on the fly.
                </p>
              </div>
              <div className="grid gap-2">
                {(Object.keys(CHAR_SETS) as CharSetKey[]).map((key) => {
                  const option = CHAR_SETS[key]
                  const isActive = key === charSet
                  return (
                    <button
                      key={key}
                      onClick={() => setCharSet(key)}
                      className={`flex items-center justify-between border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      <span className="text-sm font-medium uppercase tracking-[0.25em]">
                        {option.label}
                      </span>
                      <span className="text-xs tracking-widest text-neutral-400">
                        {option.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-neutral-300 bg-white px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-600">
                    ASCII Preview
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Rendered output updates automatically with every tweak.
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={copyAscii}
                    disabled={!asciiArt}
                    className="flex items-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-2 uppercase tracking-widest text-white transition enabled:hover:bg-black disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={downloadAscii}
                    disabled={!asciiArt}
                    className="flex items-center gap-2 border border-neutral-300 bg-white px-4 py-2 uppercase tracking-widest text-neutral-600 transition hover:bg-neutral-200 disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>

              <div className="border border-neutral-300 bg-[#111111] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.35em] text-[#9a9a9a]">
                  Render Window
                </div>
                <div className="mt-2 min-h-[320px] border border-neutral-700 bg-black px-4 py-3 text-sm">
                  {loading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-xs uppercase tracking-[0.4em] text-neutral-500">
                      <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                      Converting
                    </div>
                  ) : asciiArt ? (
                    <pre className="ascii-art max-h-[420px] overflow-auto text-[11px] leading-tight text-white">
                      {asciiArt}
                    </pre>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.4em] text-neutral-500">
                      Awaiting image data
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-neutral-300 bg-white px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Output Metrics
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Quick glance at the character load generated by your selection.
              </p>
              <div className="mt-4 border border-neutral-300">
                <div className="grid grid-cols-3 bg-neutral-100 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-600">
                  <div className="border-r border-neutral-300 px-4 py-3">Rows</div>
                  <div className="border-r border-neutral-300 px-4 py-3">Columns</div>
                  <div className="px-4 py-3">Characters</div>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <div className="border-r border-neutral-300 px-4 py-4 font-mono">
                    {stats.rows}
                  </div>
                  <div className="border-r border-neutral-300 px-4 py-4 font-mono">
                    {stats.columns}
                  </div>
                  <div className="px-4 py-4 font-mono">{stats.characters}</div>
                </div>
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-neutral-400">
                Tip: start with balanced resolution and swap palettes to explore mood.
              </p>
            </div>
          </div>
        </section>

        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  )
}
