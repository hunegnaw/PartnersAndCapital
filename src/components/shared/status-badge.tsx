import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  REDEEMED: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  REVOKED: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  FULLY_REALIZED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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
