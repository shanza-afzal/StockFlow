import Link from "next/link";
import { stockLevel } from "@/lib/stockLevel";

export type LowStockItem = { id: number; name: string; unit: string; stock: number };

const MAX_LISTED = 8;

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

// Callers pass every item that is out of stock or low; the banner renders nothing when there are none.
export default function LowStockAlert({ items }: { items: LowStockItem[] }) {
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

  const listed = sorted.slice(0, MAX_LISTED);
  const hidden = sorted.length - listed.length;

  return (
    <div
      role="alert"
      className={`mb-6 rounded-xl border p-4 ${
        critical ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={`font-semibold ${critical ? "text-rose-800" : "text-amber-800"}`}>
            {critical ? "Restock needed" : "Low stock warning"}
          </div>
          <div className={`text-sm ${critical ? "text-rose-700" : "text-amber-700"}`}>{summary}</div>
        </div>
        <Link
          href="/purchase-bill"
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          New Purchase Bill
        </Link>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {listed.map((i) => (
          <li
            key={i.id}
            className="rounded-lg border border-white/60 bg-white px-2.5 py-1 text-sm text-gray-800 shadow-sm"
          >
            <span className="font-medium">{i.name}</span>
            <span className={stockLevel(i.stock) === "OUT" ? "text-red-600" : "text-amber-600"}>
              {" "}
              — {stockLevel(i.stock) === "OUT" ? "out of stock" : `${i.stock} ${i.unit} left`}
            </span>
          </li>
        ))}
        {hidden > 0 && (
          <li className="px-1 py-1 text-sm text-gray-600">
            <Link href="/stock" className="underline hover:text-gray-900">
              +{hidden} more
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
