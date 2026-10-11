import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStockList } from "@/lib/calc";

export async function GET() {
  const stock = await getStockList();
  return NextResponse.json(stock);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, unit, purchasePrice, salePrice, openingStock } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  try {
    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        unit: unit?.trim() || "pcs",
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        openingStock: Number(openingStock) || 0,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An item with this name already exists" }, { status: 409 });
  }
}
