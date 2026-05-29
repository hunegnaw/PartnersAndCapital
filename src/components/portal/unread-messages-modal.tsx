"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import Link from "next/link"

export function UnreadMessagesModal() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Only show once per session
    const shown = sessionStorage.getItem("unread_msg_modal_shown")
    if (shown) return

    async function check() {
      try {
        const res = await fetch("/api/portal/messages/unread-count")
        if (!res.ok) return
        const data = await res.json()
        if (data.count > 0) {
          setCount(data.count)
          setOpen(true)
          sessionStorage.setItem("unread_msg_modal_shown", "1")
        }
      } catch {
        // Non-critical
      }
    }
    check()
  }, [])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B07D3A]/10">
              <Mail className="h-5 w-5 text-[#B07D3A]" />
            </div>
            <DialogTitle>New Secure Message{count > 1 ? "s" : ""}</DialogTitle>
          </div>
          <DialogDescription>
            You have {count} unread secure message{count > 1 ? "s" : ""} waiting in your portal.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <Link href="/messages">
            <Button className="bg-[#1A2640] hover:bg-[#2C3E5C]" onClick={() => setOpen(false)}>
              <Mail className="h-4 w-4 mr-2" />
              Read Messages
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
