import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Same rule as deleting one account: an account that any bill or journal entry points at stays,
// otherwise its ledger and the reports built on it would break.
const UNUSED = { bills: { none: {} }, entriesFrom: { none: {} }, entriesTo: { none: {} } };

// What "delete all accounts" would do, so the confirmation dialog can show real numbers.
export async function GET() {
  const [total, deletable] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: UNUSED }),
  ]);
  return NextResponse.json({ total, deletable, kept: total - deletable });
}

// Deletes every account that has no bills or journal entries. The caller must send
// { confirm: "DELETE" } so a stray request can't empty the list.
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  const { count } = await prisma.account.deleteMany({ where: UNUSED });
  const kept = await prisma.account.count();
  return NextResponse.json({ ok: true, deleted: count, kept });
}
