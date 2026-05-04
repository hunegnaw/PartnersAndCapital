import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function parseDatabaseUrl(raw: string) {
  // new URL() chokes on passwords containing # or other special chars.
  // Parse with a regex instead: protocol://user(:password)?@host(:port)?/database
  const m = raw.match(
    /^mysql:\/\/([^:@]+)(?::(.*))?@([^:/?]+)(?::(\d+))?\/([^?#]+)/
  );
  if (!m) throw new Error(`Invalid DATABASE_URL: ${raw}`);
  return {
    user: decodeURIComponent(m[1]),
    password: m[2] ? decodeURIComponent(m[2]) : undefined,
    host: m[3],
    port: parseInt(m[4] || "3306"),
    database: m[5],
  };
}

function createPrismaClient(): PrismaClient {
  const db = parseDatabaseUrl(
    process.env.DATABASE_URL || "mysql://root@localhost:3306/partnersandcapital"
  );

  const adapter = new PrismaMariaDb({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
