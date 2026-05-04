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
    user: decodeURIComponent(m[1]),
    password: m[2] ? decodeURIComponent(m[2]) : undefined,
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
      primaryColor: "#1A2640",
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

  // ============================================================
  // BLOG CATEGORIES, TAGS, AND POSTS
  // ============================================================

  const blogCategories = [
    { name: "Investments", slug: "investments", color: "#B07D3A", sortOrder: 1 },
    { name: "Market Insights", slug: "market-insights", color: "#1A2640", sortOrder: 2 },
    { name: "Company Updates", slug: "company-updates", color: "#2563eb", sortOrder: 3 },
  ];

  const catMap: Record<string, string> = {};
  for (const cat of blogCategories) {
    const created = await prisma.blogCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    catMap[created.slug] = created.id;
  }
  console.log(`Created ${blogCategories.length} blog categories`);

  const blogTags = [
    { name: "Biochar", slug: "biochar", color: "#059669" },
    { name: "Oil & Gas", slug: "oil-gas", color: "#b45309" },
    { name: "Real Estate", slug: "real-estate", color: "#7c3aed" },
    { name: "Private Credit", slug: "private-credit", color: "#0369a1" },
    { name: "Consumer Products", slug: "consumer-products", color: "#a32d2d" },
    { name: "Agriculture", slug: "agriculture", color: "#16a34a" },
    { name: "Technology", slug: "technology", color: "#6366f1" },
    { name: "ESG", slug: "esg", color: "#0d9488" },
  ];

  const tagMap: Record<string, string> = {};
  for (const tag of blogTags) {
    const created = await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    tagMap[created.slug] = created.id;
  }
  console.log(`Created ${blogTags.length} blog tags`);

  const blogPosts = [
    {
      title: "Why We Invested in Biochar",
      slug: "why-we-invested-in-biochar",
      excerpt: "Carbon removal meets agricultural productivity. Here's why biochar represents a compelling opportunity in the carbon economy.",
      content: "<p>At Partners + Capital, we are always looking for investments that sit at the intersection of strong returns and positive impact. Biochar represents exactly that kind of opportunity.</p><h2>What is Biochar?</h2><p>Biochar is a carbon-rich material produced by heating organic matter in the absence of oxygen — a process called pyrolysis. When applied to soil, it improves water retention, nutrient availability, and microbial activity while permanently sequestering carbon.</p><h2>The Investment Thesis</h2><p>The global carbon credit market is projected to reach $50 billion by 2030. Biochar is one of the few carbon removal technologies that is both scalable and profitable today. Our portfolio company operates production facilities that convert agricultural waste into high-quality biochar, generating revenue from both product sales and carbon credit monetization.</p><p>We believe this represents a generational opportunity to invest in the infrastructure of the carbon economy.</p>",
      categorySlug: "investments",
      tagSlugs: ["biochar", "esg", "agriculture"],
      publishedAt: new Date("2024-11-15"),
    },
    {
      title: "Q3 2024 Market Commentary",
      slug: "q3-2024-market-commentary",
      excerpt: "Our quarterly analysis of private market trends, deal flow, and portfolio performance.",
      content: "<p>The third quarter of 2024 continued to demonstrate the resilience of private markets even as public equities experienced increased volatility. Here are our key observations.</p><h2>Deal Flow</h2><p>We reviewed over 200 potential investments this quarter and made commitments to three new positions across our core verticals. The quality of deal flow remains strong, though valuations have become more disciplined compared to 2021-2022 levels.</p><h2>Portfolio Performance</h2><p>Our aggregate portfolio delivered a 14.2% net return for the quarter, outperforming public market equivalents by approximately 600 basis points. Real estate and private credit led performance, while our energy positions benefited from sustained commodity prices.</p><h2>Looking Ahead</h2><p>We expect continued opportunity in middle-market lending and value-add real estate as traditional lenders pull back. Our pipeline for Q4 includes several compelling opportunities in the energy transition space.</p>",
      categorySlug: "market-insights",
      tagSlugs: ["private-credit", "real-estate", "oil-gas"],
      publishedAt: new Date("2024-10-01"),
    },
    {
      title: "The Case for Private Credit in 2024",
      slug: "the-case-for-private-credit-in-2024",
      excerpt: "As banks retreat from middle-market lending, private credit fills the gap with attractive risk-adjusted returns.",
      content: "<p>The private credit market has grown to over $1.5 trillion globally, and we believe the opportunity set is only getting larger. Here's our thesis.</p><h2>The Banking Retreat</h2><p>Increased regulatory capital requirements have forced traditional banks to reduce their middle-market lending activities. This structural shift creates a permanent opportunity for private lenders to fill the gap.</p><h2>Attractive Returns</h2><p>Senior secured private credit currently offers yields of 10-13%, with first-lien positions and strong covenant protections. In a rising rate environment, floating-rate structures provide natural inflation protection.</p><h2>Our Approach</h2><p>We focus on companies with $10-50M in EBITDA, strong cash flow characteristics, and experienced management teams. Our underwriting process emphasizes downside protection and capital preservation.</p>",
      categorySlug: "investments",
      tagSlugs: ["private-credit"],
      publishedAt: new Date("2024-09-15"),
    },
    {
      title: "Permian Basin Fund I: One Year Update",
      slug: "permian-basin-fund-one-year-update",
      excerpt: "Our flagship energy fund marks its first anniversary with strong production numbers and new acquisitions.",
      content: "<p>One year ago, we launched the Permian Basin Fund I with a focus on proven reserves in West Texas. Today, we're pleased to share our progress.</p><h2>Production Performance</h2><p>Our wells are producing 8% above initial projections, benefiting from improved completion techniques and favorable geology. Total production for the first twelve months exceeded 500,000 barrels of oil equivalent.</p><h2>Capital Deployment</h2><p>We have deployed 85% of committed capital across 12 wells and recently acquired 2,400 additional mineral acres adjacent to our core position. This strategic acquisition gives us significant running room for future development.</p><h2>Distributions</h2><p>Investors have received quarterly cash distributions averaging a 4.5% quarterly yield on invested capital. We expect distributions to accelerate as our newer wells reach peak production rates.</p>",
      categorySlug: "investments",
      tagSlugs: ["oil-gas"],
      publishedAt: new Date("2024-08-01"),
    },
    {
      title: "Garden Park Development: Breaking Ground",
      slug: "garden-park-development-breaking-ground",
      excerpt: "Our Class A multifamily project in Austin begins construction with strong pre-leasing indicators.",
      content: "<p>We're excited to announce that construction has officially begun on Garden Park, our 240-unit Class A multifamily development in Austin, Texas.</p><h2>The Opportunity</h2><p>Austin continues to be one of the fastest-growing metro areas in the country, with strong job creation and population inflows. Our site benefits from excellent access to major employment centers, top-rated schools, and retail amenities.</p><h2>Development Plan</h2><p>Garden Park will feature resort-style amenities including a pool, fitness center, dog park, and co-working spaces. Units range from studios to three-bedrooms, targeting young professionals and growing families.</p><h2>Financial Projections</h2><p>We project a stabilized yield of 6.5% on cost and a 14% levered IRR over a five-year hold period. Our all-in development cost of $285,000 per unit represents a significant discount to comparable existing properties trading at $350,000+ per unit.</p>",
      categorySlug: "investments",
      tagSlugs: ["real-estate"],
      publishedAt: new Date("2024-07-01"),
    },
    {
      title: "Understanding IRR: A Guide for Investors",
      slug: "understanding-irr-a-guide-for-investors",
      excerpt: "Internal Rate of Return explained — what it means, how to interpret it, and why it matters for your portfolio.",
      content: "<p>Internal Rate of Return (IRR) is one of the most commonly cited metrics in private investing, yet it's often misunderstood. Let's break it down.</p><h2>What is IRR?</h2><p>IRR is the annualized rate of return that makes the net present value of all cash flows equal to zero. In simpler terms, it accounts for both the magnitude and timing of your returns.</p><h2>Why Timing Matters</h2><p>Unlike simple return multiples, IRR rewards investments that return capital quickly. A 2x multiple over 3 years represents a much higher IRR than a 2x multiple over 10 years. This makes IRR particularly useful for comparing investments with different hold periods.</p><h2>Limitations</h2><p>IRR assumes that interim cash flows can be reinvested at the same rate — which isn't always realistic. For this reason, we recommend evaluating investments using multiple metrics: IRR, return multiple, and cash yield together paint the most complete picture.</p>",
      categorySlug: "market-insights",
      tagSlugs: [],
      publishedAt: new Date("2024-06-15"),
    },
    {
      title: "Thoroughbred Racing as an Alternative Investment",
      slug: "thoroughbred-racing-as-an-alternative-investment",
      excerpt: "From the paddock to the portfolio: how thoroughbred horse racing offers uncorrelated returns and unique tax advantages.",
      content: "<p>Thoroughbred horse racing might seem like an unusual investment, but the economics are compelling for the right investor.</p><h2>The Market</h2><p>The global thoroughbred industry generates over $30 billion annually in purses, breeding fees, and sales. Top bloodstock can appreciate significantly — yearlings purchased for $100,000 have sold for millions at maturity.</p><h2>Tax Advantages</h2><p>Thoroughbred ownership offers significant tax benefits including accelerated depreciation, breeding deductions, and favorable long-term capital gains treatment on bloodstock sales.</p><h2>Our Approach</h2><p>The Thoroughbred Fund focuses on acquiring proven racing stock and high-quality broodmares. We partner with top trainers and breeding operations to maximize the value of our portfolio. Our diversified stable approach reduces individual horse risk while capturing the upside of the industry.</p>",
      categorySlug: "investments",
      tagSlugs: [],
      publishedAt: new Date("2024-05-01"),
    },
    {
      title: "2024 Tax Planning for Private Market Investors",
      slug: "2024-tax-planning-for-private-market-investors",
      excerpt: "Key tax considerations for investors in private equity, real estate, and energy partnerships.",
      content: "<p>As we approach year-end, here are the key tax planning considerations for our investors.</p><h2>K-1 Tax Documents</h2><p>All K-1 tax documents for the 2024 tax year will be available in the investor portal by March 15, 2025. We work with a dedicated team of tax professionals to ensure accuracy and timely delivery.</p><h2>Energy Investments</h2><p>Investors in our oil and gas partnerships benefit from intangible drilling cost (IDC) deductions, which can offset up to 80% of your initial investment in the first year. Depletion allowances provide additional ongoing tax benefits.</p><h2>Real Estate</h2><p>Our real estate investments generate depreciation deductions that can offset passive income from distributions. Cost segregation studies on Garden Park and other properties have accelerated these benefits significantly.</p>",
      categorySlug: "market-insights",
      tagSlugs: ["oil-gas", "real-estate"],
      publishedAt: new Date("2024-04-15"),
    },
    {
      title: "Partners + Capital Launches Investor Portal",
      slug: "partners-and-capital-launches-investor-portal",
      excerpt: "Introducing our new digital platform for secure document access, portfolio monitoring, and advisor collaboration.",
      content: "<p>We're thrilled to announce the launch of our new investor portal — a secure, modern platform designed to give you complete visibility into your private market investments.</p><h2>Key Features</h2><p>The portal provides real-time portfolio monitoring, secure document access with bank-grade encryption, and the ability to share selective access with your financial advisors and CPAs.</p><h2>Security</h2><p>We take the security of your financial information seriously. The portal features two-factor authentication, encrypted document storage, and comprehensive audit logging. All data is transmitted over TLS and stored with AES-256 encryption.</p><h2>Getting Started</h2><p>All existing investors have received login credentials via email. If you haven't received yours, please contact us at david@partnersandcapital.com.</p>",
      categorySlug: "company-updates",
      tagSlugs: ["technology"],
      publishedAt: new Date("2024-03-01"),
    },
    {
      title: "The Power of Compounding in Private Markets",
      slug: "the-power-of-compounding-in-private-markets",
      excerpt: "How reinvesting distributions and staying patient creates outsized wealth over time.",
      content: "<p>Albert Einstein reportedly called compound interest the eighth wonder of the world. In private markets, the compounding effect can be even more powerful.</p><h2>Reinvestment</h2><p>When you receive a distribution from a private investment and redeploy it into your next opportunity, you're putting your returns to work. Over a 20-year period, this reinvestment discipline can mean the difference between a 3x and a 10x total return on your initial capital.</p><h2>The Patience Premium</h2><p>Private markets reward patience. Investors who maintain discipline through market cycles and resist the urge to time the market consistently outperform their more reactive peers.</p><h2>Our Recommendation</h2><p>We encourage our investors to think in decades, not quarters. Build a diversified portfolio across asset classes, reinvest distributions when possible, and let time work in your favor.</p>",
      categorySlug: "market-insights",
      tagSlugs: [],
      publishedAt: new Date("2024-02-01"),
    },
    {
      title: "Consumer Products: An Overlooked Private Market Opportunity",
      slug: "consumer-products-an-overlooked-opportunity",
      excerpt: "Why branded consumer products offer compelling private market returns with lower volatility.",
      content: "<p>While most private market discussion focuses on technology, real estate, and energy, we believe branded consumer products represent an underappreciated opportunity.</p><h2>Stable Cash Flows</h2><p>Consumer staples and premium consumer brands generate predictable, recurring revenue streams. Unlike cyclical industries, consumer spending on food, beverages, and personal care products remains resilient through economic downturns.</p><h2>Brand Value</h2><p>Strong brands create durable competitive advantages through customer loyalty and pricing power. In private markets, we can acquire established brands at reasonable valuations and drive growth through operational improvements and distribution expansion.</p><h2>Our Thesis</h2><p>We're actively evaluating opportunities in premium food and beverage, health and wellness, and sustainable consumer goods. These sectors benefit from strong secular tailwinds and offer attractive exit multiples.</p>",
      categorySlug: "investments",
      tagSlugs: ["consumer-products"],
      publishedAt: new Date("2024-01-15"),
    },
  ];

  for (const post of blogPosts) {
    const existing = await prisma.blogPost.findFirst({ where: { slug: post.slug } });
    if (existing) {
      console.log(`Blog post exists: ${post.title}`);
      continue;
    }

    const wordCount = post.content.replace(/<[^>]+>/g, "").split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const created = await prisma.blogPost.create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        authorId: admin.id,
        categoryId: catMap[post.categorySlug] || null,
        readTime,
        isPublished: true,
        isDraft: false,
        publishedAt: post.publishedAt,
        viewCount: Math.floor(Math.random() * 500) + 50,
      },
    });

    for (const tagSlug of post.tagSlugs) {
      if (tagMap[tagSlug]) {
        await prisma.blogPostTag.create({
          data: { postId: created.id, tagId: tagMap[tagSlug] },
        });
      }
    }
  }
  console.log(`Created ${blogPosts.length} blog posts`);

  // ============================================================
  // CMS PAGES: Homepage + Contact
  // ============================================================

  // Homepage
  const existingHomepage = await prisma.page.findFirst({ where: { isHomepage: true } });
  if (!existingHomepage) {
    const homepage = await prisma.page.create({
      data: {
        title: "Home",
        slug: "home",
        status: "PUBLISHED",
        isHomepage: true,
        metaTitle: "Partners + Capital | Public Access to Private Markets",
        metaDescription: "Partners + Capital provides accredited investors with access to institutional-quality private market investments.",
      },
    });

    const homepageBlocks = [
      {
        type: "hero_video",
        props: {
          videoUrl: "",
          posterImageUrl: "",
          heading: "PUBLIC ACCESS TO PRIVATE MARKETS",
          subheading: "Your grandparents had a house. Your parents had a 401(k). You have access.",
          ctaText: "Request an Introduction",
          ctaUrl: "/contact",
          overlayOpacity: 0.6,
        },
        sortOrder: 0,
      },
      {
        type: "text_section",
        props: {
          content: "<h2 style=\"text-align: center\">A New Paradigm in Wealth Building</h2><p style=\"text-align: center\">Partners + Capital provides accredited investors with access to institutional-quality private market investments. We source, underwrite, and manage a diversified portfolio of alternative assets across energy, real estate, private credit, and specialty sectors.</p>",
          maxWidth: "4xl",
          backgroundColor: "transparent",
          textColor: "",
          paddingY: "lg",
        },
        sortOrder: 1,
      },
      {
        type: "stats",
        props: {
          heading: "By the Numbers",
          stats: [
            { value: "80+", label: "Portfolio Companies" },
            { value: "4", label: "Asset Classes" },
            { value: "$50M+", label: "Capital Deployed" },
            { value: "14.2%", label: "Avg. Net Return" },
          ],
          backgroundColor: "#1A2640",
        },
        sortOrder: 2,
      },
      {
        type: "logo_gallery",
        props: {
          heading: "Our Portfolio",
          logos: [
            { imageUrl: "", alt: "Portfolio Company 1" },
            { imageUrl: "", alt: "Portfolio Company 2" },
            { imageUrl: "", alt: "Portfolio Company 3" },
            { imageUrl: "", alt: "Portfolio Company 4" },
          ],
          columns: 4,
          grayscale: true,
        },
        sortOrder: 3,
      },
      {
        type: "quote",
        props: {
          text: "We are bound together by shared values and shared value creation.",
          attribution: "David Morgan",
          role: "Managing Partner",
        },
        sortOrder: 4,
      },
      {
        type: "text_section",
        props: {
          content: "<h2 style=\"text-align: center\">Our Mission</h2><p style=\"text-align: center\">We believe that access to private markets should not be limited to the largest institutions. Our mission is to democratize access to high-quality alternative investments, providing our partners with the same opportunities historically reserved for endowments, pension funds, and ultra-high-net-worth families.</p>",
          maxWidth: "4xl",
          backgroundColor: "#f5f5f3",
          textColor: "",
          paddingY: "lg",
        },
        sortOrder: 5,
      },
      {
        type: "cta_banner",
        props: {
          heading: "Stay Informed",
          text: "Sign up to receive news, updates, and insights from Partners + Capital.",
          ctaText: "Subscribe",
          ctaUrl: "#newsletter",
          backgroundColor: "#B07D3A",
        },
        sortOrder: 6,
      },
      {
        type: "newsletter_signup",
        props: {
          heading: "Get Partner Thoughts Delivered",
          description: "Our latest investment insights and market commentary, delivered to your inbox.",
          backgroundColor: "#1A2640",
        },
        sortOrder: 7,
      },
    ];

    for (const block of homepageBlocks) {
      await prisma.pageBlock.create({
        data: {
          pageId: homepage.id,
          type: block.type,
          props: block.props,
          sortOrder: block.sortOrder,
        },
      });
    }
    console.log("Created homepage with blocks");
  }

  // Contact Page
  const existingContact = await prisma.page.findFirst({ where: { slug: "contact" } });
  if (!existingContact) {
    const contactPage = await prisma.page.create({
      data: {
        title: "Contact",
        slug: "contact",
        status: "PUBLISHED",
        isHomepage: false,
        metaTitle: "Contact | Partners + Capital",
        metaDescription: "Request an introduction to Partners + Capital. Learn about our private market investment opportunities.",
      },
    });

    const contactBlocks = [
      {
        type: "hero_image",
        props: {
          imageUrl: "",
          heading: "Request an Introduction",
          subheading: "We'd love to hear from you.",
          ctaText: "",
          ctaUrl: "",
          overlayOpacity: 0.5,
        },
        sortOrder: 0,
      },
      {
        type: "contact_form",
        props: {
          heading: "Get in Touch",
          description: "Fill out the form below and a member of our team will reach out within one business day.",
          showAddress: true,
          showEmail: true,
        },
        sortOrder: 1,
      },
    ];

    for (const block of contactBlocks) {
      await prisma.pageBlock.create({
        data: {
          pageId: contactPage.id,
          type: block.type,
          props: block.props,
          sortOrder: block.sortOrder,
        },
      });
    }
    console.log("Created contact page with blocks");
  }

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
