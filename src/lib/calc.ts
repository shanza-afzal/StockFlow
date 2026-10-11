import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getNextPurchaseBillNo() {
  const settings = await getOrCreateSettings();
  const current = settings.nextPurchNo;
  await prisma.settings.update({
    where: { id: settings.id },
    data: { nextPurchNo: current + 1 },
  });
  return current;
}

// Sale bills are numbered per bill date: the first bill of every day is #1. Must run inside the
// transaction that creates (or re-dates) the bill, so the advisory lock is held until it commits
// and two bills saved at the same moment can't pick the same number.
export async function getNextSaleBillNo(
  tx: Prisma.TransactionClient,
  date: string | Date,
  excludeBillId?: number
) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const lockKey = Math.floor(dayStart.getTime() / (24 * 60 * 60 * 1000));
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(CAST(${lockKey} AS bigint))`;

  const last = await tx.bill.aggregate({
    where: {
      type: "SALE",
      date: { gte: dayStart, lt: dayEnd },
      ...(excludeBillId !== undefined ? { id: { not: excludeBillId } } : {}),
    },
    _max: { billNo: true },
  });
  return last._max.billNo === null ? 1 : last._max.billNo + 1;
}

export async function getNextJvNo() {
  const settings = await getOrCreateSettings();
  const current = settings.nextJvNo;
  await prisma.settings.update({
    where: { id: settings.id },
    data: { nextJvNo: current + 1 },
  });
  return current;
}

export async function getOrCreateSettings() {
  const existing = await prisma.settings.findFirst();
  if (existing) return existing;
  return prisma.settings.create({ data: {} });
}

export type StockRow = {
  id: number;
  name: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  value: number;
};

export async function getStockList(): Promise<StockRow[]> {
  const items = await prisma.item.findMany({
    include: {
      billItems: { include: { bill: { select: { type: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return items.map((item) => {
    let stock = item.openingStock;
    for (const bi of item.billItems) {
      if (bi.bill.type === "PURCHASE") stock += bi.qty;
      else stock -= bi.qty;
    }
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      purchasePrice: item.purchasePrice,
      salePrice: item.salePrice,
      stock,
      value: stock * item.purchasePrice,
    };
  });
}

export async function getItemStock(itemId: number): Promise<number> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { billItems: { include: { bill: { select: { type: true } } } } },
  });
  if (!item) return 0;
  let stock = item.openingStock;
  for (const bi of item.billItems) {
    if (bi.bill.type === "PURCHASE") stock += bi.qty;
    else stock -= bi.qty;
  }
  return stock;
}

export type AccountBalance = {
  id: number;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  openingBalance: number;
  debit: number;
  credit: number;
  balance: number; // positive = they owe us (receivable), negative = we owe them (payable)
};

export async function getAccountsWithBalances(): Promise<AccountBalance[]> {
  const accounts = await prisma.account.findMany({
    include: {
      bills: true,
      entriesFrom: true,
      entriesTo: true,
    },
    orderBy: { name: "asc" },
  });

  return accounts.map((acc) => {
    let debit = acc.openingBalance > 0 ? acc.openingBalance : 0;
    let credit = acc.openingBalance < 0 ? -acc.openingBalance : 0;
    for (const bill of acc.bills) {
      if (bill.type === "SALE") debit += bill.total;
      else credit += bill.total;
    }
    for (const entry of acc.entriesFrom) credit += entry.amount;
    for (const entry of acc.entriesTo) debit += entry.amount;
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      phone: acc.phone,
      address: acc.address,
      openingBalance: acc.openingBalance,
      debit,
      credit,
      balance: debit - credit,
    };
  });
}

export type LedgerRow = {
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refType: "BILL" | "AMOUNT_ENTRY" | "OPENING";
  refId: number;
};

export async function getAccountLedger(accountId: number): Promise<LedgerRow[]> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      bills: { orderBy: { date: "asc" } },
      entriesFrom: { include: { toAccount: true }, orderBy: { date: "asc" } },
      entriesTo: { include: { fromAccount: true }, orderBy: { date: "asc" } },
    },
  });
  if (!account) return [];

  type Raw = { date: Date; description: string; debit: number; credit: number; refType: LedgerRow["refType"]; refId: number };
  const raw: Raw[] = [];

  for (const bill of account.bills) {
    if (bill.type === "SALE") {
      raw.push({
        date: bill.date,
        description: `Sale Bill #${bill.billNo}`,
        debit: bill.total,
        credit: 0,
        refType: "BILL",
        refId: bill.id,
      });
    } else {
      raw.push({
        date: bill.date,
        description: `Purchase Bill #${bill.billNo}`,
        debit: 0,
        credit: bill.total,
        refType: "BILL",
        refId: bill.id,
      });
    }
  }

  for (const entry of account.entriesFrom) {
    raw.push({
      date: entry.date,
      description: entry.description || `Paid to ${entry.toAccount?.name || "Cash"}`,
      debit: 0,
      credit: entry.amount,
      refType: "AMOUNT_ENTRY",
      refId: entry.id,
    });
  }
  for (const entry of account.entriesTo) {
    raw.push({
      date: entry.date,
      description: entry.description || `Received from ${entry.fromAccount?.name || "Cash"}`,
      debit: entry.amount,
      credit: 0,
      refType: "AMOUNT_ENTRY",
      refId: entry.id,
    });
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  const rows: LedgerRow[] = [];
  let balance = account.openingBalance;
  if (account.openingBalance !== 0) {
    rows.push({
      date: account.createdAt,
      description: "Opening Balance",
      debit: account.openingBalance > 0 ? account.openingBalance : 0,
      credit: account.openingBalance < 0 ? -account.openingBalance : 0,
      balance,
      refType: "OPENING",
      refId: 0,
    });
  }

  for (const r of raw) {
    balance += r.debit - r.credit;
    rows.push({ ...r, balance });
  }

  return rows;
}

export type CashRow = {
  date: Date;
  description: string;
  in: number;
  out: number;
  balance: number;
  refType: "BILL" | "AMOUNT_ENTRY";
  refId: number;
};

export async function getCashBook(): Promise<CashRow[]> {
  const [bills, entries] = await Promise.all([
    prisma.bill.findMany({ where: { mode: "CASH" }, orderBy: { date: "asc" } }),
    prisma.amountEntry.findMany({
      where: { OR: [{ fromAccountId: null }, { toAccountId: null }] },
      include: { fromAccount: true, toAccount: true },
      orderBy: { date: "asc" },
    }),
  ]);

  type Raw = { date: Date; description: string; in: number; out: number; refType: CashRow["refType"]; refId: number };
  const raw: Raw[] = [];

  for (const bill of bills) {
    if (bill.type === "SALE") {
      raw.push({ date: bill.date, description: `Cash Sale #${bill.billNo}`, in: bill.total, out: 0, refType: "BILL", refId: bill.id });
    } else {
      raw.push({ date: bill.date, description: `Cash Purchase #${bill.billNo}`, in: 0, out: bill.total, refType: "BILL", refId: bill.id });
    }
  }

  for (const entry of entries) {
    if (entry.toAccountId === null) {
      raw.push({ date: entry.date, description: entry.description || `Received from ${entry.fromAccount?.name || "Cash"}`, in: entry.amount, out: 0, refType: "AMOUNT_ENTRY", refId: entry.id });
    } else {
      raw.push({ date: entry.date, description: entry.description || `Paid to ${entry.toAccount?.name || "Cash"}`, in: 0, out: entry.amount, refType: "AMOUNT_ENTRY", refId: entry.id });
    }
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  const rows: CashRow[] = [];
  let balance = 0;
  for (const r of raw) {
    balance += r.in - r.out;
    rows.push({ ...r, balance });
  }
  return rows;
}

export function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
