import { Card, EmptyState, TableScroll, tableClass } from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import type { ReportBill } from "@/lib/reportTypes";

// Lists every bill of one payment mode, one row each, with the bill count and totals underneath.
// Passing `paidLabel` (e.g. "Received" / "Paid") adds the paid and due columns used for credit bills.
export default function ReportBillsSection({
  title,
  tone,
  bills,
  totalAmount,
  accountLabel,
  paidLabel,
  showDate,
  emptyMessage,
}: {
  title: string;
  tone: "green" | "red";
  bills: ReportBill[];
  totalAmount: number;
  accountLabel: string;
  paidLabel?: string;
  showDate: boolean;
  emptyMessage: string;
}) {
  const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDue = totalAmount - totalPaid;
  const labelSpan = showDate ? 3 : 2;

  return (
    <Card className="overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <span className={`font-semibold ${tone === "red" ? "text-red-600" : "text-green-600"}`}>{title}</span>
        <span className="text-sm text-gray-500">
          {bills.length} bill(s) · {formatMoney(totalAmount)}
        </span>
      </div>
      {bills.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <TableScroll>
          <table className={tableClass}>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Bill #</th>
                {showDate && <th className="text-left font-semibold px-4 py-3">Date</th>}
                <th className="text-left font-semibold px-4 py-3">{accountLabel}</th>
                <th className="text-right font-semibold px-4 py-3">Total</th>
                {paidLabel && (
                  <>
                    <th className="text-right font-semibold px-4 py-3">{paidLabel}</th>
                    <th className="text-right font-semibold px-4 py-3">Due</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">#{b.billNo}</td>
                  {showDate && <td className="px-4 py-3 text-gray-600">{b.date}</td>}
                  <td className="px-4 py-3 text-gray-600">{b.account || "Walk-in"}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatMoney(b.total)}</td>
                  {paidLabel && (
                    <>
                      <td className="px-4 py-3 text-right text-gray-600">{formatMoney(b.paidAmount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">
                        {formatMoney(b.total - b.paidAmount)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
              <tr>
                <td colSpan={labelSpan} className="px-4 py-3">
                  Total · {bills.length} bill(s)
                </td>
                <td className="px-4 py-3 text-right">{formatMoney(totalAmount)}</td>
                {paidLabel && (
                  <>
                    <td className="px-4 py-3 text-right">{formatMoney(totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatMoney(totalDue)}</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </TableScroll>
      )}
    </Card>
  );
}
