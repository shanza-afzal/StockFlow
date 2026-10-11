import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountLedger } from "@/lib/calc";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id: Number(id) } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ledger = await getAccountLedger(Number(id));
  return NextResponse.json({ account, ledger });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, type, phone, address, openingBalance } = body;

  const account = await prisma.account.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      ...(address !== undefined ? { address: address?.trim() || null } : {}),
      ...(openingBalance !== undefined ? { openingBalance: Number(openingBalance) } : {}),
    },
  });
  return NextResponse.json(account);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const used = await prisma.bill.findFirst({ where: { accountId: Number(id) } });
  const usedEntry = await prisma.amountEntry.findFirst({
    where: { OR: [{ fromAccountId: Number(id) }, { toAccountId: Number(id) }] },
  });
  if (used || usedEntry) {
    return NextResponse.json(
      { error: "Cannot delete an account that has bills or entries" },
      { status: 409 }
    );
  }
  await prisma.account.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
