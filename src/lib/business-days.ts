import { prisma } from "@/lib/prisma";

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

const HOLIDAY_CACHE = new Map<number, Set<string>>();

export async function getUSBankHolidays(year: number): Promise<Set<string>> {
  if (HOLIDAY_CACHE.has(year)) return HOLIDAY_CACHE.get(year)!;

  const cacheKey = `us-bank-holidays-${year}`;
  const cached = await prisma.systemSetting.findUnique({ where: { key: cacheKey } });
  if (cached?.value) {
    const dates = new Set(JSON.parse(cached.value as string) as string[]);
    HOLIDAY_CACHE.set(year, dates);
    return dates;
  }

  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`);
    if (!res.ok) throw new Error(`Holiday API returned ${res.status}`);
    const holidays: NagerHoliday[] = await res.json();
    const bankHolidayTypes = holidays
      .filter((h) => h.types.includes("Public"))
      .map((h) => h.date);

    const dateSet = new Set(bankHolidayTypes);
    HOLIDAY_CACHE.set(year, dateSet);

    await prisma.systemSetting.upsert({
      where: { key: cacheKey },
      update: { value: JSON.stringify(bankHolidayTypes) },
      create: { key: cacheKey, value: JSON.stringify(bankHolidayTypes) },
    });

    return dateSet;
  } catch {
    return getFallbackHolidays(year);
  }
}

function getFallbackHolidays(year: number): Set<string> {
  const holidays = [
    `${year}-01-01`,
    `${year}-07-04`,
    `${year}-12-25`,
  ];
  return new Set(holidays);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export async function getNextBusinessDay(targetDate: Date): Promise<Date> {
  const holidays = await getUSBankHolidays(targetDate.getFullYear());
  const date = new Date(targetDate);
  while (isWeekend(date) || holidays.has(toDateStr(date))) {
    date.setDate(date.getDate() + 1);
    if (date.getFullYear() !== targetDate.getFullYear()) {
      const nextYearHolidays = await getUSBankHolidays(date.getFullYear());
      nextYearHolidays.forEach((h) => holidays.add(h));
    }
  }
  return date;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
