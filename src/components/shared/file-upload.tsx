"use client"

import * as React from "react"
import { Upload, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
  uploading?: boolean
  progress?: number
  className?: string
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024 // 50 MB

export function FileUpload({
  onFileSelect,
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  uploading = false,
  progress,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function handleFile(file: File) {
    setError(null)
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024)
      setError(`File size exceeds the ${maxMB}MB limit.`)
      return
    }
    onFileSelect(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so selecting the same file again triggers onChange
    if (inputRef.current) inputRef.current.value = ""
  }

  const acceptHint = accept
    ? accept
        .split(",")
        .map((ext) => ext.trim().replace(".", "").toUpperCase())
        .join(", ")
    : null

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        {uploading ? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-8 text-muted-foreground" />
        )}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            Drag and drop or click to browse
          </p>
          {acceptHint && (
            <p className="text-xs text-muted-foreground">
              Accepted formats: {acceptHint}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Max size: {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
      </div>

      {uploading && progress != null && (
        <Progress value={progress} />
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
