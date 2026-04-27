import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface AllocationItem {
  name: string
  value: number
  percentage: number
  color: string
}

interface AllocationChartProps {
  data: AllocationItem[]
  className?: string
}

export function AllocationChart({ data, className }: AllocationChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-8 text-sm text-muted-foreground",
          className
        )}
      >
        No allocation data available
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {data.map((item) => (
        <div key={item.name} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{item.percentage.toFixed(1)}%</span>
              <span className="w-24 text-right font-medium text-foreground">
                {formatCurrency(item.value)}
              </span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(item.percentage, 100)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
