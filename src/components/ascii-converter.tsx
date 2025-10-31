"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { CustomToggle } from "@/components/ui/custom-toggle"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Download,
  Copy,
  Image as ImageIcon,
  Settings,
  Palette,
  Monitor,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"

// Types
interface ColoredChar {
  char: string
  color: string
}

interface ConversionSettings {
  resolution: number
  charSet: string
  inverted: boolean
  grayscale: boolean
}

const charSets = {
  standard: { name: "Standard", chars: " .:-=+*#%@" },
  detailed: { name: "Detailed", chars: " .,:;i1tfLCG08@" },
  blocks: { name: "Block Characters", chars: " ░▒▓█" },
  minimal: { name: "Minimal", chars: " .:█" },
  artistic: { name: "Artistic", chars: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$" },
  retro: { name: "Retro", chars: " .:;+=xX$&@" },
}

export default function AsciiConverter() {
  // State
  const [settings, setSettings] = useState<ConversionSettings>({
    resolution: 0.15,
    charSet: "standard",
    inverted: false,
    grayscale: true,
  })
  const [asciiFontSize, setAsciiFontSize] = useState<number>(8)
  const [canvasZoom, setCanvasZoom] = useState<number>(1)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asciiArt, setAsciiArt] = useState<string>("")
  const [coloredAsciiArt, setColoredAsciiArt] = useState<ColoredChar[][]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewMode, setPreviewMode] = useState<"ascii" | "canvas">("ascii")

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Load default image on mount
  useEffect(() => {
    loadDefaultImage()
  }, [])

  // Convert to ASCII when settings or image changes
  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      convertToAscii()
    }
  }, [settings, imageLoaded])

  // Render to canvas when ASCII art changes
  useEffect(() => {
    if (imageLoaded && !loading && !error) {
      renderToCanvas()
    }
  }, [asciiArt, coloredAsciiArt, settings.grayscale, asciiFontSize, canvasZoom, loading, error, imageLoaded])

  const loadDefaultImage = () => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }

      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("Failed to load default image")
      setLoading(false)
    }

    img.src = "/globe.svg"
  }

  const loadImage = (src: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }

      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("Failed to load image")
      setLoading(false)
    }

    img.src = src
  }

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        loadImage(e.target.result as string)
      }
    }
    reader.onerror = () => {
      setError("Failed to read file")
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const adjustColorBrightness = (r: number, g: number, b: number, factor: number): string => {
    const minBrightness = 40
    r = Math.max(Math.min(Math.round(r * factor), 255), minBrightness)
    g = Math.max(Math.min(Math.round(g * factor), 255), minBrightness)
    b = Math.max(Math.min(Math.round(b * factor), 255), minBrightness)
    return `rgb(${r}, ${g}, ${b})`
  }

  const renderToCanvas = useCallback(() => {
    if (!outputCanvasRef.current || !asciiArt || coloredAsciiArt.length === 0) return

    const canvas = outputCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const fontSize = asciiFontSize
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    const lineHeight = fontSize
    const charWidth = fontSize * 0.6

    if (settings.grayscale) {
      const lines = asciiArt.split("\n")
      const maxLineLength = Math.max(...lines.map((line) => line.length))
      const baseWidth = maxLineLength * charWidth
      const baseHeight = lines.length * lineHeight
      canvas.width = Math.ceil(baseWidth * canvasZoom)
      canvas.height = Math.ceil(baseHeight * canvasZoom)
    } else {
      const baseWidth = coloredAsciiArt[0].length * charWidth
      const baseHeight = coloredAsciiArt.length * lineHeight
      canvas.width = Math.ceil(baseWidth * canvasZoom)
      canvas.height = Math.ceil(baseHeight * canvasZoom)
    }

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    if (settings.grayscale) {
      ctx.fillStyle = "white"
      ctx.save()
      ctx.scale(canvasZoom, canvasZoom)
      asciiArt.split("\n").forEach((line, lineIndex) => {
        ctx.fillText(line, 0, lineIndex * lineHeight)
      })
      ctx.restore()
    } else {
      ctx.save()
      ctx.scale(canvasZoom, canvasZoom)
      coloredAsciiArt.forEach((row, rowIndex) => {
        row.forEach((col, colIndex) => {
          ctx.fillStyle = col.color
          ctx.fillText(col.char, colIndex * charWidth, rowIndex * lineHeight)
        })
      })
      ctx.restore()
    }
  }, [asciiArt, coloredAsciiArt, settings.grayscale, asciiFontSize, canvasZoom])

  const convertToAscii = useCallback(() => {
    try {
      if (!canvasRef.current || !imageRef.current) {
        throw new Error("Canvas or image not available")
      }

      const img = imageRef.current
      const imgWidth = (img as HTMLImageElement).naturalWidth || img.width
      const imgHeight = (img as HTMLImageElement).naturalHeight || img.height
      if (imgWidth === 0 || imgHeight === 0) {
        throw new Error("Invalid image dimensions")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      const width = Math.floor(imgWidth * settings.resolution)
      const height = Math.floor(imgHeight * settings.resolution)

      canvas.width = imgWidth
      canvas.height = imgHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, imgWidth, imgHeight)

      let imageData
      try {
        imageData = ctx.getImageData(0, 0, imgWidth, imgHeight)
      } catch {
        throw new Error("Failed to get image data. This might be a CORS issue.")
      }

      const data = imageData.data
      const chars = charSets[settings.charSet as keyof typeof charSets].chars
      const fontAspect = 0.5
      const widthStep = Math.ceil(imgWidth / width)
      const heightStep = Math.ceil(imgHeight / height / fontAspect)

      let result = ""
      const coloredResult: ColoredChar[][] = []

      for (let y = 0; y < imgHeight; y += heightStep) {
        const coloredRow: ColoredChar[] = []

        for (let x = 0; x < imgWidth; x += widthStep) {
          const pos = (y * imgWidth + x) * 4
          const r = data[pos]
          const g = data[pos + 1]
          const b = data[pos + 2]

          let brightness
          if (settings.grayscale) {
            brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
          } else {
            brightness = Math.sqrt(
              0.299 * (r / 255) * (r / 255) + 0.587 * (g / 255) * (g / 255) + 0.114 * (b / 255) * (b / 255)
            )
          }

          if (settings.inverted) brightness = 1 - brightness

          const charIndex = Math.floor(brightness * (chars.length - 1))
          const char = chars[charIndex]

          result += char

          if (!settings.grayscale) {
            const brightnessFactor = (charIndex / (chars.length - 1)) * 1.5 + 0.5
            const color = adjustColorBrightness(r, g, b, brightnessFactor)
            coloredRow.push({ char, color })
          } else {
            coloredRow.push({ char, color: "white" })
          }
        }

        result += "\n"
        coloredResult.push(coloredRow)
      }

      setAsciiArt(result)
      setColoredAsciiArt(coloredResult)
      setError(null)
    } catch (err) {
      console.error("Error converting to ASCII:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setAsciiArt("")
      setColoredAsciiArt([])
    }
  }, [settings])

  const copyToClipboard = async () => {
    if (!asciiArt) {
      setError("No ASCII art to copy")
      return
    }

    try {
      await navigator.clipboard.writeText(asciiArt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea")
      el.value = asciiArt
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadAsciiArt = () => {
    if (!asciiArt) {
      setError("No ASCII art to download")
      return
    }

    const element = document.createElement("a")
    const file = new Blob([asciiArt], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "ascii-art.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const updateSetting = <K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Sidebar */}
      <div className="w-full md:w-96 bg-gray-900 border-r border-gray-800 p-6 md:p-8 overflow-y-auto">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center pb-6 md:pb-8 border-b border-gray-800">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl border border-primary/30 mb-4">
                <span className="text-2xl font-bold text-primary">A</span>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-3 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              ASCII Art
            </h1>
            <p className="text-gray-400 text-xs md:text-sm">Convert images to ASCII art with style</p>
          </div>

          {/* Upload Section */}
          <div className="space-y-5">
            <h3 className="text-base md:text-lg font-semibold flex items-center gap-3 text-gray-100">
              <ImageIcon className="h-5 w-5 text-primary" />
              Upload Image
            </h3>

            <div
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all duration-300 cursor-pointer hover-lift ${isDragging
                ? "border-primary bg-primary/20 scale-105"
                : "border-gray-600 hover:border-primary hover:bg-gray-800/50"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400 hover:text-primary transition-colors duration-200" />
              </div>
              <p className="text-gray-300 mb-2 text-sm md:text-base font-medium">
                {isDragging ? "Drop your image here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                JPG, PNG, GIF, WebP
              </p>
              <div className="mt-3 text-[10px] md:text-xs text-gray-600 bg-gray-800/50 px-3 py-1 rounded-full inline-block">
                Supports up to 10MB
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Settings Section */}
          <div className="space-y-6">
            <h3 className="text-base md:text-lg font-semibold flex items-center gap-3 text-gray-100">
              <Settings className="h-5 w-5 text-primary" />
              Settings
            </h3>

            {/* Resolution */}
            <div className="space-y-4 bg-gradient-to-br from-gray-800/40 to-gray-700/20 rounded-xl p-4 md:p-5 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
              <Label className="flex items-center justify-between text-sm font-medium">
                <span>Resolution</span>
                <span className="text-primary font-mono bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/30">
                  {settings.resolution.toFixed(2)}
                </span>
              </Label>
              <Slider
                value={[settings.resolution]}
                onValueChange={(value) => updateSetting("resolution", value[0])}
                min={0.05}
                max={0.3}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  Low Detail
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  High Detail
                </span>
              </div>
            </div>

            {/* Character Set */}
            <div className="space-y-4 bg-gradient-to-br from-gray-800/40 to-gray-700/20 rounded-xl p-4 md:p-5 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
              <Label className="text-sm font-medium">Character Set</Label>
              <Select value={settings.charSet} onValueChange={(value) => updateSetting("charSet", value)}>
                <SelectTrigger className="bg-gray-700/80 border-gray-600 text-white hover:bg-gray-600/80 transition-colors duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700/95 border-gray-600 text-white backdrop-blur-sm">
                  {Object.entries(charSets).map(([key, { name }]) => (
                    <SelectItem key={key} value={key} className="hover:bg-gray-600/80 transition-colors duration-200">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-4 bg-gradient-to-br from-gray-800/40 to-gray-700/20 rounded-xl p-4 md:p-5 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-3 text-sm font-medium">
                  <Palette className="h-4 w-4 text-primary" />
                  Invert Colors
                </Label>
                <CustomToggle
                  checked={settings.inverted}
                  onCheckedChange={(checked) => updateSetting("inverted", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-3 text-sm font-medium">
                  <Monitor className="h-4 w-4 text-primary" />
                  Grayscale Mode
                </Label>
                <CustomToggle
                  checked={settings.grayscale}
                  onCheckedChange={(checked) => updateSetting("grayscale", checked)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold flex items-center gap-3 text-gray-100">
              <Sparkles className="h-5 w-5 text-primary" />
              Actions
            </h3>

            <div className="space-y-3">
              <Button
                onClick={copyToClipboard}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-black font-semibold h-12 text-sm md:text-base transition-all duration-300 hover-lift shadow-lg shadow-primary/25"
                disabled={loading || !imageLoaded || !asciiArt}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5 mr-3" />
                    Copy to Clipboard
                  </>
                )}
              </Button>

              <Button
                onClick={downloadAsciiArt}
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-800/50 hover:border-gray-500 h-12 text-sm md:text-base transition-all duration-300 hover-lift bg-gray-800/20"
                disabled={loading || !imageLoaded || !asciiArt}
              >
                <Download className="h-5 w-5 mr-3" />
                Download as Text
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-400 font-medium">{error}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    Try uploading a different image or refreshing the page.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col">
        {/* Preview Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-100">Preview</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={previewMode === "ascii" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("ascii")}
                className="text-sm px-4 py-2"
              >
                Text View
              </Button>
              <Button
                variant={previewMode === "canvas" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("canvas")}
                className="text-sm px-4 py-2"
              >
                Canvas View
              </Button>
              <div className="hidden md:flex items-center gap-2 pl-3 ml-3 border-l border-gray-800">
                <Label className="text-xs text-gray-400">Font</Label>
                <Slider
                  value={[asciiFontSize]}
                  onValueChange={(v) => setAsciiFontSize(v[0])}
                  min={6}
                  max={16}
                  step={1}
                  className="w-32"
                />
                <div className="text-xs text-primary font-mono bg-primary/20 px-2 py-1 rounded border border-primary/30">
                  {asciiFontSize}px
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 pl-3 ml-3 border-l border-gray-800">
                <Label className="text-xs text-gray-400">Zoom</Label>
                <Slider
                  value={[canvasZoom]}
                  onValueChange={(v) => setCanvasZoom(Number(v[0]))}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-32"
                />
                <div className="text-xs text-primary font-mono bg-primary/20 px-2 py-1 rounded border border-primary/30">
                  {Math.round(canvasZoom * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-gradient-to-br from-black via-gray-900/20 to-black p-10 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/50">
                <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" />
                <p className="text-gray-400 text-xl font-medium">Converting image...</p>
                <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-red-900/20 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30">
                <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
                <p className="text-red-400 mb-3 text-xl font-medium">{error}</p>
                <p className="text-gray-400 text-base">
                  Try uploading a different image or refreshing the page.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              {previewMode === "ascii" ? (
                <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-800/50 shadow-2xl max-w-4xl max-h-full overflow-auto">
                  <pre className="ascii-art leading-none select-text" style={{ ['--ascii-font-size' as any]: `${asciiFontSize}px` }}>
                    {asciiArt}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-900/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-800/50 shadow-2xl">
                  <canvas
                    ref={outputCanvasRef}
                    className="max-w-full max-h-full rounded-lg"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
