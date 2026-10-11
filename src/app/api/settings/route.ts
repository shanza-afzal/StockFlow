import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/calc";

export async function GET() {
  const settings = await getOrCreateSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { companyName, currency, address, phone } = body;
  const settings = await getOrCreateSettings();

  const updated = await prisma.settings.update({
    where: { id: settings.id },
    data: {
      ...(companyName !== undefined ? { companyName: String(companyName).trim() || "Safi ERP" } : {}),
      ...(currency !== undefined ? { currency: String(currency).trim() || "Rs." } : {}),
      ...(address !== undefined ? { address: address?.trim() || null } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
    },
  });
  return NextResponse.json(updated);
}
