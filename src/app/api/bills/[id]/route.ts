import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSaleBillNo } from "@/lib/calc";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id: Number(id) },
    include: { items: { include: { item: true } }, account: true },
  });
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bill);
}

type IncomingItem = { itemId: number; qty: number; price: number };

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { date, mode, accountId, items, paidAmount, notes } = body as {
    date: string;
    mode: "CASH" | "CREDIT";
    accountId?: number | null;
    items: IncomingItem[];
    paidAmount?: number;
    notes?: string;
  };

  const existing = await prisma.bill.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (mode !== "CASH" && mode !== "CREDIT") {
    return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }
  for (const it of items) {
    if (!it.itemId || !(it.qty > 0) || it.price < 0) {
      return NextResponse.json({ error: "Each item needs a valid item, qty and price" }, { status: 400 });
    }
  }
  if (mode === "CREDIT" && !accountId) {
    return NextResponse.json({ error: "An account is required for credit bills" }, { status: 400 });
  }

  const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const paid = mode === "CASH" ? total : Math.min(Number(paidAmount) || 0, total);

  const dbItems = await prisma.item.findMany({ where: { id: { in: items.map((i) => i.itemId) } } });
  const itemMap = new Map(dbItems.map((i) => [i.id, i]));

  const bill = await prisma.$transaction(async (tx) => {
    // Sale bills are numbered per day, so a bill moved to another day takes the next number there.
    const newDate = new Date(date);
    const movedToAnotherDay =
      existing.type === "SALE" && newDate.toISOString().slice(0, 10) !== existing.date.toISOString().slice(0, 10);
    const billNo = movedToAnotherDay ? await getNextSaleBillNo(tx, newDate, existing.id) : existing.billNo;

    await tx.billItem.deleteMany({ where: { billId: Number(id) } });
    const updated = await tx.bill.update({
      where: { id: Number(id) },
      data: {
        billNo,
        date: newDate,
        mode,
        accountId: accountId || null,
        total,
        paidAmount: paid,
        notes: notes?.trim() || null,
        items: {
          create: items.map((it) => ({
            itemId: it.itemId,
            qty: it.qty,
            price: it.price,
            costPrice: existing.type === "SALE" ? itemMap.get(it.itemId)?.purchasePrice ?? 0 : it.price,
            subtotal: it.qty * it.price,
          })),
        },
      },
      include: { items: { include: { item: true } }, account: true },
    });

    if (existing.type === "PURCHASE") {
      for (const it of items) {
        await tx.item.update({ where: { id: it.itemId }, data: { purchasePrice: it.price } });
      }
    }

    return updated;
  });

  return NextResponse.json(bill);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.bill.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
