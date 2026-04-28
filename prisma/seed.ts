import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function parseDatabaseUrl(raw: string) {
  const m = raw.match(
    /^mysql:\/\/([^:@]+)(?::(.*))?@([^:/?]+)(?::(\d+))?\/([^?#]+)/
  );
  if (!m) throw new Error(`Invalid DATABASE_URL: ${raw}`);
  return {
    user: m[1],
    password: m[2] || undefined,
    host: m[3],
    port: parseInt(m[4] || "3306"),
    database: m[5],
  };
}

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
const prisma = new PrismaClient({ adapter });

const isProduction = process.env.NODE_ENV === "production";

async function main() {
  console.log(`Seeding database... (${isProduction ? "PRODUCTION" : "development"})`);

  // ============================================================
  // ALWAYS SEED: Organization, Admin, Asset Classes
  // ============================================================

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { id: "default-org" },
    update: {},
    create: {
      id: "default-org",
      name: "Partners + Capital",
      legalName: "Partners + Capital LLC",
      email: "info@partnersandcapital.com",
      phone: "(212) 555-0100",
      website: "https://partnersandcapital.com",
      address: "350 Park Avenue, Suite 2100\nNew York, NY 10022",
      primaryColor: "#1e3a5f",
      secondaryColor: "#2563eb",
      accentColor: "#f59e0b",
      twoFactorPolicy: "optional",
      disclaimer:
        "Past performance is not indicative of future results. All investments involve risk, including loss of principal. The information contained herein is confidential and intended solely for the named recipient.",
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

  // Create asset classes
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

  const acMap: Record<string, string> = {};
  for (const ac of assetClasses) {
    const created = await prisma.assetClass.upsert({
      where: { name: ac.name },
      update: {},
      create: ac,
    });
    acMap[created.name] = created.id;
    console.log(`Asset class: ${created.name}`);
  }

  // ============================================================
  // DEVELOPMENT ONLY: Demo clients, investments, documents, etc.
  // ============================================================

  if (isProduction) {
    console.log("\nProduction mode — skipping demo data.");
    console.log("Seeding completed successfully!");
    return;
  }

  // Create client users
  const clientPassword = await bcrypt.hash("client123!", 12);
  const clients = [
    { email: "david.morgan@example.com", name: "David Morgan", phone: "(713) 555-0201", company: "Morgan Family Office" },
    { email: "sandra.okafor@example.com", name: "Sandra Okafor", phone: "(404) 555-0302", company: "Okafor Holdings LLC" },
    { email: "james.whitfield@example.com", name: "James Whitfield", phone: "(312) 555-0403", company: "Whitfield Capital" },
    { email: "rachel.tran@example.com", name: "Rachel Tran", phone: "(415) 555-0504", company: "Tran Ventures" },
  ];

  const clientUsers: Array<{ id: string; email: string; name: string }> = [];
  for (const c of clients) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        password: clientPassword,
        name: c.name,
        phone: c.phone,
        company: c.company,
        role: "CLIENT",
        emailVerified: new Date(),
      },
    });
    clientUsers.push({ id: user.id, email: user.email, name: user.name || c.name });
    console.log(`Client user: ${user.email}`);
  }

  // Create investments
  const investments = [
    {
      name: "Permian Basin Fund I",
      description: "A diversified oil and gas fund focused on proven reserves in the Permian Basin region of West Texas.",
      assetClassId: acMap["Oil & Gas"],
      status: "ACTIVE" as const,
      targetReturn: 18.5,
      minimumInvestment: 250000,
      vintage: 2023,
      startDate: new Date("2023-03-01"),
      location: "West Texas",
      targetHoldPeriod: "5-7 years",
      distributionCadence: "Quarterly",
      fundStatus: "Deploying Capital",
    },
    {
      name: "Garden Park",
      description: "Class A multifamily development in a high-growth suburban market with strong rental demand.",
      assetClassId: acMap["Real Estate"],
      status: "ACTIVE" as const,
      targetReturn: 14.0,
      minimumInvestment: 100000,
      vintage: 2024,
      startDate: new Date("2024-01-15"),
      location: "Austin, TX",
      targetHoldPeriod: "3-5 years",
      distributionCadence: "Monthly",
      fundStatus: "Construction Phase",
    },
    {
      name: "Private Credit Fund II",
      description: "Senior secured lending to middle-market companies with strong cash flow characteristics.",
      assetClassId: acMap["Private Credit"],
      status: "ACTIVE" as const,
      targetReturn: 11.0,
      minimumInvestment: 500000,
      vintage: 2024,
      startDate: new Date("2024-06-01"),
      location: "National",
      targetHoldPeriod: "3-4 years",
      distributionCadence: "Quarterly",
      fundStatus: "Fully Deployed",
    },
    {
      name: "Thoroughbred Fund",
      description: "Specialty investment in thoroughbred horse racing and breeding operations.",
      assetClassId: acMap["Specialty"],
      status: "ACTIVE" as const,
      targetReturn: 22.0,
      minimumInvestment: 150000,
      vintage: 2023,
      startDate: new Date("2023-09-01"),
      location: "Lexington, KY",
      targetHoldPeriod: "4-6 years",
      distributionCadence: "Annual",
      fundStatus: "Active Management",
    },
  ];

  const investmentRecords: Array<{ id: string; name: string }> = [];
  for (const inv of investments) {
    const existing = await prisma.investment.findFirst({ where: { name: inv.name, deletedAt: null } });
    if (existing) {
      investmentRecords.push({ id: existing.id, name: existing.name });
      console.log(`Investment exists: ${existing.name}`);
      continue;
    }
    const created = await prisma.investment.create({
      data: {
        name: inv.name,
        description: inv.description,
        assetClassId: inv.assetClassId,
        status: inv.status,
        targetReturn: inv.targetReturn,
        minimumInvestment: inv.minimumInvestment,
        vintage: inv.vintage,
        startDate: inv.startDate,
        location: inv.location,
        targetHoldPeriod: inv.targetHoldPeriod,
        distributionCadence: inv.distributionCadence,
        fundStatus: inv.fundStatus,
      },
    });
    investmentRecords.push({ id: created.id, name: created.name });
    console.log(`Investment: ${created.name}`);
  }

  // Client investment positions — match mockup values
  const positions = [
    // David Morgan - 3 investments ($250K Permian, $150K Garden Park, $500K Private Credit)
    { userId: clientUsers[0].id, investmentId: investmentRecords[0].id, amountInvested: 250000, currentValue: 290000, totalReturn: 40000, returnPercentage: 16.0, irr: 12.5, returnMultiple: 1.16, cashDistributed: 22500, investmentDate: new Date("2023-04-01") },
    { userId: clientUsers[0].id, investmentId: investmentRecords[1].id, amountInvested: 150000, currentValue: 164000, totalReturn: 14000, returnPercentage: 9.3, irr: 8.1, returnMultiple: 1.09, cashDistributed: 8000, investmentDate: new Date("2024-02-01") },
    { userId: clientUsers[0].id, investmentId: investmentRecords[2].id, amountInvested: 500000, currentValue: 525000, totalReturn: 25000, returnPercentage: 5.0, irr: 10.2, returnMultiple: 1.05, cashDistributed: 18000, investmentDate: new Date("2024-07-01") },
    // Sandra Okafor - 2 investments
    { userId: clientUsers[1].id, investmentId: investmentRecords[0].id, amountInvested: 300000, currentValue: 342000, totalReturn: 42000, returnPercentage: 14.0, irr: 11.8, returnMultiple: 1.14, cashDistributed: 27000, investmentDate: new Date("2023-05-01") },
    { userId: clientUsers[1].id, investmentId: investmentRecords[3].id, amountInvested: 200000, currentValue: 230000, totalReturn: 30000, returnPercentage: 15.0, irr: 13.5, returnMultiple: 1.15, cashDistributed: 15000, investmentDate: new Date("2023-10-01") },
    // James Whitfield - NO investments (empty dashboard state)
    // Rachel Tran - 3 investments
    { userId: clientUsers[3].id, investmentId: investmentRecords[0].id, amountInvested: 250000, currentValue: 290000, totalReturn: 40000, returnPercentage: 16.0, irr: 13.2, returnMultiple: 1.16, cashDistributed: 22500, investmentDate: new Date("2023-06-01") },
    { userId: clientUsers[3].id, investmentId: investmentRecords[2].id, amountInvested: 500000, currentValue: 525000, totalReturn: 25000, returnPercentage: 5.0, irr: 9.8, returnMultiple: 1.05, cashDistributed: 18000, investmentDate: new Date("2024-08-01") },
    { userId: clientUsers[3].id, investmentId: investmentRecords[3].id, amountInvested: 150000, currentValue: 172500, totalReturn: 22500, returnPercentage: 15.0, irr: 14.0, returnMultiple: 1.15, cashDistributed: 10000, investmentDate: new Date("2023-11-01") },
  ];

  for (const pos of positions) {
    const existing = await prisma.clientInvestment.findUnique({
      where: { userId_investmentId: { userId: pos.userId, investmentId: pos.investmentId } },
    });
    if (existing) {
      console.log(`Position exists for user ${pos.userId} in investment ${pos.investmentId}`);
      continue;
    }
    await prisma.clientInvestment.create({
      data: {
        userId: pos.userId,
        investmentId: pos.investmentId,
        amountInvested: pos.amountInvested,
        currentValue: pos.currentValue,
        totalReturn: pos.totalReturn,
        returnPercentage: pos.returnPercentage,
        irr: pos.irr,
        returnMultiple: pos.returnMultiple,
        cashDistributed: pos.cashDistributed,
        investmentDate: pos.investmentDate,
        status: "ACTIVE",
      },
    });
  }
  console.log(`Created ${positions.length} client investment positions`);

  // Contributions and Distributions
  const allPositions = await prisma.clientInvestment.findMany({
    where: { deletedAt: null },
    include: { user: true, investment: true },
  });

  for (const pos of allPositions) {
    const existingContrib = await prisma.contribution.findFirst({
      where: { clientInvestmentId: pos.id },
    });
    if (existingContrib) continue;

    await prisma.contribution.create({
      data: {
        userId: pos.userId,
        clientInvestmentId: pos.id,
        amount: pos.amountInvested,
        date: pos.investmentDate || pos.createdAt,
        description: `Initial investment in ${pos.investment.name}`,
        status: "COMPLETED",
      },
    });

    const distCount = Math.floor(Number(pos.cashDistributed) / (Number(pos.amountInvested) * 0.02)) || 1;
    const distAmount = Number(pos.cashDistributed) / Math.min(distCount, 4);

    for (let i = 0; i < Math.min(distCount, 4); i++) {
      const distDate = new Date(pos.investmentDate || pos.createdAt);
      distDate.setMonth(distDate.getMonth() + (i + 1) * 3);
      if (distDate > new Date()) break;

      await prisma.distribution.create({
        data: {
          userId: pos.userId,
          clientInvestmentId: pos.id,
          amount: Math.round(distAmount * 100) / 100,
          date: distDate,
          type: "CASH",
          description: `Q${Math.ceil((distDate.getMonth() + 1) / 3)} ${distDate.getFullYear()} distribution - ${pos.investment.name}`,
          status: "COMPLETED",
        },
      });
    }
  }
  console.log("Created contributions and distributions");

  // Documents
  const documentData = [
    { name: "2024 K-1 Tax Document - Permian Basin Fund I", type: "K1" as const, year: 2024, investmentId: investmentRecords[0].id, userId: clientUsers[0].id },
    { name: "2024 K-1 Tax Document - Garden Park", type: "K1" as const, year: 2024, investmentId: investmentRecords[1].id, userId: clientUsers[0].id },
    { name: "Q4 2024 Quarterly Report - Permian Basin Fund I", type: "QUARTERLY_REPORT" as const, year: 2024, investmentId: investmentRecords[0].id, userId: clientUsers[0].id },
    { name: "Q4 2024 Quarterly Report - Private Credit Fund II", type: "QUARTERLY_REPORT" as const, year: 2024, investmentId: investmentRecords[2].id, userId: clientUsers[0].id },
    { name: "Subscription Agreement - Garden Park", type: "SUBSCRIPTION_AGREEMENT" as const, year: 2024, investmentId: investmentRecords[1].id, userId: clientUsers[0].id },
    { name: "Subscription Agreement - Thoroughbred Fund", type: "SUBSCRIPTION_AGREEMENT" as const, year: 2023, investmentId: investmentRecords[3].id, userId: clientUsers[1].id },
    { name: "2024 Annual Report - All Funds", type: "ANNUAL_REPORT" as const, year: 2024, investmentId: null, userId: clientUsers[0].id },
    { name: "Private Placement Memorandum - Private Credit Fund II", type: "PPM" as const, year: 2024, investmentId: investmentRecords[2].id, userId: clientUsers[0].id },
  ];

  for (const doc of documentData) {
    const existing = await prisma.document.findFirst({ where: { name: doc.name, deletedAt: null } });
    if (existing) continue;

    await prisma.document.create({
      data: {
        name: doc.name,
        fileName: doc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf",
        filePath: "uploads/documents/2024/placeholder.enc",
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        mimeType: "application/pdf",
        type: doc.type,
        year: doc.year,
        description: `${doc.type.replace(/_/g, " ")} document`,
        userId: doc.userId,
        investmentId: doc.investmentId,
        advisorVisible: doc.type === "K1" || doc.type === "QUARTERLY_REPORT",
      },
    });
  }
  console.log(`Created ${documentData.length} documents`);

  // Deal Room Updates
  const dealRoomUpdates = [
    { investmentId: investmentRecords[0].id, title: "Q4 2024 Operational Update", content: "Production volumes in the Permian Basin Fund I exceeded projections by 8% this quarter. Two new horizontal wells were completed ahead of schedule, contributing to the outperformance." },
    { investmentId: investmentRecords[0].id, title: "New Lease Acquisition", content: "We are pleased to announce the acquisition of 2,400 additional mineral acres adjacent to our existing holdings." },
    { investmentId: investmentRecords[1].id, title: "Construction Milestone - Phase 1 Complete", content: "Garden Park Phase 1 construction has been completed on time and under budget. The first 120 units are now available for leasing." },
    { investmentId: investmentRecords[1].id, title: "Leasing Update", content: "We are pleased to report that Garden Park has achieved 75% occupancy within 60 days of opening." },
    { investmentId: investmentRecords[2].id, title: "Portfolio Performance Update", content: "Private Credit Fund II continues to perform well with zero defaults across our 18 portfolio companies." },
    { investmentId: investmentRecords[3].id, title: "Racing Season Results", content: "The Thoroughbred Fund had an outstanding fall racing season with three horses placing in Grade 1 stakes races." },
  ];

  for (const update of dealRoomUpdates) {
    const existing = await prisma.dealRoomUpdate.findFirst({
      where: { investmentId: update.investmentId, title: update.title, deletedAt: null },
    });
    if (existing) continue;
    await prisma.dealRoomUpdate.create({ data: update });
  }
  console.log(`Created ${dealRoomUpdates.length} deal room updates`);

  // Activity Feed
  const activityEntries = [
    { authorId: admin.id, title: "Welcome to Partners + Capital Portal", content: "We are excited to launch our new investor portal.", isBroadcast: true },
    { authorId: admin.id, title: "Q4 2024 Tax Documents Available", content: "2024 K-1 tax documents are now available in the Documents section.", isBroadcast: true },
    { authorId: admin.id, title: "Annual Investor Meeting Scheduled", content: "Our annual investor meeting is scheduled for March 15, 2025.", isBroadcast: true },
    { authorId: admin.id, title: "New Investment Opportunity", content: "We are excited to announce a new investment opportunity in the renewable energy sector.", isBroadcast: true },
  ];

  for (const entry of activityEntries) {
    const existing = await prisma.activityFeed.findFirst({ where: { title: entry.title, deletedAt: null } });
    if (existing) continue;
    await prisma.activityFeed.create({ data: entry });
  }
  console.log(`Created ${activityEntries.length} activity feed entries`);

  // Advisor invitations — updated to match mockup
  const advisorData = [
    {
      clientId: clientUsers[0].id,
      email: "sarah.ellison@taxcpa.com",
      name: "Sarah Ellison",
      firm: "Ellison Tax Group",
      advisorType: "CPA",
      status: "ACTIVE" as const,
      acceptedAt: new Date("2024-06-15"),
      permissionLevel: "DASHBOARD_AND_TAX_DOCUMENTS" as const,
    },
    {
      clientId: clientUsers[0].id,
      email: "robert.walsh@meridianwealth.com",
      name: "Robert Walsh",
      firm: "Meridian Wealth",
      advisorType: "FINANCIAL_ADVISOR",
      status: "PENDING" as const,
      acceptedAt: null,
      permissionLevel: "DASHBOARD_AND_DOCUMENTS" as const,
    },
  ];

  for (const adv of advisorData) {
    const existing = await prisma.advisor.findFirst({
      where: { email: adv.email, clientId: adv.clientId },
    });
    if (existing) continue;

    const advisor = await prisma.advisor.create({
      data: {
        clientId: adv.clientId,
        email: adv.email,
        name: adv.name,
        firm: adv.firm,
        advisorType: adv.advisorType,
        status: adv.status,
        acceptedAt: adv.acceptedAt || null,
        invitationToken: crypto.randomUUID(),
      },
    });

    await prisma.advisorAccess.create({
      data: {
        advisorId: advisor.id,
        userId: adv.clientId,
        permissionLevel: adv.permissionLevel,
        accessStartAt: adv.acceptedAt || new Date(),
        expiresAt: new Date("2025-12-31"),
      },
    });
  }
  console.log(`Created ${advisorData.length} advisor invitations`);

  // Notifications
  const notifications = [
    { userId: clientUsers[0].id, type: "DOCUMENT_UPLOADED" as const, title: "New Document Available", message: "Your 2024 K-1 for Permian Basin Fund I is now available.", link: "/documents" },
    { userId: clientUsers[0].id, type: "DISTRIBUTION_RECEIVED" as const, title: "Distribution Received", message: "A distribution of $15,000.00 has been processed.", link: "/capital-activity" },
    { userId: clientUsers[0].id, type: "ACTIVITY_POST" as const, title: "New Update from Partners + Capital", message: "Q4 2024 Tax Documents Available.", link: "/dashboard" },
  ];

  for (const notif of notifications) {
    const existing = await prisma.notification.findFirst({ where: { userId: notif.userId, title: notif.title } });
    if (existing) continue;
    await prisma.notification.create({ data: notif });
  }
  console.log(`Created ${notifications.length} notifications`);

  // Audit log entries
  const auditEntries = [
    { userId: admin.id, action: "AUTH_LOGIN", targetType: "USER", targetId: admin.id, details: { method: "credentials" } },
    { userId: admin.id, action: "CREATE_CLIENT", targetType: "USER", targetId: clientUsers[0].id, details: { email: clientUsers[0].email } },
    { userId: admin.id, action: "UPLOAD_DOCUMENT", targetType: "DOCUMENT", details: { name: "2024 K-1 Tax Document" } },
    { userId: clientUsers[0].id, action: "AUTH_LOGIN", targetType: "USER", targetId: clientUsers[0].id, details: { method: "credentials" } },
    { userId: clientUsers[0].id, action: "DOWNLOAD_DOCUMENT", targetType: "DOCUMENT", details: { name: "Q4 2024 Quarterly Report" } },
    { userId: clientUsers[0].id, action: "INVITE_ADVISOR", targetType: "Advisor", details: { email: "sarah.ellison@taxcpa.com", name: "Sarah Ellison" } },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId || null,
        details: entry.details || null,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (seed script)",
      },
    });
  }
  console.log(`Created ${auditEntries.length} audit log entries`);

  console.log("\nSeeding completed successfully!");
  console.log("\nDemo Accounts:");
  console.log("  Admin: admin@partnersandcapital.com / admin123!");
  console.log("  Client (full): david.morgan@example.com / client123!");
  console.log("  Client: sandra.okafor@example.com / client123!");
  console.log("  Client (empty): james.whitfield@example.com / client123!");
  console.log("  Client: rachel.tran@example.com / client123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
