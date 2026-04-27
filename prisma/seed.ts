import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const url = new URL(process.env.DATABASE_URL || "mysql://root:password@localhost:3306/partnersandcapital");
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.password ? url.username : "root",
  password: url.password || "password",
  database: url.pathname.slice(1),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { id: "default-org" },
    update: {},
    create: {
      id: "default-org",
      name: "Partners + Capital",
      legalName: "Partners + Capital LLC",
      primaryColor: "#1e3a5f",
      secondaryColor: "#2563eb",
      accentColor: "#f59e0b",
      twoFactorPolicy: "optional",
      disclaimer:
        "Past performance is not indicative of future results. All investments involve risk, including loss of principal.",
    },
  });
  console.log(`Organization: ${org.name}`);

  // Create default super admin
  const adminPassword = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@partnersandcapital.com" },
    update: {},
    create: {
      email: "admin@partnersandcapital.com",
      password: adminPassword,
      name: "System Admin",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // Create default asset classes
  const assetClasses = [
    {
      name: "Oil & Gas",
      description: "Energy sector investments including exploration, production, and midstream operations.",
      icon: "Flame",
      sortOrder: 1,
    },
    {
      name: "Real Estate",
      description: "Commercial and residential real estate investments including development and acquisition.",
      icon: "Building",
      sortOrder: 2,
    },
    {
      name: "Private Credit",
      description: "Direct lending and structured credit investments.",
      icon: "Landmark",
      sortOrder: 3,
    },
    {
      name: "Specialty",
      description: "Alternative and specialty investments across various sectors.",
      icon: "Star",
      sortOrder: 4,
    },
  ];

  for (const ac of assetClasses) {
    const created = await prisma.assetClass.upsert({
      where: { name: ac.name },
      update: {},
      create: ac,
    });
    console.log(`Asset class: ${created.name}`);
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
