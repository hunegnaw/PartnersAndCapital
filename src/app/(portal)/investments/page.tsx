"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";

interface Investment {
  id: string;
  amountInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  status: string;
  investment: {
    name: string;
    description: string;
    assetClass: { name: string };
    status: string;
  };
}

interface InvestmentsResponse {
  investments: Investment[];
}

function InvestmentCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function statusBadgeVariant(status: string) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
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

export default function InvestmentsPage() {
  const router = useRouter();
  const [data, setData] = useState<InvestmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvestments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/investments");
      if (!res.ok) {
        throw new Error("Failed to load investments");
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
    fetchInvestments();
  }, [fetchInvestments]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <InvestmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
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

  const investments = data?.investments || [];

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          {investments.length > 0
            ? `${investments.length} investment${investments.length !== 1 ? "s" : ""} in your portfolio`
            : "Your investment portfolio"}
        </p>
      </div>

      {investments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your portfolio is empty. Investments will appear here once your
                advisor adds them to your account.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {investments.map((inv) => (
            <Card
              key={inv.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/investments/${inv.id}`)}
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">
                        {inv.investment.name}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        {inv.investment.assetClass?.name || "N/A"}
                      </Badge>
                    </div>
                    <Badge variant={statusBadgeVariant(inv.status)}>
                      {inv.status}
                    </Badge>
                  </div>

                  {/* Description */}
                  {inv.investment.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {inv.investment.description}
                    </p>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Invested</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(inv.amountInvested)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Current Value
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(inv.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Return</p>
                      <div className="flex items-center gap-1">
                        {inv.returnPercentage >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                        )}
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            inv.returnPercentage >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {formatPercentage(inv.returnPercentage)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
