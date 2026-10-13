"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  FieldLabel,
  PrimaryButton,
  Segmented,
  TableScroll,
  blurOnWheel,
  inputClass,
  selectClass,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { parseJson } from "@/lib/fetchJson";
import { stockLevel } from "@/lib/stockLevel";

type StockRow = {
  id: number;
  name: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
};

type AccountRow = {
  id: number;
  name: string;
  type: string;
  balance: number;
};

type Row = {
  key: string;
  itemId: string;
  qty: string;
  price: string;
};

function emptyRow(): Row {
  return { key: Math.random().toString(36).slice(2), itemId: "", qty: "", price: "" };
}

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}

export default function BillForm({ type }: { type: "SALE" | "PURCHASE" }) {
  const [items, setItems] = useState<StockRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [date, setDate] = useState(todayStr());
  const [mode, setMode] = useState<"CASH" | "CREDIT">("CASH");
  const [accountId, setAccountId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const itemRefs = useRef(new Map<string, HTMLSelectElement>());
  const qtyRefs = useRef(new Map<string, HTMLInputElement>());
  const priceRefs = useRef(new Map<string, HTMLInputElement>());
  // True while a key press on an item dropdown is being handled. Lets handleItemSelect tell an
  // arrow/type-ahead change on the closed dropdown apart from a pick made in the open popup.
  const itemKeyChange = useRef(false);
  // True between a lone Ctrl keydown and its keyup; see the Ctrl-tap effect below.
  const ctrlTap = useRef(false);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => parseJson<StockRow[]>(r))
      .then((data) => setItems(data ?? []));
    fetch("/api/accounts")
      .then((r) => parseJson<AccountRow[]>(r))
      .then((data) => setAccounts(data ?? []));
  }, []);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleItemSelect(key: string, itemIdStr: string) {
    const item = itemMap.get(Number(itemIdStr));
    const defaultPrice = item ? (type === "SALE" ? item.salePrice : item.purchasePrice) : undefined;
    updateRow(key, {
      itemId: itemIdStr,
      price: defaultPrice !== undefined ? String(defaultPrice) : "",
    });
    // A pick made in the open dropdown (Enter or click) never reaches the row's onKeyDown, so move
    // on to Qty here. Skipped for arrow/type-ahead changes so those can keep cycling through items.
    if (item && !itemKeyChange.current) {
      setTimeout(() => qtyRefs.current.get(key)?.focus(), 0);
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent, rowKey: string) {
    // Space and Alt+Arrow open the popup instead of changing the selection.
    if (e.key !== "Enter" && e.key !== " " && !e.altKey && !e.ctrlKey && !e.metaKey) {
      itemKeyChange.current = true;
      // The change event fires synchronously in the same task as the key press.
      setTimeout(() => {
        itemKeyChange.current = false;
      }, 0);
    }
    handleRowKeyDown(e, rowKey, "item");
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function addRow() {
    const row = emptyRow();
    setRows((rs) => [...rs, row]);
    return row.key;
  }

  function handleRowKeyDown(
    e: React.KeyboardEvent,
    rowKey: string,
    field: "item" | "qty" | "price"
  ) {
    if (e.key !== "Enter") return;
    if (e.ctrlKey) {
      // Let the Ctrl+Enter keydown bubble up to the form-level handler, which saves the bill.
      return;
    }
    e.preventDefault();
    // Item -> Qty -> Price -> Item of the next row.
    if (field === "item") {
      qtyRefs.current.get(rowKey)?.focus();
    } else if (field === "qty") {
      priceRefs.current.get(rowKey)?.focus();
    } else {
      const index = rows.findIndex((r) => r.key === rowKey);
      let nextKey: string;
      if (index < rows.length - 1) {
        nextKey = rows[index + 1].key;
      } else if (!rows[index]?.itemId) {
        // The last row is still blank, so go back to its Item instead of stacking up empty rows.
        nextKey = rowKey;
      } else {
        nextKey = addRow();
      }
      // A row added just now isn't in the DOM until React has rendered it.
      setTimeout(() => itemRefs.current.get(nextKey)?.focus(), 0);
    }
  }

  const billTotal = rows.reduce((sum, r) => {
    const qty = Number(r.qty) || 0;
    const price = Number(r.price) || 0;
    return sum + qty * price;
  }, 0);

  const amountDue = mode === "CASH" ? 0 : Math.max(billTotal - (Number(amountReceived) || 0), 0);

  const costAmount =
    type === "SALE"
      ? rows.reduce((sum, r) => {
          const qty = Number(r.qty) || 0;
          const item = itemMap.get(Number(r.itemId));
          return sum + qty * (item?.purchasePrice ?? 0);
        }, 0)
      : 0;
  const profit = billTotal - costAmount;

  // Stock left per item once every line on this sale is taken off, so the same item picked on
  // two rows is counted together.
  const stockWarnings = useMemo(() => {
    if (type !== "SALE") return [];
    const sold = new Map<number, number>();
    for (const r of rows) {
      const id = Number(r.itemId);
      if (id) sold.set(id, (sold.get(id) ?? 0) + (Number(r.qty) || 0));
    }
    const warnings: { id: number; text: string; severe: boolean }[] = [];
    for (const [id, qty] of sold) {
      const item = itemMap.get(id);
      if (!item) continue;
      const remaining = item.stock - qty;
      if (item.stock <= 0) {
        warnings.push({ id, text: `${item.name} is out of stock`, severe: true });
      } else if (remaining < 0) {
        warnings.push({
          id,
          text: `${item.name}: only ${item.stock} ${item.unit} in stock, ${qty} requested`,
          severe: true,
        });
      } else if (stockLevel(remaining) === "OUT") {
        warnings.push({ id, text: `${item.name}: this sale uses up all remaining stock`, severe: true });
      } else if (stockLevel(remaining) === "LOW") {
        warnings.push({
          id,
          text: `${item.name}: only ${remaining} ${item.unit} left after this sale`,
          severe: false,
        });
      }
    }
    return warnings;
  }, [type, rows, itemMap]);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    const validRows = rows.filter((r) => r.itemId && Number(r.qty) > 0);
    if (validRows.length === 0) {
      setError("Add at least one item with a quantity.");
      return;
    }
    if (mode === "CREDIT" && !accountId) {
      setError("Select an account for a credit bill.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date,
          mode,
          accountId: accountId ? Number(accountId) : null,
          items: validRows.map((r) => ({
            itemId: Number(r.itemId),
            qty: Number(r.qty),
            price: Number(r.price) || 0,
          })),
          paidAmount: mode === "CREDIT" ? Number(amountReceived) || 0 : billTotal,
        }),
      });
      const data = await parseJson<{ error?: string; billNo?: number }>(res);
      if (!res.ok) {
        setError(data?.error || "Could not save the bill.");
        return;
      }
      if (!data) {
        setError("Could not save the bill.");
        return;
      }
      setSuccess(`${type === "SALE" ? "Sale" : "Purchase"} bill #${data.billNo} saved.`);
      setRows([emptyRow()]);
      setAmountReceived("");
      setAccountId("");
      fetch("/api/items")
        .then((r) => parseJson<StockRow[]>(r))
        .then((d) => setItems(d ?? []));
      fetch("/api/accounts")
        .then((r) => parseJson<AccountRow[]>(r))
        .then((d) => setAccounts(d ?? []));
    } finally {
      setSaving(false);
    }
  }

  // Tapping Ctrl on its own saves the bill. Any other key or a click while Ctrl is down (Ctrl+C,
  // Ctrl+Enter, Ctrl+click...) cancels the tap, so normal shortcuts never trigger a save.
  // Re-registered every render so the handler always sees the current form state.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      ctrlTap.current = e.key === "Control";
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key !== "Control" || !ctrlTap.current) return;
      ctrlTap.current = false;
      if (!saving) handleSubmit();
    }
    function cancelTap() {
      ctrlTap.current = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", cancelTap);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", cancelTap);
    };
  });

  const walkInLabel = "Walk-in / Cash customer";
  const totalLabel = type === "SALE" ? "Sale Total" : "Purchase Total";

  return (
    <div
      className="flex flex-col gap-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
    >
      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Cash / Credit</FieldLabel>
            <Segmented
              options={[
                { value: "CASH", label: "Cash" },
                { value: "CREDIT", label: "Credit" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          <div>
            <FieldLabel>
              Account {mode === "CASH" ? "(optional)" : ""}
            </FieldLabel>
            <select
              className={selectClass}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">{walkInLabel}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <TableScroll>
          <table className={tableClass}>
          <thead className="bg-sky-50 text-sky-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Item</th>
              <th className="text-right font-semibold px-4 py-3 w-24">Qty</th>
              <th className="text-right font-semibold px-4 py-3 w-32">Price</th>
              <th className="text-right font-semibold px-4 py-3 w-32">Subtotal</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const qty = Number(row.qty) || 0;
              const price = Number(row.price) || 0;
              return (
                <tr key={row.key} className="border-t border-sky-100">
                  <td className="px-4 py-2">
                    <select
                      ref={(el) => {
                        if (el) itemRefs.current.set(row.key, el);
                        else itemRefs.current.delete(row.key);
                      }}
                      className={selectClass}
                      value={row.itemId}
                      onChange={(e) => handleItemSelect(row.key, e.target.value)}
                      onKeyDown={(e) => handleItemKeyDown(e, row.key)}
                    >
                      <option value="">Select item</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      ref={(el) => {
                        if (el) qtyRefs.current.set(row.key, el);
                        else qtyRefs.current.delete(row.key);
                      }}
                      type="number"
                      min="0"
                      step="any"
                      className={inputClass + " text-right"}
                      value={row.qty}
                      placeholder="0"
                      onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                      onWheel={blurOnWheel}
                      onKeyDown={(e) => handleRowKeyDown(e, row.key, "qty")}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      ref={(el) => {
                        if (el) priceRefs.current.set(row.key, el);
                        else priceRefs.current.delete(row.key);
                      }}
                      type="number"
                      min="0"
                      step="any"
                      className={inputClass + " text-right"}
                      value={row.price}
                      placeholder="0.00"
                      onChange={(e) => updateRow(row.key, { price: e.target.value })}
                      onWheel={blurOnWheel}
                      onKeyDown={(e) => handleRowKeyDown(e, row.key, "price")}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatMoney(qty * price)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </TableScroll>
        <div className="border-t border-sky-100 p-4">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-sky-50"
          >
            Add Item
          </button>
        </div>
      </Card>

      {stockWarnings.length > 0 && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            stockWarnings.some((w) => w.severe)
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <div className="font-semibold mb-1">Stock warning</div>
          <ul className="list-disc pl-5">
            {stockWarnings.map((w) => (
              <li key={w.id}>{w.text}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="p-6">
        {mode === "CREDIT" && (
          <div className="mb-4 max-w-xs">
            <FieldLabel>Amount Received (optional)</FieldLabel>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              value={amountReceived}
              placeholder="0.00"
              onChange={(e) => setAmountReceived(e.target.value)}
              onWheel={blurOnWheel}
            />
          </div>
        )}
        <div className="ml-auto w-full max-w-sm">
          <div className="flex justify-between items-center text-gray-700 py-1">
            <span className="font-medium">{totalLabel}</span>
            <span className="font-bold text-gray-900">{formatMoney(billTotal)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-sky-100 mt-1 pt-2">
            <span className="font-bold text-gray-900 text-lg">Amount Due</span>
            <span className="font-bold text-blue-600 text-xl">{formatMoney(amountDue)}</span>
          </div>
        </div>
      </Card>

      {type === "SALE" && (
        <Card className="p-6">
          <div className="font-semibold text-gray-900 mb-2">Profit</div>
          <p className="text-sm text-gray-500 mb-4">
            Sale Amount is the Bill Total above. Cost Amount is worked out automatically from each
            item&apos;s purchase price — nothing to enter here.
          </p>
          <div className="flex justify-between items-center text-gray-700 py-1">
            <span>Sale Amount</span>
            <span className="font-medium text-gray-900">{formatMoney(billTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-700 py-1">
            <span>Cost Amount</span>
            <span className="font-medium text-gray-900">{formatMoney(costAmount)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-sky-100 mt-1 pt-2">
            <span className="font-bold text-gray-900">Profit</span>
            <span className={`font-bold text-lg ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatMoney(profit)}
            </span>
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 text-red-700 text-sm px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 text-green-700 text-sm px-4 py-3">{success}</div>
      )}

      <div className="flex justify-end">
        <PrimaryButton onClick={handleSubmit} disabled={saving} className="px-6 py-3 text-base">
          {saving ? "Saving..." : "Save Bill"}
        </PrimaryButton>
      </div>
    </div>
  );
}
