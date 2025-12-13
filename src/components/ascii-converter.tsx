"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const ASCII_CHARS = " .:-=+*#%@"

export default function AsciiConverter() {
  const [asciiArt, setAsciiArt] = useState("")
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const convertImageToAscii = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resolution = 0.15
    const scaledWidth = Math.max(1, Math.floor(img.width * resolution))
    const scaledHeight = Math.max(1, Math.floor(img.height * resolution * 0.5))

    canvas.width = scaledWidth
    canvas.height = scaledHeight
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight)
    const { data } = imageData

    let ascii = ""

    for (let y = 0; y < scaledHeight; y++) {
      let row = ""
      for (let x = 0; x < scaledWidth; x++) {
        const offset = (y * scaledWidth + x) * 4
        const r = data[offset]
        const g = data[offset + 1]
        const b = data[offset + 2]

        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        const charIndex = Math.min(
          ASCII_CHARS.length - 1,
          Math.floor(brightness * ASCII_CHARS.length)
        )
        row += ASCII_CHARS[charIndex]
      }
      ascii += row
      if (y < scaledHeight - 1) {
        ascii += "\n"
      }
    }

    setAsciiArt(ascii)
  }, [])

  useEffect(() => {
    if (imageRef.current) {
      convertImageToAscii(imageRef.current)
    }
  }, [convertImageToAscii])

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return
    }

    setFileName(file.name)
    setLoading(true)
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
        setLoading(false)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => {
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

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-5xl font-bold text-neutral-900 mb-12 text-center tracking-tight">
          P→Ascii
            </h1>

        <div className="border-2 border-neutral-900 bg-white shadow-lg">
          <div className="p-8 space-y-8">
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed transition-colors ${
                isDragging
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-300 bg-neutral-50/50"
              } p-8`}
            >
              <div className="text-center space-y-4">
                <div>
                  <button
                    onClick={triggerFileDialog}
                    className="border-2 border-neutral-900 bg-neutral-900 text-white px-8 py-3 font-medium hover:bg-neutral-800 transition-colors"
                  >
                    Choose Image
                  </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
                  onChange={onFileInputChange}
              className="hidden"
            />
                <p className="text-sm text-neutral-600">
                  or drag and drop an image here
                </p>
                {fileName && (
                  <p className="text-xs text-neutral-500 mt-2 font-mono">
                    {fileName}
                  </p>
                )}
              </div>
            </div>

            {loading && (
              <div className="border-2 border-neutral-200 bg-neutral-50 p-8 text-center">
                <div className="inline-block animate-pulse">
                  <p className="text-sm font-medium text-neutral-700">
                    Converting to ASCII...
                  </p>
              </div>
            </div>
          )}

            {asciiArt && (
              <div className="border-2 border-neutral-900 bg-white">
                <div className="bg-neutral-900 p-6 overflow-auto max-h-[500px]">
                  <pre className="text-neutral-100 text-[10px] font-mono leading-[1.2] whitespace-pre select-all">
                    {asciiArt}
                  </pre>
                </div>
                </div>
              )}
            </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
