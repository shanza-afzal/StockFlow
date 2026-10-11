import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCashBook, getNextJvNo } from "@/lib/calc";

export async function GET() {
  const rows = await getCashBook();
  const totalIn = rows.reduce((s, r) => s + r.in, 0);
  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  return NextResponse.json({ rows, totalIn, totalOut, inHand: totalIn - totalOut });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { direction, accountId, amount, date, details } = body as {
    direction: "IN" | "OUT";
    accountId?: number | null;
    amount: number;
    date: string;
    details?: string;
  };

  if (direction !== "IN" && direction !== "OUT") {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!accountId) {
    return NextResponse.json(
      { error: direction === "IN" ? "Select who the cash came from" : "Select who the cash was paid to" },
      { status: 400 }
    );
  }
  if (!(Number(amount) > 0)) {
    return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
  }

  const jvNo = await getNextJvNo();

  const entry = await prisma.amountEntry.create({
    data: {
      jvNo,
      date: new Date(date),
      // Cash in: money moves from the account into cash. Cash out: cash goes to the account.
      fromAccountId: direction === "IN" ? Number(accountId) : null,
      toAccountId: direction === "OUT" ? Number(accountId) : null,
      amount: Number(amount),
      description: details?.trim() || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
