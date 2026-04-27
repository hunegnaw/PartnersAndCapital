"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  DollarSign,
  TrendingUp,
  Percent,
  Banknote,
  BarChart3,
  ChevronRight,
  FileText,
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from "lucide-react";
import { formatCurrency, formatDate, formatPercentage, cn } from "@/lib/utils";

interface InvestmentDetail {
  id: string;
  amountInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  irr: number | null;
  returnMultiple: number | null;
  cashDistributed: number;
  status: string;
  investmentDate: string;
  investment: {
    name: string;
    description: string;
    assetClass: { name: string };
    status: string;
    location: string | null;
    targetHoldPeriod: string | null;
    distributionCadence: string | null;
    fundStatus: string | null;
    targetReturn: string | null;
    vintage: string | null;
  };
  contributions: {
    id: string;
    amount: number;
    date: string;
    description: string | null;
    status: string;
  }[];
  distributions: {
    id: string;
    amount: number;
    date: string;
    type: string;
    description: string | null;
    status: string;
  }[];
  dealRoomUpdates: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    createdAt: string;
  }[];
}

function DetailSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-28" />
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

function statusBadgeVariant(status: string) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
    case "FUNDED":
    case "COMPLETED":
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

export default function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<InvestmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/investments/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load investment details");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Investment not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Amount Invested",
      value: formatCurrency(data.amountInvested),
      icon: DollarSign,
    },
    {
      label: "Current Value",
      value: formatCurrency(data.currentValue),
      icon: TrendingUp,
    },
    {
      label: "Total Return",
      value: formatPercentage(data.returnPercentage),
      icon: Percent,
      positive: data.returnPercentage >= 0,
    },
    {
      label: "IRR",
      value: data.irr != null ? formatPercentage(data.irr) : "N/A",
      icon: BarChart3,
      positive: data.irr != null ? data.irr >= 0 : undefined,
    },
    {
      label: "Cash Distributed",
      value: formatCurrency(data.cashDistributed),
      icon: Banknote,
    },
  ];

  const overviewRows = [
    { label: "Asset Class", value: data.investment.assetClass?.name },
    { label: "Status", value: data.investment.status },
    { label: "Location", value: data.investment.location },
    { label: "Target Hold Period", value: data.investment.targetHoldPeriod },
    { label: "Distribution Cadence", value: data.investment.distributionCadence },
    { label: "Vintage", value: data.investment.vintage },
    { label: "Target Return", value: data.investment.targetReturn },
    { label: "Fund Status", value: data.investment.fundStatus },
    {
      label: "Return Multiple",
      value: data.returnMultiple != null ? `${data.returnMultiple.toFixed(2)}x` : null,
    },
    { label: "Investment Date", value: data.investmentDate ? formatDate(data.investmentDate) : null },
  ].filter((row) => row.value);

  // Combine contributions and distributions for capital activity tab
  const capitalActivity = [
    ...data.contributions.map((c) => ({
      id: c.id,
      date: c.date,
      type: "Contribution" as const,
      amount: c.amount,
      description: c.description,
      status: c.status,
    })),
    ...data.distributions.map((d) => ({
      id: d.id,
      date: d.date,
      type: "Distribution" as const,
      amount: d.amount,
      description: d.description || d.type?.replace(/_/g, " "),
      status: d.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/investments" className="hover:text-foreground transition-colors">
          Portfolio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">
          {data.investment.name}
        </span>
      </nav>

      {/* Title and Status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.investment.name}
          </h1>
          {data.investment.description && (
            <p className="text-muted-foreground mt-1 max-w-2xl">
              {data.investment.description}
            </p>
          )}
        </div>
        <Badge variant={statusBadgeVariant(data.status)} className="text-sm">
          {data.status}
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <metric.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p
                className={cn(
                  "text-xl font-bold",
                  metric.positive === true && "text-green-600",
                  metric.positive === false && "text-red-600"
                )}
              >
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">
            Updates
            {data.dealRoomUpdates.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {data.dealRoomUpdates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {data.documents.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {data.documents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="capital-activity">Capital Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-y-3">
                {overviewRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {row.label}
                    </span>
                    <span className="text-sm font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Room Updates</CardTitle>
              <CardDescription>
                Updates and communications about this investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.dealRoomUpdates.length > 0 ? (
                <div className="space-y-6">
                  {data.dealRoomUpdates.map((update, index) => (
                    <div key={update.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Info className="h-3.5 w-3.5 text-primary" />
                        </div>
                        {index < data.dealRoomUpdates.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="pb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">
                            {update.title}
                          </h4>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(update.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {update.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No updates available for this investment
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>
                Documents related to this investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.documents.length > 0 ? (
                <div className="space-y-2">
                  {data.documents.map((doc) => (
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
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents available for this investment
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capital Activity Tab */}
        <TabsContent value="capital-activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Capital Activity</CardTitle>
              <CardDescription>
                Contributions and distributions for this investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {capitalActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capitalActivity.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell className="text-sm">
                          {formatDate(item.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {item.type === "Contribution" ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
                            )}
                            <Badge
                              variant={
                                item.type === "Contribution"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {item.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            item.type === "Distribution"
                              ? "text-green-600"
                              : ""
                          )}
                        >
                          {item.type === "Distribution" ? "+" : "-"}
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.description || "--"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No capital activity recorded
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
