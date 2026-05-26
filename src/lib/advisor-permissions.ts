// Centralized advisor permission definitions and helpers

export const PERMISSION_LEVEL_VALUES = [
  "DASHBOARD_ONLY",
  "DASHBOARD_AND_TAX",
  "DASHBOARD_AND_LEGAL",
  "DASHBOARD_AND_REPORTS",
  "DASHBOARD_TAX_AND_LEGAL",
  "DASHBOARD_TAX_AND_REPORTS",
  "DASHBOARD_AND_ALL_DOCUMENTS",
  "DASHBOARD_AND_CAPITAL_ACTIVITY",
  "DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS",
  "FULL_ACCESS",
] as const;

export type AdvisorPermissionLevel =
  (typeof PERMISSION_LEVEL_VALUES)[number];

// Document type groupings
const TAX_DOC_TYPES = ["K1", "TAX_1099"];
const LEGAL_DOC_TYPES = ["SUBSCRIPTION_AGREEMENT", "PPM"];
const REPORT_DOC_TYPES = ["QUARTERLY_REPORT", "ANNUAL_REPORT"];

interface AdvisorPermissions {
  /** Document types the advisor may view/download. null = all types. */
  allowedDocTypes: string[] | null;
  /** Whether the advisor can view the Documents section at all. */
  canViewDocuments: boolean;
  /** Whether the advisor can view the Capital Activity page. */
  canViewCapitalActivity: boolean;
  /** Whether the advisor can view full investment details (amounts, IRR, etc.). */
  canViewInvestmentDetails: boolean;
}

/**
 * Given a permission level enum value, returns the concrete set of
 * capabilities granted to the advisor.
 */
export function getAdvisorPermissions(
  level: string
): AdvisorPermissions {
  switch (level) {
    case "DASHBOARD_ONLY":
      return {
        allowedDocTypes: [],
        canViewDocuments: false,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_AND_TAX":
      return {
        allowedDocTypes: TAX_DOC_TYPES,
        canViewDocuments: true,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_AND_LEGAL":
      return {
        allowedDocTypes: LEGAL_DOC_TYPES,
        canViewDocuments: true,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_AND_REPORTS":
      return {
        allowedDocTypes: REPORT_DOC_TYPES,
        canViewDocuments: true,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_TAX_AND_LEGAL":
      return {
        allowedDocTypes: [...TAX_DOC_TYPES, ...LEGAL_DOC_TYPES],
        canViewDocuments: true,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_TAX_AND_REPORTS":
      return {
        allowedDocTypes: [...TAX_DOC_TYPES, ...REPORT_DOC_TYPES],
        canViewDocuments: true,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_AND_ALL_DOCUMENTS":
      return {
        allowedDocTypes: null,
        canViewDocuments: true,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_AND_CAPITAL_ACTIVITY":
      return {
        allowedDocTypes: [],
        canViewDocuments: false,
        canViewCapitalActivity: true,
        canViewInvestmentDetails: false,
      };

    case "DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS":
      return {
        allowedDocTypes: null,
        canViewDocuments: true,
        canViewCapitalActivity: true,
        canViewInvestmentDetails: false,
      };

    case "FULL_ACCESS":
      return {
        allowedDocTypes: null,
        canViewDocuments: true,
        canViewCapitalActivity: true,
        canViewInvestmentDetails: true,
      };

    default:
      // Unknown level — deny everything
      return {
        allowedDocTypes: [],
        canViewDocuments: false,
        canViewCapitalActivity: false,
        canViewInvestmentDetails: false,
      };
  }
}

/**
 * UI-facing permission level definitions for the invite form radio group.
 */
export const PERMISSION_LEVELS: {
  value: AdvisorPermissionLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "DASHBOARD_ONLY",
    label: "Dashboard only",
    description:
      "Portfolio summary, allocation, and performance numbers. No documents.",
  },
  {
    value: "DASHBOARD_AND_TAX",
    label: "Dashboard + Tax documents",
    description:
      "Best for CPAs. Includes K-1s and 1099s. No legal agreements or reports.",
  },
  {
    value: "DASHBOARD_AND_LEGAL",
    label: "Dashboard + Legal documents",
    description:
      "Best for attorneys. Includes Subscription Agreements and PPMs.",
  },
  {
    value: "DASHBOARD_AND_REPORTS",
    label: "Dashboard + Reports",
    description:
      "Includes Quarterly Reports and Annual Reports. No tax or legal docs.",
  },
  {
    value: "DASHBOARD_TAX_AND_LEGAL",
    label: "Dashboard + Tax + Legal",
    description:
      "K-1s, 1099s, Subscription Agreements, and PPMs. No reports.",
  },
  {
    value: "DASHBOARD_TAX_AND_REPORTS",
    label: "Dashboard + Tax + Reports",
    description:
      "K-1s, 1099s, Quarterly Reports, and Annual Reports. No legal docs.",
  },
  {
    value: "DASHBOARD_AND_ALL_DOCUMENTS",
    label: "Dashboard + All documents",
    description:
      "Full document vault access. Recommended for financial advisors and family offices.",
  },
  {
    value: "DASHBOARD_AND_CAPITAL_ACTIVITY",
    label: "Dashboard + Capital Activity",
    description:
      "Portfolio summary plus contributions and distributions. No documents.",
  },
  {
    value: "DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS",
    label: "Dashboard + Capital Activity + All documents",
    description:
      "Full document vault plus capital activity history.",
  },
  {
    value: "FULL_ACCESS",
    label: "Full access",
    description:
      "Everything: all documents, capital activity, and investment details.",
  },
];

/**
 * Short label for a permission level — used in badges and compact displays.
 */
export function getPermissionShortLabel(level: string): string {
  const labels: Record<string, string> = {
    DASHBOARD_ONLY: "Dashboard Only",
    DASHBOARD_AND_TAX: "Dashboard + Tax Docs",
    DASHBOARD_AND_LEGAL: "Dashboard + Legal Docs",
    DASHBOARD_AND_REPORTS: "Dashboard + Reports",
    DASHBOARD_TAX_AND_LEGAL: "Dashboard + Tax + Legal",
    DASHBOARD_TAX_AND_REPORTS: "Dashboard + Tax + Reports",
    DASHBOARD_AND_ALL_DOCUMENTS: "Dashboard + All Docs",
    DASHBOARD_AND_CAPITAL_ACTIVITY: "Dashboard + Capital",
    DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS: "Dashboard + Capital + Docs",
    FULL_ACCESS: "Full Access",
  };
  return labels[level] || level;
}

/**
 * Long human-readable description — used in invitation emails.
 */
export function getPermissionEmailLabel(level: string): string {
  const labels: Record<string, string> = {
    DASHBOARD_ONLY:
      "Dashboard only \u2014 portfolio summary and performance numbers",
    DASHBOARD_AND_TAX:
      "Dashboard + tax documents (K-1s and 1099s)",
    DASHBOARD_AND_LEGAL:
      "Dashboard + legal documents (Subscription Agreements and PPMs)",
    DASHBOARD_AND_REPORTS:
      "Dashboard + reports (Quarterly and Annual Reports)",
    DASHBOARD_TAX_AND_LEGAL:
      "Dashboard + tax and legal documents",
    DASHBOARD_TAX_AND_REPORTS:
      "Dashboard + tax documents and reports",
    DASHBOARD_AND_ALL_DOCUMENTS:
      "Dashboard + all documents",
    DASHBOARD_AND_CAPITAL_ACTIVITY:
      "Dashboard + capital activity (contributions and distributions)",
    DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS:
      "Dashboard + capital activity + all documents",
    FULL_ACCESS:
      "Full access \u2014 all documents, capital activity, and investment details",
  };
  return labels[level] || level;
}

/**
 * Access tags for the advisor card UI — descriptive pills showing what
 * the advisor can see.
 */
export function getAccessTags(level: string): string[] {
  switch (level) {
    case "DASHBOARD_ONLY":
      return ["Dashboard"];
    case "DASHBOARD_AND_TAX":
      return ["Dashboard", "K-1s", "1099s"];
    case "DASHBOARD_AND_LEGAL":
      return ["Dashboard", "Sub Agreements", "PPMs"];
    case "DASHBOARD_AND_REPORTS":
      return ["Dashboard", "Quarterly Reports", "Annual Reports"];
    case "DASHBOARD_TAX_AND_LEGAL":
      return ["Dashboard", "K-1s", "1099s", "Sub Agreements", "PPMs"];
    case "DASHBOARD_TAX_AND_REPORTS":
      return ["Dashboard", "K-1s", "1099s", "Quarterly Reports", "Annual Reports"];
    case "DASHBOARD_AND_ALL_DOCUMENTS":
      return ["Dashboard", "All documents"];
    case "DASHBOARD_AND_CAPITAL_ACTIVITY":
      return ["Dashboard", "Capital Activity"];
    case "DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS":
      return ["Dashboard", "Capital Activity", "All documents"];
    case "FULL_ACCESS":
      return ["Full access"];
    default:
      return [];
  }
}
