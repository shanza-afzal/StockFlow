import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextJvNo } from "@/lib/calc";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  const entries = await prisma.amountEntry.findMany({
    where: accountId
      ? { OR: [{ fromAccountId: Number(accountId) }, { toAccountId: Number(accountId) }] }
      : undefined,
    include: { fromAccount: true, toAccount: true },
    orderBy: [{ date: "desc" }, { jvNo: "desc" }, { id: "asc" }],
  });
  return NextResponse.json(entries);
}

type IncomingRow = {
  fromAccountId: number | null;
  toAccountId: number | null;
  amount: number;
  description?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, rows } = body as { date: string; rows: IncomingRow[] };

  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "At least one row is required" }, { status: 400 });
  }

  for (const row of rows) {
    if (row.fromAccountId === row.toAccountId) {
      return NextResponse.json(
        { error: "Paying and receiving account must be different" },
        { status: 400 }
      );
    }
    if (!(Number(row.amount) > 0)) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
  }

  const jvNo = await getNextJvNo();

  const created = await prisma.$transaction(
    rows.map((row) =>
      prisma.amountEntry.create({
        data: {
          jvNo,
          date: new Date(date),
          fromAccountId: row.fromAccountId || null,
          toAccountId: row.toAccountId || null,
          amount: Number(row.amount),
          description: row.description?.trim() || null,
        },
        include: { fromAccount: true, toAccount: true },
      })
    )
  );
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jvNo = searchParams.get("jvNo");
  if (!jvNo) {
    return NextResponse.json({ error: "A JV number is required" }, { status: 400 });
  }
  await prisma.amountEntry.deleteMany({ where: { jvNo: Number(jvNo) } });
  return NextResponse.json({ ok: true });
}
