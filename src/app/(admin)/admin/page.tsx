"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Users,
  Briefcase,
  DollarSign,
  ClipboardList,
  Plus,
  Upload,
  MessageSquare,
  AlertCircle,
} from "lucide-react"

interface Stats {
  totalClients: number
  activeInvestments: number
  totalAUM: number
  totalDocuments: number
  pendingAdvisors: number
  recentAuditLogs: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        if (!res.ok) throw new Error("Failed to fetch stats")
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your portal activity and key metrics.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalClients ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Investments
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeInvestments ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total AUM
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalAUM ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Status Bar */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Audit Log</p>
              {loading ? (
                <Skeleton className="h-4 w-48 mt-1" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {stats?.recentAuditLogs ?? 0} events in the last 30 days
                </p>
              )}
            </div>
          </div>
          <Link href="/admin/audit-log" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View Audit Log
          </Link>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/clients" className={cn(buttonVariants({ variant: "outline" }), "h-auto py-4 justify-start gap-3")}>
              <Plus className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Add Client</div>
                <div className="text-xs text-muted-foreground">Create a new client account</div>
              </div>
          </Link>

          <Link href="/admin/investments" className={cn(buttonVariants({ variant: "outline" }), "h-auto py-4 justify-start gap-3")}>
              <Plus className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Add Investment</div>
                <div className="text-xs text-muted-foreground">Create a new investment offering</div>
              </div>
          </Link>

          <Link href="/admin/documents" className={cn(buttonVariants({ variant: "outline" }), "h-auto py-4 justify-start gap-3")}>
              <Upload className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Upload Document</div>
                <div className="text-xs text-muted-foreground">Upload K-1s, reports, and more</div>
              </div>
          </Link>

          <Link href="/admin/activity" className={cn(buttonVariants({ variant: "outline" }), "h-auto py-4 justify-start gap-3")}>
              <MessageSquare className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Post Update</div>
                <div className="text-xs text-muted-foreground">Share news with clients</div>
              </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
