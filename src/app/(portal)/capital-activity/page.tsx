"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDateOnly, cn } from "@/lib/utils";

interface Contribution {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  status: string;
  clientInvestment: {
    investment: { name: string };
  };
}

interface Distribution {
  id: string;
  amount: number;
  date: string;
  type: string;
  description: string | null;
  status: string;
  clientInvestment: {
    investment: { name: string };
  };
}

interface CapitalActivityResponse {
  contributions: Contribution[];
  distributions: Distribution[];
  summary: {
    totalContributions: number;
    totalDistributions: number;
    netCashFlow: number;
  };
}

interface ActivityRow {
  id: string;
  date: string;
  type: "Contribution" | "Distribution";
  investmentName: string;
  amount: number;
  status: string;
  description: string | null;
}

function statusBadgeVariant(status: string) {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "ACTIVE":
    case "FUNDED":
      return "default" as const;
    case "PENDING":
      return "secondary" as const;
    case "CANCELLED":
    case "FAILED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function SummarySkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No capital activity to display
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Investment</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.type}-${row.id}`}>
            <TableCell className="text-sm whitespace-nowrap">
              {formatDateOnly(row.date)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {row.type === "Contribution" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
                )}
                <Badge
                  variant={
                    row.type === "Contribution" ? "secondary" : "default"
                  }
                >
                  {row.type}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="text-sm font-medium">
              {row.investmentName}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-medium whitespace-nowrap",
                row.type === "Distribution" ? "text-green-600" : ""
              )}
            >
              {row.type === "Distribution" ? "+" : "-"}
              {formatCurrency(row.amount)}
            </TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(row.status)}>
                {row.status}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
              {row.description || "--"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CapitalActivityPage() {
  const [data, setData] = useState<CapitalActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/capital-activity");
      if (!res.ok) {
        throw new Error("Failed to load capital activity");
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
    Promise.resolve().then(() => fetchActivity());
  }, [fetchActivity]);

  if (loading) {
    return <SummarySkeleton />;
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

  const summary = data?.summary || {
    totalContributions: 0,
    totalDistributions: 0,
    netCashFlow: 0,
  };

  // Build combined rows
  const contributionRows: ActivityRow[] = (data?.contributions || []).map(
    (c) => ({
      id: c.id,
      date: c.date,
      type: "Contribution" as const,
      investmentName: c.clientInvestment?.investment?.name || "Unknown",
      amount: c.amount,
      status: c.status,
      description: c.description,
    })
  );

  const distributionRows: ActivityRow[] = (data?.distributions || []).map(
    (d) => ({
      id: d.id,
      date: d.date,
      type: "Distribution" as const,
      investmentName: d.clientInvestment?.investment?.name || "Unknown",
      amount: d.amount,
      status: d.status,
      description: d.description || d.type?.replace(/_/g, " "),
    })
  );

  const allRows = [...contributionRows, ...distributionRows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const summaryCards = [
    {
      label: "Total Contributions",
      value: formatCurrency(summary.totalContributions),
      icon: ArrowUpRight,
      color: "text-red-500",
    },
    {
      label: "Total Distributions",
      value: formatCurrency(summary.totalDistributions),
      icon: ArrowDownLeft,
      color: "text-green-500",
    },
    {
      label: "Net Cash Flow",
      value: formatCurrency(summary.netCashFlow),
      icon: TrendingUp,
      color:
        summary.netCashFlow >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capital Activity</h1>
        <p className="text-muted-foreground">
          Track your contributions and distributions across all investments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Table */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                All
                {allRows.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                    {allRows.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="contributions">
                Contributions
                {contributionRows.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                    {contributionRows.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="distributions">
                Distributions
                {distributionRows.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                    {distributionRows.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ActivityTable rows={allRows} />
            </TabsContent>

            <TabsContent value="contributions" className="mt-4">
              <ActivityTable rows={contributionRows} />
            </TabsContent>

            <TabsContent value="distributions" className="mt-4">
              <ActivityTable rows={distributionRows} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
