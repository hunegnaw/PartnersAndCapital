"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Banknote,
  BarChart3,
  FileText,
  Download,
  Activity,
  Clock,
  ChevronRight,
  Briefcase,
  Users,
  Shield,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency, formatDate, formatPercentage, cn } from "@/lib/utils";

interface DashboardData {
  totalInvested: number;
  currentValue: number;
  totalDistributions: number;
  activeInvestments: number;
  allocation: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  growth: { date: string; value: number }[];
  recentInvestments: {
    id: string;
    investment: { name: string; assetClass: { name: string } };
    currentValue: number;
    returnPercentage: number;
    status: string;
  }[];
  recentDocuments: {
    id: string;
    name: string;
    type: string;
    createdAt: string;
  }[];
  recentActivity: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyDashboard({ name }: { name: string }) {
  const steps = [
    {
      number: 1,
      title: "Complete Your Profile",
      description:
        "Update your account settings with your contact information and preferences.",
      icon: Users,
      href: "/settings",
    },
    {
      number: 2,
      title: "Secure Your Account",
      description:
        "Enable two-factor authentication to protect your account and sensitive financial data.",
      icon: Shield,
      href: "/settings",
    },
    {
      number: 3,
      title: "Review Investments",
      description:
        "Once your advisor adds investments, you will see your portfolio details here.",
      icon: Briefcase,
      href: "/investments",
    },
    {
      number: 4,
      title: "Access Documents",
      description:
        "K-1s, quarterly reports, and other documents will appear in your document vault.",
      icon: FileText,
      href: "/documents",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome, {name || "there"}
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Your investment portal is ready. Here is how to get started.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
        {steps.map((step) => (
          <Link key={step.number} href={step.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function statusBadgeVariant(status: string) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "default";
    case "FUNDED":
      return "default";
    case "PENDING":
      return "secondary";
    case "EXITED":
    case "CLOSED":
      return "outline";
    default:
      return "secondary";
  }
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/dashboard");
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchDashboard());
  }, [fetchDashboard]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || (!data.totalInvested && data.totalInvested !== 0) || data.totalInvested === 0) {
    return <EmptyDashboard name={session?.user?.name?.split(" ")[0] || ""} />;
  }

  const firstName = session?.user?.name?.split(" ")[0] || "";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    {
      label: "Total Invested",
      value: formatCurrency(data.totalInvested),
      icon: DollarSign,
      description: "Capital committed",
    },
    {
      label: "Current Value",
      value: formatCurrency(data.currentValue),
      icon: TrendingUp,
      description:
        data.currentValue >= data.totalInvested ? "Appreciation" : "Mark to market",
    },
    {
      label: "Total Distributions",
      value: formatCurrency(data.totalDistributions),
      icon: Banknote,
      description: "Cash received",
    },
    {
      label: "Active Investments",
      value: String(data.activeInvestments),
      icon: BarChart3,
      description: "Current positions",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">{today}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Portfolio Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {data.growth && data.growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.growth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatCurrency(val)}
                    className="text-muted-foreground"
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), "Value"]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No growth data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {data.allocation && data.allocation.length > 0 ? (
              <div className="space-y-4">
                {data.allocation.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </span>
                        <span className="font-medium w-24 text-right">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No allocation data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Investments Table */}
      {data.recentInvestments && data.recentInvestments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Investments</CardTitle>
            <Link
              href="/investments"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investment</TableHead>
                  <TableHead>Asset Class</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentInvestments.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/investments/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.investment.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {inv.investment.assetClass?.name || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.currentValue)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        inv.returnPercentage >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {formatPercentage(inv.returnPercentage)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Documents & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Documents</CardTitle>
            <Link
              href="/documents"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentDocuments && data.recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {data.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type.replace(/_/g, " ")} &middot;{" "}
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/portal/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documents available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                      </div>
                      {index < data.recentActivity.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
