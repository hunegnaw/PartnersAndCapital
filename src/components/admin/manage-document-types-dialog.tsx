"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface DocumentTypeRecord {
  id: string
  value: string
  label: string
  isDefault: boolean
  sortOrder: number
  documentCount: number
}

interface AffectedDocument {
  id: string
  name: string
  user: { id: string; name: string } | null
  investment: { id: string; name: string } | null
}

interface ManageDocumentTypesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTypesChanged: () => void
}

export function ManageDocumentTypesDialog({
  open,
  onOpenChange,
  onTypesChanged,
}: ManageDocumentTypesDialogProps) {
  const [types, setTypes] = useState<DocumentTypeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Warning modal state
  const [warningType, setWarningType] = useState<DocumentTypeRecord | null>(null)
  const [warningDocs, setWarningDocs] = useState<AffectedDocument[]>([])
  const [warningTotal, setWarningTotal] = useState(0)

  // Confirm delete modal state
  const [confirmType, setConfirmType] = useState<DocumentTypeRecord | null>(null)

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/document-types")
      if (!res.ok) throw new Error("Failed to fetch document types")
      const data = await res.json()
      setTypes(data.documentTypes)
    } catch {
      setError("Failed to load document types")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchTypes()
      setError(null)
      setNewLabel("")
    }
  }, [open, fetchTypes])

  async function handleAdd() {
    if (!newLabel.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/document-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create document type")
      }
      setNewLabel("")
      await fetchTypes()
      onTypesChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document type")
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteClick(type: DocumentTypeRecord) {
    if (type.documentCount > 0) {
      // Fetch affected documents to show in warning
      setDeletingId(type.id)
      try {
        const res = await fetch(`/api/admin/document-types/${type.id}`, {
          method: "DELETE",
        })
        const data = await res.json()
        if (res.status === 409) {
          setWarningType(type)
          setWarningDocs(data.documents || [])
          setWarningTotal(data.totalCount || 0)
        }
      } catch {
        setError("Failed to check document type usage")
      } finally {
        setDeletingId(null)
      }
    } else {
      setConfirmType(type)
    }
  }

  async function handleConfirmDelete() {
    if (!confirmType) return
    setDeletingId(confirmType.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/document-types/${confirmType.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete document type")
      }
      setConfirmType(null)
      await fetchTypes()
      onTypesChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document type")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto font-[var(--font-admin-body-family,Inter,sans-serif)]">
          <DialogHeader>
            <DialogTitle>Manage Document Types</DialogTitle>
            <DialogDescription>
              Add or remove document types used for uploads and filtering.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              types.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{type.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{type.value}</span>
                    {type.isDefault && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {type.documentCount}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(type)}
                      disabled={deletingId === type.id}
                      className="h-7 w-7 p-0"
                    >
                      {deletingId === type.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="New type label..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              disabled={adding}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !newLabel.trim()}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog (0 documents) */}
      <Dialog open={!!confirmType} onOpenChange={() => setConfirmType(null)}>
        <DialogContent className="sm:max-w-sm font-[var(--font-admin-body-family,Inter,sans-serif)]">
          <DialogHeader>
            <DialogTitle>Delete {confirmType?.label}?</DialogTitle>
            <DialogDescription>
              This document type will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmType(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingId === confirmType?.id}
            >
              {deletingId === confirmType?.id && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning dialog (has documents) */}
      <Dialog open={!!warningType} onOpenChange={() => setWarningType(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto font-[var(--font-admin-body-family,Inter,sans-serif)]">
          <DialogHeader>
            <DialogTitle>Cannot delete {warningType?.label}</DialogTitle>
            <DialogDescription>
              {warningTotal} document{warningTotal !== 1 ? "s" : ""} use this type.
              Change their document type first, then return to delete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {warningDocs.map((doc) => (
              <div
                key={doc.id}
                className="text-sm border rounded-md px-3 py-2 space-y-0.5"
              >
                <p className="font-medium truncate">{doc.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {doc.user && <span>Client: {doc.user.name}</span>}
                  {doc.investment && <span>Investment: {doc.investment.name}</span>}
                </div>
              </div>
            ))}
            {warningTotal > warningDocs.length && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                ...and {warningTotal - warningDocs.length} more
              </p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setWarningType(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
