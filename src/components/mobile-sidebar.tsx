"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

export function MobileSidebarToggle() {
  return (
    <button
      className="md:hidden p-1.5 text-white/70 hover:text-white transition-colors"
      onClick={() => document.dispatchEvent(new CustomEvent("toggle-sidebar"))}
      aria-label="Toggle menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}

export function MobileSidebarWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    Promise.resolve().then(() => setOpen(false))
  }, [pathname])

  useEffect(() => {
    function handleToggle() { setOpen((prev) => !prev) }
    document.addEventListener("toggle-sidebar", handleToggle)
    return () => document.removeEventListener("toggle-sidebar", handleToggle)
  }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-60 bg-[#2C3E5C] flex-col pt-6 shrink-0">
        {children}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#2C3E5C] flex flex-col pt-4 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-4 mb-2">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-white/60 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </aside>
    </>
  )
}
