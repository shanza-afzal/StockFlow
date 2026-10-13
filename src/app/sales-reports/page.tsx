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

type SalesReport = {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  cashSales: number;
  creditSales: number;
  billCount: number;
  cashBills: ReportBill[];
  creditBills: ReportBill[];
  byItem: { name: string; unit: string; qty: number; sales: number; cost: number }[];
};

export default function SalesReportsPage() {
  const { picker, data, loading, showDate, period } = useReport<SalesReport>("/api/reports/sales");

  return (
    <div>
      <PageHeader title="Sales Reports" />

      <ReportPeriodPicker picker={picker} />

      {loading ? (
        <EmptyState>Loading...</EmptyState>
      ) : !data ? (
        <EmptyState>Could not load the report. Try again.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Total Sales"
              value={formatMoney(data.totalSales)}
              sub={`${data.billCount} bill(s)`}
              accent="sky"
            />
            <StatCard
              label="Credit Sales"
              value={formatMoney(data.creditSales)}
              sub={`${data.creditBills.length} bill(s)`}
              accent="rose"
            />
            <StatCard
              label="Cash Sales"
              value={formatMoney(data.cashSales)}
              sub={`${data.cashBills.length} bill(s)`}
              accent="emerald"
            />
            <StatCard label="Total Cost" value={formatMoney(data.totalCost)} accent="amber" />
            <StatCard label="Total Profit" value={formatMoney(data.totalProfit)} tone="green" />
          </div>

          <ReportBillsSection
            title="Credit Bills"
            tone="red"
            bills={data.creditBills}
            totalAmount={data.creditSales}
            accountLabel="Customer"
            paidLabel="Received"
            showDate={showDate}
            emptyMessage={`No credit bills ${period}.`}
          />

          <ReportBillsSection
            title="Cash Bills"
            tone="green"
            bills={data.cashBills}
            totalAmount={data.cashSales}
            accountLabel="Account"
            showDate={showDate}
            emptyMessage={`No cash bills ${period}.`}
          />

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-sky-100 font-semibold text-gray-900">
              Product Wise Sale
            </div>
            {data.byItem.length === 0 ? (
              <EmptyState>No sales {period}.</EmptyState>
            ) : (
              <TableScroll>
                <table className={tableClass}>
                  <thead className="bg-sky-50 text-sky-700">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Product</th>
                      <th className="text-right font-semibold px-4 py-3">Qty Sold</th>
                      <th className="text-right font-semibold px-4 py-3">Sales</th>
                      <th className="text-right font-semibold px-4 py-3">Cost</th>
                      <th className="text-right font-semibold px-4 py-3">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byItem.map((r) => (
                      <tr key={r.name} className="border-t border-sky-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatQty(r.qty)} {r.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">{formatMoney(r.sales)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatMoney(r.cost)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">
                          {formatMoney(r.sales - r.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-sky-50 border-t border-sky-100 font-semibold text-gray-900">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        Total · {data.byItem.length} product(s)
                      </td>
                      <td className="px-4 py-3 text-right">{formatMoney(data.totalSales)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(data.totalCost)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatMoney(data.totalProfit)}</td>
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
