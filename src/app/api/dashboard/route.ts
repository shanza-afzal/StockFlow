import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances, getCashBook, getStockList } from "@/lib/calc";
import { stockLevel } from "@/lib/stockLevel";

function startOfToday() {
  // Bill dates come from <input type="date"> and are parsed as UTC midnight
  // (new Date("YYYY-MM-DD")), so "today" must use the same UTC boundary —
  // otherwise bills dated today are excluded until local time catches up to UTC.
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const today = startOfToday();

  const [todaySaleBills, todayPurchaseBills, accounts, cashBook, stock, recentBills] = await Promise.all([
    prisma.bill.findMany({ where: { type: "SALE", date: { gte: today } } }),
    prisma.bill.findMany({ where: { type: "PURCHASE", date: { gte: today } } }),
    getAccountsWithBalances(),
    getCashBook(),
    getStockList(),
    prisma.bill.findMany({
      include: { account: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 6,
    }),
  ]);

  const todaySales = todaySaleBills.reduce((s, b) => s + b.total, 0);
  const todayPurchases = todayPurchaseBills.reduce((s, b) => s + b.total, 0);
  const receivable = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const payable = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + -a.balance, 0);
  const cashBalance = cashBook.length ? cashBook[cashBook.length - 1].balance : 0;
  const lowStockItems = stock
    .filter((s) => stockLevel(s.stock) !== "OK")
    .map(({ id, name, unit, stock }) => ({ id, name, unit, stock }));
  const stockValue = stock.reduce((s, r) => s + r.value, 0);

  return NextResponse.json({
    todaySales,
    todayPurchases,
    cashBalance,
    receivable,
    payable,
    lowStockItems,
    stockValue,
    recentBills,
  });
}
