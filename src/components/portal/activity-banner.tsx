"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface BannerData {
  id: string
  title: string
  content: string
}

export function ActivityBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function fetchBanner() {
      try {
        const res = await fetch("/api/portal/banners")
        if (!res.ok) return
        const data = await res.json()
        if (data.banner) {
          // Check if user already dismissed this banner
          const dismissedId = sessionStorage.getItem("dismissed_banner")
          if (dismissedId !== data.banner.id) {
            setBanner(data.banner)
          }
        }
      } catch {
        // Non-critical
      }
    }
    fetchBanner()
  }, [])

  if (!banner || dismissed) return null

  function handleDismiss() {
    if (banner) {
      sessionStorage.setItem("dismissed_banner", banner.id)
    }
    setDismissed(true)
  }

  return (
    <div
      className="w-full bg-[#B07D3A] flex items-center justify-center px-6 py-3 relative"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <p className="text-[#1A2640] text-lg font-medium text-center pr-8">
        {banner.content || banner.title}
      </p>
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A2640]/60 hover:text-[#1A2640] transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
