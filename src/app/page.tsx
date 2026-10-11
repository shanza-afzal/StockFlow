"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryButton,
  StatCard,
  TableScroll,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson } from "@/lib/fetchJson";

type RecentBill = {
  id: number;
  billNo: number;
  type: "SALE" | "PURCHASE";
  date: string;
  mode: "CASH" | "CREDIT";
  total: number;
  account: { name: string } | null;
};

type DashboardData = {
  todaySales: number;
  todayPurchases: number;
  cashBalance: number;
  receivable: number;
  payable: number;
  lowStockCount: number;
  stockValue: number;
  recentBills: RecentBill[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchJson<DashboardData>("/api/dashboard").then((d) => {
      if (d) setData(d);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex gap-3">
            <Link href="/sale-bill">
              <PrimaryButton>New Sale Bill</PrimaryButton>
            </Link>
            <Link href="/purchase-bill">
              <PrimaryButton className="bg-gray-800 hover:bg-gray-900">New Purchase Bill</PrimaryButton>
            </Link>
          </div>
        }
      />

      {!data ? (
        <EmptyState>Loading...</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Today's Sales" value={formatMoney(data.todaySales)} tone="green" />
            <StatCard label="Today's Purchases" value={formatMoney(data.todayPurchases)} tone="red" />
            <StatCard label="Cash Balance" value={formatMoney(data.cashBalance)} tone="blue" />
            <StatCard label="Receivable" value={formatMoney(data.receivable)} tone="green" />
            <StatCard label="Payable" value={formatMoney(data.payable)} tone="red" />
            <StatCard
              label="Stock Value"
              value={formatMoney(data.stockValue)}
              sub={data.lowStockCount > 0 ? `${data.lowStockCount} item(s) low on stock` : undefined}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">
              Recent Bills
            </div>
            {data.recentBills.length === 0 ? (
              <EmptyState>No bills recorded yet.</EmptyState>
            ) : (
              <TableScroll>
              <table className={tableClass}>
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Type</th>
                    <th className="text-left font-semibold px-4 py-3">Bill #</th>
                    <th className="text-left font-semibold px-4 py-3">Date</th>
                    <th className="text-left font-semibold px-4 py-3">Account</th>
                    <th className="text-left font-semibold px-4 py-3">Mode</th>
                    <th className="text-right font-semibold px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBills.map((b) => (
                    <tr key={`${b.type}-${b.id}`} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            b.type === "SALE" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {b.type === "SALE" ? "Sale" : "Purchase"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">#{b.billNo}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">{b.account?.name || "Walk-in"}</td>
                      <td className="px-4 py-3 text-gray-600">{b.mode}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatMoney(b.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </TableScroll>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
