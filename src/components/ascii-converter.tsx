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
  }, [asciiArt, coloredAsciiArt, settings.grayscale, loading, error, imageLoaded])

  const loadDefaultImage = () => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
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

    img.src = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center"
  }

  const loadImage = (src: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
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

    const fontSize = 8
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    const lineHeight = fontSize
    const charWidth = fontSize * 0.6

    if (settings.grayscale) {
      const lines = asciiArt.split("\n")
      const maxLineLength = Math.max(...lines.map((line) => line.length))
      canvas.width = maxLineLength * charWidth
      canvas.height = lines.length * lineHeight
    } else {
      canvas.width = coloredAsciiArt[0].length * charWidth
      canvas.height = coloredAsciiArt.length * lineHeight
    }

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    if (settings.grayscale) {
      ctx.fillStyle = "white"
      asciiArt.split("\n").forEach((line, lineIndex) => {
        ctx.fillText(line, 0, lineIndex * lineHeight)
      })
    } else {
      coloredAsciiArt.forEach((row, rowIndex) => {
        row.forEach((col, colIndex) => {
          ctx.fillStyle = col.color
          ctx.fillText(col.char, colIndex * charWidth, rowIndex * lineHeight)
        })
      })
    }
  }, [asciiArt, coloredAsciiArt, settings.grayscale])

  const convertToAscii = useCallback(() => {
    try {
      if (!canvasRef.current || !imageRef.current) {
        throw new Error("Canvas or image not available")
      }

      const img = imageRef.current
      if (img.width === 0 || img.height === 0) {
        throw new Error("Invalid image dimensions")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      const width = Math.floor(img.width * settings.resolution)
      const height = Math.floor(img.height * settings.resolution)

      canvas.width = img.width
      canvas.height = img.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, img.width, img.height)

      let imageData
      try {
        imageData = ctx.getImageData(0, 0, img.width, img.height)
      } catch {
        throw new Error("Failed to get image data. This might be a CORS issue.")
      }

      const data = imageData.data
      const chars = charSets[settings.charSet as keyof typeof charSets].chars
      const fontAspect = 0.5
      const widthStep = Math.ceil(img.width / width)
      const heightStep = Math.ceil(img.height / height / fontAspect)

      let result = ""
      const coloredResult: ColoredChar[][] = []

      for (let y = 0; y < img.height; y += heightStep) {
        const coloredRow: ColoredChar[] = []

        for (let x = 0; x < img.width; x += widthStep) {
          const pos = (y * img.width + x) * 4
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
      <div className="w-80 bg-gray-900 border-r border-gray-800 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary mb-2">ASCII Art</h1>
            <p className="text-gray-400 text-sm">Convert images to ASCII art</p>
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Upload Image
            </h3>
            
            <div
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-gray-600 hover:border-primary hover:bg-gray-800"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-300 mb-1">
                {isDragging ? "Drop your image here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, GIF, WebP
              </p>
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </h3>

            {/* Resolution */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between text-sm">
                <span>Resolution</span>
                <span className="text-primary font-mono">
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
                <span>Low Detail</span>
                <span>High Detail</span>
              </div>
            </div>

            {/* Character Set */}
            <div className="space-y-2">
              <Label className="text-sm">Character Set</Label>
              <Select value={settings.charSet} onValueChange={(value) => updateSetting("charSet", value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {Object.entries(charSets).map(([key, { name }]) => (
                    <SelectItem key={key} value={key} className="hover:bg-gray-700">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4" />
                  Invert Colors
                </Label>
                <CustomToggle
                  checked={settings.inverted}
                  onCheckedChange={(checked) => updateSetting("inverted", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4" />
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
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Actions
            </h3>
            
            <Button
              onClick={copyToClipboard}
              className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
              disabled={loading || !imageLoaded || !asciiArt}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            
            <Button
              onClick={downloadAsciiArt}
              variant="outline"
              className="w-full border-gray-600 hover:bg-gray-800"
              disabled={loading || !imageLoaded || !asciiArt}
            >
              <Download className="h-4 w-4 mr-2" />
              Download as Text
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-400 font-medium">{error}</p>
                  <p className="text-gray-400 text-xs mt-1">
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
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Preview</h2>
            <div className="flex gap-2">
              <Button
                variant={previewMode === "ascii" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("ascii")}
                className="text-xs"
              >
                Text
              </Button>
              <Button
                variant={previewMode === "canvas" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("canvas")}
                className="text-xs"
              >
                Canvas
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-black p-8 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-gray-400">Converting image...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-2">{error}</p>
                <p className="text-gray-400 text-sm">
                  Try uploading a different image or refreshing the page.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              {previewMode === "ascii" ? (
                <pre className="ascii-art text-xs leading-none select-text">
                  {asciiArt}
                </pre>
              ) : (
                <canvas
                  ref={outputCanvasRef}
                  className="max-w-full max-h-full"
                />
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
