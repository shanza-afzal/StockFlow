import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getItemStock } from "@/lib/calc";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { newStock } = body as { newStock: number };

  if (typeof newStock !== "number" || Number.isNaN(newStock)) {
    return NextResponse.json({ error: "A valid stock quantity is required" }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id: Number(id) } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const currentStock = await getItemStock(Number(id));
  const delta = newStock - currentStock;
  const updated = await prisma.item.update({
    where: { id: Number(id) },
    data: { openingStock: item.openingStock + delta },
  });
  return NextResponse.json(updated);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, unit, purchasePrice, salePrice, openingStock } = body;

  try {
    const item = await prisma.item.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(unit !== undefined ? { unit: String(unit).trim() || "pcs" } : {}),
        ...(purchasePrice !== undefined ? { purchasePrice: Number(purchasePrice) } : {}),
        ...(salePrice !== undefined ? { salePrice: Number(salePrice) } : {}),
        ...(openingStock !== undefined ? { openingStock: Number(openingStock) } : {}),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Could not update item" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const used = await prisma.billItem.findFirst({ where: { itemId: Number(id) } });
  if (used) {
    return NextResponse.json(
      { error: "Cannot delete an item that is used in bills" },
      { status: 409 }
    );
  }
  await prisma.item.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
