import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/calc";

// What "delete all journal vouchers" would remove, so the confirmation dialog can show real numbers.
export async function GET() {
  const [entries, vouchers, sum] = await Promise.all([
    prisma.amountEntry.count(),
    prisma.amountEntry.groupBy({ by: ["jvNo"] }),
    prisma.amountEntry.aggregate({ _sum: { amount: true } }),
  ]);
  return NextResponse.json({
    vouchers: vouchers.length,
    entries,
    total: sum._sum.amount ?? 0,
  });
}

// Deletes every journal voucher and restarts JV numbering. Bills, accounts and items are not
// touched. The caller must send { confirm: "DELETE" } so a stray request can't empty the list.
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  const settings = await getOrCreateSettings();

  const [entries] = await prisma.$transaction([
    prisma.amountEntry.deleteMany(),
    prisma.settings.update({ where: { id: settings.id }, data: { nextJvNo: 1 } }),
  ]);

  return NextResponse.json({ ok: true, deleted: entries.count });
}
