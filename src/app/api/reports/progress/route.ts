import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances } from "@/lib/calc";

const DAY_MS = 24 * 60 * 60 * 1000;

// Bounds are epoch ms, both inclusive; a missing bound is open-ended.
type Range = { gte?: number; lte?: number };

// Dates come from <input type="date"> and are stored as UTC midnight of the picked day.
function parseDay(value: string | null): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? undefined : t;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = parseDay(searchParams.get("from"));
  const to = parseDay(searchParams.get("to"));

  // "Today" is the caller's local calendar day (sent as YYYY-MM-DD), because that is the day
  // they pick on every bill and entry. Fall back to the server's UTC day if it is missing.
  const todayStart = parseDay(searchParams.get("today")) ?? new Date().setUTCHours(0, 0, 0, 0);
  const todayLabel = new Date(todayStart).toISOString().slice(0, 10);

  const [saleBills, purchaseBills, amountEntries, accounts] = await Promise.all([
    prisma.bill.findMany({
      where: { type: "SALE" },
      select: { date: true, mode: true, total: true, items: { select: { qty: true, costPrice: true } } },
    }),
    prisma.bill.findMany({
      where: { type: "PURCHASE" },
      select: { date: true, mode: true, total: true },
    }),
    prisma.amountEntry.findMany({
      select: {
        date: true,
        amount: true,
        fromAccountId: true,
        toAccountId: true,
        fromAccount: { select: { type: true } },
        toAccount: { select: { type: true } },
      },
    }),
    getAccountsWithBalances(),
  ]);

  // Every figure on the page (today, all-time, custom period) is produced here, from the same
  // rows, so the cards can never disagree with each other.
  function summarize(range: Range) {
    const inRange = (d: Date) => {
      const t = d.getTime();
      return (range.gte === undefined || t >= range.gte) && (range.lte === undefined || t <= range.lte);
    };

    const sales = saleBills.filter((b) => inRange(b.date));
    const purchases = purchaseBills.filter((b) => inRange(b.date));
    const entries = amountEntries.filter((e) => inRange(e.date));

    const totalSales = sales.reduce((s, b) => s + b.total, 0);
    const totalCost = sales.reduce(
      (s, b) => s + b.items.reduce((s2, it) => s2 + it.qty * it.costPrice, 0),
      0
    );
    const totalPurchases = purchases.reduce((s, b) => s + b.total, 0);

    const cashIn =
      sales.filter((b) => b.mode === "CASH").reduce((s, b) => s + b.total, 0) +
      entries
        .filter((e) => e.toAccountId === null && e.fromAccountId !== null)
        .reduce((s, e) => s + e.amount, 0);
    const cashOut =
      purchases.filter((b) => b.mode === "CASH").reduce((s, b) => s + b.total, 0) +
      entries
        .filter((e) => e.fromAccountId === null && e.toAccountId !== null)
        .reduce((s, e) => s + e.amount, 0);

    // An expense is money paid to an account of type EXPENSE. Money coming back out of one
    // (a refund or correction) reduces the total, and a move between two expense accounts nets to zero.
    const expenseEntries = entries.filter(
      (e) => e.toAccount?.type === "EXPENSE" || e.fromAccount?.type === "EXPENSE"
    );
    const expenses = expenseEntries.reduce(
      (s, e) =>
        s + (e.toAccount?.type === "EXPENSE" ? e.amount : 0) - (e.fromAccount?.type === "EXPENSE" ? e.amount : 0),
      0
    );

    const salesProfit = totalSales - totalCost;

    return {
      sales: round2(totalSales),
      purchases: round2(totalPurchases),
      salesProfit: round2(salesProfit),
      expenses: round2(expenses),
      netProfit: round2(salesProfit - expenses),
      cashIn: round2(cashIn),
      cashOut: round2(cashOut),
      netCashFlow: round2(cashIn - cashOut),
      saleBillCount: sales.length,
      purchaseBillCount: purchases.length,
      expenseCount: expenseEntries.length,
    };
  }

  const receivable = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const payable = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + -a.balance, 0);

  return NextResponse.json({
    date: todayLabel,
    today: summarize({ gte: todayStart, lte: todayStart + DAY_MS - 1 }),
    allTime: summarize({}),
    period: summarize({
      ...(from !== undefined ? { gte: from } : {}),
      ...(to !== undefined ? { lte: to + DAY_MS - 1 } : {}),
    }),
    receivable: round2(receivable),
    payable: round2(payable),
  });
}
