"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload, X } from "lucide-react"

interface ClientOption {
  id: string
  name: string
}

interface InvestmentOption {
  id: string
  name: string
}

interface DocumentTypeOption {
  value: string
  label: string
}

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients?: ClientOption[]
  investments?: InvestmentOption[]
  documentTypes?: DocumentTypeOption[]
  onSuccess: () => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  clients,
  investments,
  documentTypes,
  onSuccess,
}: DocumentUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState("")
  const [documentType, setDocumentType] = useState("OTHER")
  const [year, setYear] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState("")
  const [investmentId, setInvestmentId] = useState("")
  const [advisorVisible, setAdvisorVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fetchedClients, setFetchedClients] = useState<ClientOption[]>([])
  const [fetchedInvestments, setFetchedInvestments] = useState<InvestmentOption[]>([])
  const [fetchedDocumentTypes, setFetchedDocumentTypes] = useState<DocumentTypeOption[]>([])

  // Resolve which lists to display: props take priority, otherwise fetch
  const clientList = clients && clients.length > 0 ? clients : fetchedClients
  const investmentList = investments && investments.length > 0 ? investments : fetchedInvestments
  const typeList = documentTypes && documentTypes.length > 0 ? documentTypes : fetchedDocumentTypes

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setFile(null)
        setDocumentName("")
        setDocumentType("OTHER")
        setYear("")
        setDescription("")
        setClientId(clients?.length === 1 ? clients[0].id : "")
        setInvestmentId(investments?.length === 1 ? investments[0].id : "")
        setAdvisorVisible(false)
        setError(null)
        setUploadProgress(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      })

      // Fetch clients if not provided as props
      if (!clients || clients.length === 0) {
        fetch("/api/admin/clients?pageSize=200&status=active")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.clients) {
              setFetchedClients(
                data.clients.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
              )
            }
          })
          .catch(() => {})
      }

      // Fetch investments if not provided as props
      if (!investments || investments.length === 0) {
        fetch("/api/admin/investments?pageSize=200")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.investments) {
              setFetchedInvestments(
                data.investments.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name }))
              )
            }
          })
          .catch(() => {})
      }

      // Fetch document types if not provided as props
      if (!documentTypes || documentTypes.length === 0) {
        fetch("/api/admin/document-types")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.documentTypes) {
              setFetchedDocumentTypes(
                data.documentTypes.map((dt: { value: string; label: string }) => ({
                  value: dt.value,
                  label: dt.label,
                }))
              )
            }
          })
          .catch(() => {})
      }
    }
  }, [open, clients, investments, documentTypes])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    if (selected && !documentName) {
      setDocumentName(selected.name.replace(/\.[^/.]+$/, ""))
    }
  }

  function handleFileDrop(selectedFile: File) {
    setFile(selectedFile)
    if (!documentName) {
      setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ""))
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile) {
        handleFileDrop(droppedFile)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentName]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError("Please select a file to upload")
      return
    }
    if (!clientId) {
      setError("Please select a client")
      return
    }
    if (!investmentId) {
      setError("Please select an investment")
      return
    }
    setError(null)
    setLoading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", documentName)
      formData.append("type", documentType)
      if (year) formData.append("year", year)
      if (description) formData.append("description", description)
      if (clientId) formData.append("userId", clientId)
      if (investmentId) formData.append("investmentId", investmentId)
      formData.append("advisorVisible", String(advisorVisible))

      const xhr = new XMLHttpRequest()

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percent)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            try {
              const data = JSON.parse(xhr.responseText)
              reject(new Error(data.error || "Upload failed"))
            } catch {
              reject(new Error("Upload failed"))
            }
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.open("POST", "/api/admin/documents")
        xhr.send(formData)
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document and assign it to a client or investment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* File drop zone */}
            <div className="grid gap-2">
              <Label>File *</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-primary/50 bg-primary/5"
                      : "border-input hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Upload className="size-4 text-primary" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop a file here, or click to browse
                    </p>
                  </>
                )}
              </div>
            </div>

            {uploadProgress !== null && (
              <Progress value={uploadProgress}>
                Uploading... {uploadProgress}%
              </Progress>
            )}

            <div className="grid gap-2">
              <Label htmlFor="doc-name">Document Name *</Label>
              <Input
                id="doc-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Q4 2024 K-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v ?? "OTHER")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeList.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="doc-year">Year</Label>
                <Input
                  id="doc-year"
                  type="number"
                  min="2000"
                  max="2099"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="doc-description">Description</Label>
              <Textarea
                id="doc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes about this document..."
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client">
                    {clientList.find((c) => c.id === clientId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Investment *</Label>
              <Select value={investmentId} onValueChange={(v) => setInvestmentId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an investment">
                    {investmentList.find((inv) => inv.id === investmentId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {investmentList.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={advisorVisible}
                onCheckedChange={(checked) =>
                  setAdvisorVisible(checked === true)
                }
                id="doc-advisor-visible"
              />
              <Label htmlFor="doc-advisor-visible" className="cursor-pointer">
                Visible to advisors
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file || !clientId || !investmentId}>
              {loading && <Loader2 className="animate-spin" />}
              Upload Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
