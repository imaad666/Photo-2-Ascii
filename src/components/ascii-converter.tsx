"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const ASCII_CHARS = " .:-=+*#%@"

export default function AsciiConverter() {
  const [asciiArt, setAsciiArt] = useState("")
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-black mb-8 text-center">P→Ascii</h1>

        <div className="border border-black bg-white p-6 space-y-6">
          <div className="border border-black bg-white p-6">
            <div className="mb-4">
              <button
                onClick={triggerFileDialog}
                className="border border-black bg-white px-6 py-3 text-black hover:bg-black hover:text-white transition-colors"
              >
                Add Image
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileInputChange}
              className="hidden"
            />
            {fileName && (
              <p className="text-sm text-gray-600 mt-2">{fileName}</p>
            )}
          </div>

          {loading && (
            <div className="border border-black bg-white p-6 text-center">
              <p className="text-sm text-gray-600">Converting...</p>
            </div>
          )}

          {asciiArt && (
            <div className="border border-black bg-white p-6">
              <div className="bg-black p-4 overflow-auto max-h-96">
                <pre className="text-white text-xs font-mono leading-tight whitespace-pre">
                  {asciiArt}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
