import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: {
    value: string
    positive: boolean
  }
  icon?: LucideIcon
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardContent className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  trend.positive
                    ? "bg-[#eaf3de] text-[#3b6d11]"
                    : "bg-[#feecec] text-[#a32d2d]"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-muted p-2">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
