"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { stockLevel } from "@/lib/stockLevel";

export type LowStockItem = { id: number; name: string; unit: string; stock: number };

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function StockBadge({ stock }: { stock: number }) {
  const level = stockLevel(stock);
  if (level === "OK") return null;
  return (
    <span
      className={`ml-2 align-middle text-xs font-semibold px-2 py-0.5 rounded-full ${
        level === "OUT" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {level === "OUT" ? "Out of stock" : "Low stock"}
    </span>
  );
}

function WarningIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Callers pass every item that is out of stock or low; nothing renders when there are none.
// The alert itself is a small chip; the item details open in a dialog when it's clicked.
export default function LowStockAlert({ items }: { items: LowStockItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.stock - b.stock);
  const outCount = sorted.filter((i) => stockLevel(i.stock) === "OUT").length;
  const lowCount = sorted.length - outCount;
  const critical = outCount > 0;

  const summary = [
    outCount > 0 ? `${plural(outCount, "item")} out of stock` : null,
    lowCount > 0 ? `${plural(lowCount, "item")} running low` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div role="alert" className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
          critical
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
      >
        <WarningIcon className={critical ? "text-rose-500" : "text-amber-500"} />
        <span className="truncate underline decoration-dotted underline-offset-4">
          {critical ? "Restock needed" : "Low stock warning"} · {plural(sorted.length, "item")}
        </span>
      </button>

      {open && (
        <Modal
          title={critical ? "Restock needed" : "Low stock warning"}
          subtitle={summary}
          size="lg"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-sky-50 transition-colors"
              >
                Close
              </button>
              <Link
                href="/purchase-bill"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                New Purchase Bill
              </Link>
            </div>
          }
        >
          <table className="w-full text-sm">
            <thead className="bg-sky-50 text-sky-700">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Item</th>
                <th className="text-right font-semibold px-3 py-2">Qty Left</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr key={i.id} className="border-t border-sky-100">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">
                      {i.name}
                      <StockBadge stock={i.stock} />
                    </div>
                    <div className="text-xs text-gray-400">Unit: {i.unit}</div>
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-semibold ${
                      stockLevel(i.stock) === "OUT" ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {i.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
