"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, StatCard, TableScroll, tableClass } from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson } from "@/lib/fetchJson";

type LedgerRow = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

type Account = { id: number; name: string; type: string; phone: string | null; address: string | null };

export default function AccountHistory({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ account: Account; ledger: LedgerRow[] }>(`/api/accounts/${accountId}`).then(
      (data) => {
        setAccount(data?.account || null);
        setRows(data?.ledger || []);
        setLoading(false);
      }
    );
  }, [accountId]);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const balance = rows.length ? rows[rows.length - 1].balance : 0;

  return (
    <div>
      <div className="mb-2">
        <Link href="/ledger" className="text-sm font-semibold text-blue-600 hover:underline">
          ← Back to Ledger
        </Link>
      </div>

      <PageHeader title={account ? account.name : "Account History"} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Credit (جمع)" value={formatMoney(totalCredit)} />
        <StatCard label="Debit (باقی)" value={formatMoney(totalDebit)} />
        <StatCard
          label="Net Balance"
          value={formatMoney(Math.abs(balance))}
          sub={balance === 0 ? "Settled" : balance > 0 ? "credit" : "debit"}
          tone={balance === 0 ? "default" : balance > 0 ? "green" : "red"}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState>Loading...</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>No transactions for this account yet.</EmptyState>
        ) : (
          <TableScroll>
            <table className={tableClass}>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Date</th>
                <th className="text-left font-semibold px-4 py-3">Details</th>
                <th className="text-right font-semibold px-4 py-3">Debit (باقی)</th>
                <th className="text-right font-semibold px-4 py-3">Credit (جمع)</th>
                <th className="text-right font-semibold px-4 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-900">{r.description}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {r.debit > 0 ? formatMoney(r.debit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {r.credit > 0 ? formatMoney(r.credit) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatMoney(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </div>
  );
}
