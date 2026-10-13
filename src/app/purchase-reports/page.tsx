"use client";

import {
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  TableScroll,
  tableClass,
} from "@/components/ui";
import ReportBillsSection from "@/components/ReportBillsSection";
import ReportPeriodPicker from "@/components/ReportPeriodPicker";
import { formatMoney } from "@/lib/calc";
import type { ReportBill } from "@/lib/reportTypes";
import { formatQty, useReport } from "@/lib/useReport";

type PurchaseReport = {
  totalPurchases: number;
  cashPurchases: number;
  creditPurchases: number;
  billCount: number;
  cashBills: ReportBill[];
  creditBills: ReportBill[];
  byItem: { name: string; unit: string; qty: number; amount: number }[];
};

export default function PurchaseReportsPage() {
  const { picker, data, loading, showDate, period } = useReport<PurchaseReport>("/api/reports/purchases");

  return (
    <div>
      <PageHeader title="Purchase Reports" />

      <ReportPeriodPicker picker={picker} />

      {loading ? (
        <EmptyState>Loading...</EmptyState>
      ) : !data ? (
        <EmptyState>Could not load the report. Try again.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total Purchases"
              value={formatMoney(data.totalPurchases)}
              sub={`${data.billCount} bill(s)`}
              accent="violet"
            />
            <StatCard
              label="Credit Purchases"
              value={formatMoney(data.creditPurchases)}
              sub={`${data.creditBills.length} bill(s)`}
              accent="rose"
            />
            <StatCard
              label="Cash Purchases"
              value={formatMoney(data.cashPurchases)}
              sub={`${data.cashBills.length} bill(s)`}
              accent="emerald"
            />
          </div>

          <ReportBillsSection
            title="Credit Bills"
            tone="red"
            bills={data.creditBills}
            totalAmount={data.creditPurchases}
            accountLabel="Supplier"
            paidLabel="Paid"
            showDate={showDate}
            emptyMessage={`No credit bills ${period}.`}
          />

          <ReportBillsSection
            title="Cash Bills"
            tone="green"
            bills={data.cashBills}
            totalAmount={data.cashPurchases}
            accountLabel="Account"
            showDate={showDate}
            emptyMessage={`No cash bills ${period}.`}
          />

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-sky-100 font-semibold text-gray-900">
              Product Wise Purchase
            </div>
            {data.byItem.length === 0 ? (
              <EmptyState>No purchases {period}.</EmptyState>
            ) : (
              <TableScroll>
                <table className={tableClass}>
                  <thead className="bg-sky-50 text-sky-700">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Product</th>
                      <th className="text-right font-semibold px-4 py-3">Qty Purchased</th>
                      <th className="text-right font-semibold px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byItem.map((r) => (
                      <tr key={r.name} className="border-t border-sky-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatQty(r.qty)} {r.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">{formatMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-sky-50 border-t border-sky-100 font-semibold text-gray-900">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        Total · {data.byItem.length} product(s)
                      </td>
                      <td className="px-4 py-3 text-right">{formatMoney(data.totalPurchases)}</td>
                    </tr>
                  </tfoot>
                </table>
              </TableScroll>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
