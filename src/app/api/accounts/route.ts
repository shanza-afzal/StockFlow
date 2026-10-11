import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances } from "@/lib/calc";

export async function GET() {
  const accounts = await getAccountsWithBalances();
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, phone, address, openingBalance } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Account name is required" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      name: name.trim(),
      type: type || "BOTH",
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      openingBalance: Number(openingBalance) || 0,
    },
  });
  return NextResponse.json(account, { status: 201 });
}
