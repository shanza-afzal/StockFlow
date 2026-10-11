import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, companyName: "Safi ERP", currency: "Rs." },
  });

  const items = [
    { name: "Sugar (50kg bag)", unit: "bag", purchasePrice: 6200, salePrice: 6500, openingStock: 20 },
    { name: "Flour (20kg bag)", unit: "bag", purchasePrice: 2400, salePrice: 2600, openingStock: 15 },
    { name: "Cooking Oil (5L can)", unit: "can", purchasePrice: 1800, salePrice: 1950, openingStock: 30 },
    { name: "Rice (10kg bag)", unit: "bag", purchasePrice: 1500, salePrice: 1650, openingStock: 25 },
    { name: "Tea (1kg pack)", unit: "pack", purchasePrice: 950, salePrice: 1050, openingStock: 40 },
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }

  const accounts = [
    { name: "Al-Karam Traders", type: "SUPPLIER" as const, phone: "0300-1234567", openingBalance: 0 },
    { name: "Hamza General Store", type: "CUSTOMER" as const, phone: "0333-7654321", openingBalance: 0 },
    { name: "Bilal Wholesale", type: "BOTH" as const, phone: "0321-9988776", openingBalance: 0 },
  ];

  for (const acc of accounts) {
    const existing = await prisma.account.findFirst({ where: { name: acc.name } });
    if (!existing) {
      await prisma.account.create({ data: acc });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
