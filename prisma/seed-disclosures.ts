import { prisma } from "../src/lib/prisma";

const DEFAULT_DISCLOSURES = [
  {
    title: "Confidential / Informational Only.",
    body: "This statement is being provided solely for the confidential use of the named recipient and for informational purposes only.",
    sortOrder: 0,
  },
  {
    title: "Illiquidity / Realization Risk.",
    body: "Alternative investments are generally illiquid (with the exception of Private Credit), may be subject to transfer restrictions, and actual realized proceeds may differ materially from any estimated value shown.",
    sortOrder: 1,
  },
  {
    title: "Performance Disclosure.",
    body: "Any performance information shown is net/gross only as specifically labeled, reflects the methodology described by Partners + Capital, and should not be viewed as indicative of future results. Past performance is not a guarantee of future results.",
    sortOrder: 2,
  },
  {
    title: "Fees and Expenses.",
    body: "Reported balances and performance reflect the deduction or accrual of management fees, fund expenses, carried interest, servicing costs, or other allocations, as applicable. The specific treatment should be described consistently.",
    sortOrder: 3,
  },
  {
    title: "Tax / Legal Disclaimer.",
    body: "This statement is not tax, legal, or accounting advice. Investors should consult their own advisers regarding the consequences of any investment.",
    sortOrder: 4,
  },
  {
    title: "Report Discrepancies Promptly.",
    body: "Please review this statement promptly and report any questions or discrepancies to Partners + Capital.",
    sortOrder: 5,
  },
];

async function seed() {
  const existing = await prisma.statementDisclosure.count();
  if (existing > 0) {
    console.log(`Skipping: ${existing} disclosures already exist.`);
    return;
  }

  for (const d of DEFAULT_DISCLOSURES) {
    await prisma.statementDisclosure.create({ data: d });
  }
  console.log(`Seeded ${DEFAULT_DISCLOSURES.length} default statement disclosures.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
