import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ReportBill } from "@/lib/reportTypes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { type: "PURCHASE" };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }

  const bills = await prisma.bill.findMany({
    where,
    include: { account: true, items: { include: { item: true } } },
    orderBy: [{ date: "asc" }, { billNo: "asc" }],
  });

  let totalPurchases = 0;
  let cashPurchases = 0;
  let creditPurchases = 0;
  const byItem = new Map<string, { name: string; unit: string; qty: number; amount: number }>();
  const byDate = new Map<string, { date: string; amount: number }>();
  const cashBills: ReportBill[] = [];
  const creditBills: ReportBill[] = [];

  for (const bill of bills) {
    totalPurchases += bill.total;

    const dateKey = bill.date.toISOString().slice(0, 10);
    const row: ReportBill = {
      id: bill.id,
      billNo: bill.billNo,
      date: dateKey,
      account: bill.account?.name ?? null,
      total: bill.total,
      paidAmount: bill.paidAmount,
    };
    if (bill.mode === "CASH") {
      cashPurchases += bill.total;
      cashBills.push(row);
    } else {
      creditPurchases += bill.total;
      creditBills.push(row);
    }

    for (const bi of bill.items) {
      const key = bi.item.name;
      const existing = byItem.get(key) || { name: bi.item.name, unit: bi.item.unit, qty: 0, amount: 0 };
      existing.qty += bi.qty;
      existing.amount += bi.subtotal;
      byItem.set(key, existing);
    }

    const dEntry = byDate.get(dateKey) || { date: dateKey, amount: 0 };
    dEntry.amount += bill.total;
    byDate.set(dateKey, dEntry);
  }

  return NextResponse.json({
    totalPurchases,
    cashPurchases,
    creditPurchases,
    billCount: bills.length,
    cashBills,
    creditBills,
    byItem: Array.from(byItem.values()).sort((a, b) => b.amount - a.amount),
    byDate: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  });
}
