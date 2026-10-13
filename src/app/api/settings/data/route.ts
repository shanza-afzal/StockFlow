import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/calc";

// What a "delete all data" would remove, so the confirmation dialog can show real numbers.
export async function GET() {
  const [bills, entries, accounts, items] = await Promise.all([
    prisma.bill.count(),
    prisma.amountEntry.count(),
    prisma.account.count(),
    prisma.item.count(),
  ]);
  return NextResponse.json({ bills, entries, accounts, items });
}

// Wipes every bill, journal entry, account and item, and restarts the bill / JV numbering.
// Company name, currency, address and phone are kept. The caller must send { confirm: "DELETE" }
// so a stray request can't empty the database.
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  const settings = await getOrCreateSettings();

  // Children first: bill items point at bills and items, bills and entries point at accounts.
  const [billItems, bills, entries, accounts, items] = await prisma.$transaction([
    prisma.billItem.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.amountEntry.deleteMany(),
    prisma.account.deleteMany(),
    prisma.item.deleteMany(),
    prisma.settings.update({
      where: { id: settings.id },
      data: { nextSaleNo: 1, nextPurchNo: 1, nextJvNo: 1 },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: {
      bills: bills.count,
      billItems: billItems.count,
      entries: entries.count,
      accounts: accounts.count,
      items: items.count,
    },
  });
}
