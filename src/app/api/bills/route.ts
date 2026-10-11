import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextPurchaseBillNo, getNextSaleBillNo } from "@/lib/calc";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const accountId = searchParams.get("accountId");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (mode) where.mode = mode;
  if (accountId) where.accountId = Number(accountId);
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }

  const bills = await prisma.bill.findMany({
    where,
    include: { account: true, items: { include: { item: true } } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json(bills);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type !== "SALE" && type !== "PURCHASE") {
    return NextResponse.json({ error: "A valid bill type is required" }, { status: 400 });
  }
  await prisma.bill.deleteMany({ where: { type } });
  return NextResponse.json({ ok: true });
}

type IncomingItem = { itemId: number; qty: number; price: number };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, date, mode, accountId, items, paidAmount, notes } = body as {
    type: "SALE" | "PURCHASE";
    date: string;
    mode: "CASH" | "CREDIT";
    accountId?: number | null;
    items: IncomingItem[];
    paidAmount?: number;
    notes?: string;
  };

  if (type !== "SALE" && type !== "PURCHASE") {
    return NextResponse.json({ error: "Invalid bill type" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
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

  const dbItems = await prisma.item.findMany({
    where: { id: { in: items.map((i) => i.itemId) } },
    include: { billItems: { include: { bill: { select: { type: true } } } } },
  });
  const itemMap = new Map(dbItems.map((i) => [i.id, i]));

  if (type === "SALE") {
    const requestedQtyByItem = new Map<number, number>();
    for (const it of items) {
      requestedQtyByItem.set(it.itemId, (requestedQtyByItem.get(it.itemId) || 0) + it.qty);
    }

    const shortages: string[] = [];
    for (const [itemId, requestedQty] of requestedQtyByItem) {
      const dbItem = itemMap.get(itemId);
      if (!dbItem) {
        return NextResponse.json({ error: "One of the selected items no longer exists" }, { status: 400 });
      }
      let stock = dbItem.openingStock;
      for (const bi of dbItem.billItems) {
        if (bi.bill.type === "PURCHASE") stock += bi.qty;
        else stock -= bi.qty;
      }
      if (requestedQty > stock) {
        shortages.push(`${dbItem.name}: only ${stock} ${dbItem.unit} in stock, ${requestedQty} requested`);
      }
    }

    if (shortages.length > 0) {
      return NextResponse.json(
        { error: `Not enough stock to complete this sale — ${shortages.join("; ")}` },
        { status: 409 },
      );
    }
  }

  const purchaseBillNo = type === "PURCHASE" ? await getNextPurchaseBillNo() : 0;

  const bill = await prisma.$transaction(async (tx) => {
    const billNo = type === "SALE" ? await getNextSaleBillNo(tx, date) : purchaseBillNo;
    const created = await tx.bill.create({
      data: {
        billNo,
        type,
        date: new Date(date),
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
            costPrice: type === "SALE" ? itemMap.get(it.itemId)?.purchasePrice ?? 0 : it.price,
            subtotal: it.qty * it.price,
          })),
        },
      },
      include: { items: { include: { item: true } }, account: true },
    });

    if (type === "PURCHASE") {
      for (const it of items) {
        await tx.item.update({
          where: { id: it.itemId },
          data: { purchasePrice: it.price },
        });
      }
    }

    return created;
  });

  return NextResponse.json(bill, { status: 201 });
}
