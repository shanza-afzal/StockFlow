import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ReportBill } from "@/lib/reportTypes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { type: "SALE" };
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

  let totalSales = 0;
  let totalCost = 0;
  let cashSales = 0;
  let creditSales = 0;
  const byItem = new Map<string, { name: string; unit: string; qty: number; sales: number; cost: number }>();
  const byDate = new Map<string, { date: string; sales: number; profit: number }>();
  const cashBills: ReportBill[] = [];
  const creditBills: ReportBill[] = [];

  for (const bill of bills) {
    totalSales += bill.total;

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
      cashSales += bill.total;
      cashBills.push(row);
    } else {
      creditSales += bill.total;
      creditBills.push(row);
    }

    let billCost = 0;

    for (const bi of bill.items) {
      const cost = bi.qty * bi.costPrice;
      billCost += cost;
      totalCost += cost;

      const key = bi.item.name;
      const existing = byItem.get(key) || { name: bi.item.name, unit: bi.item.unit, qty: 0, sales: 0, cost: 0 };
      existing.qty += bi.qty;
      existing.sales += bi.subtotal;
      existing.cost += cost;
      byItem.set(key, existing);
    }

    const dEntry = byDate.get(dateKey) || { date: dateKey, sales: 0, profit: 0 };
    dEntry.sales += bill.total;
    dEntry.profit += bill.total - billCost;
    byDate.set(dateKey, dEntry);
  }

  return NextResponse.json({
    totalSales,
    totalCost,
    totalProfit: totalSales - totalCost,
    cashSales,
    creditSales,
    billCount: bills.length,
    cashBills,
    creditBills,
    byItem: Array.from(byItem.values()).sort((a, b) => b.sales - a.sales),
    byDate: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  });
}
