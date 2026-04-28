import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-[#eaf3de] text-[#3b6d11]",
  COMPLETED: "bg-[#eaf3de] text-[#3b6d11]",
  PENDING: "bg-[#FDF5E8] text-[#7A5520]",
  CLOSED: "bg-gray-100 text-gray-800",
  REDEEMED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  REVOKED: "bg-gray-100 text-gray-800",
  FULLY_REALIZED: "bg-[#e6f1fb] text-[#185fa5]",
  EXPIRED: "bg-[#feecec] text-[#a32d2d]",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style =
    statusStyles[status] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"

  const label = status.replace(/_/g, " ")

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        style,
        className
      )}
    >
      {label.toLowerCase()}
    </span>
  )
}
