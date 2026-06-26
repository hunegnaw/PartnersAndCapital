import { prisma } from "@/lib/prisma";

// Org-wide feature flags stored in the SystemSetting key/value table (no schema
// migration needed to add a new flag).
export const SETTING_STATEMENT_EMAIL_SUPPRESSION = "statement_email_suppression_enabled";

export async function getBooleanSetting(key: string, fallback = false): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value === "true";
}

export async function setBooleanSetting(key: string, value: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: value ? "true" : "false" },
    create: { key, value: value ? "true" : "false" },
  });
}
