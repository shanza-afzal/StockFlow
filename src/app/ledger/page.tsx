"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  EmptyState,
  PageHeader,
  TableScroll,
  Tabs,
  inputClass,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson } from "@/lib/fetchJson";

type AccountRow = {
  id: number;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  debit: number;
  credit: number;
  balance: number;
};

const TABS = [
  { value: "TRADING", label: "Trading Accounts" },
  { value: "CAPITAL", label: "Capital Accounts" },
  { value: "EXPENSE", label: "Expense Accounts" },
] as const;

type Category = (typeof TABS)[number]["value"];

function categoryOf(type: string): Category {
  if (type === "CAPITAL") return "CAPITAL";
  if (type === "EXPENSE") return "EXPENSE";
  return "TRADING";
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function LedgerPage() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("TRADING");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchJson<AccountRow[]>("/api/accounts").then((data) => {
      if (data) setRows(data);
      setLoading(false);
    });
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryOf(r.type) !== category) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.address || "").toLowerCase().includes(q)
      );
    });
  }, [rows, category, search]);

  return (
    <div>
      <PageHeader title="Ledger" />

      <div className="mb-4">
        <Tabs tabs={TABS.map((t) => ({ ...t }))} value={category} onChange={setCategory} />
      </div>

      <div className="mb-4 max-w-md">
        <input
          className={inputClass}
          value={search}
          placeholder="Search by name, phone, or address"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState>Loading...</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>No accounts in this section yet.</EmptyState>
        ) : (
          <TableScroll>
            <table className={tableClass}>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Name</th>
                <th className="text-left font-semibold px-4 py-3">Type</th>
                <th className="text-right font-semibold px-4 py-3">Credit (جمع)</th>
                <th className="text-right font-semibold px-4 py-3">Debit (باقی)</th>
                <th className="text-right font-semibold px-4 py-3">Net Balance</th>
                <th className="w-32"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-4 text-gray-600">{titleCase(r.type)}</td>
                  <td className="px-4 py-4 text-right text-gray-900">{formatMoney(r.credit)}</td>
                  <td className="px-4 py-4 text-right text-gray-900">{formatMoney(r.debit)}</td>
                  <td className="px-4 py-4 text-right">
                    {r.balance === 0 ? (
                      <span className="text-gray-400">Settled</span>
                    ) : (
                      <span
                        className={`font-bold ${r.balance > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {r.balance > 0 ? "+" : "-"}
                        {formatMoney(Math.abs(r.balance))}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          ({r.balance > 0 ? "credit" : "debit"})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/ledger/${r.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      View History
                    </Link>
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
