"use client";

import { useEffect, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Modal from "@/components/Modal";
import {
  Card,
  DangerButton,
  FieldLabel,
  TableScroll,
  Tabs,
  blurOnWheel,
  compactInputClass,
  compactSelectClass,
  inputClass,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson, parseJson } from "@/lib/fetchJson";

type BillItem = {
  id: number;
  itemId: number;
  qty: number;
  price: number;
  costPrice: number;
  subtotal: number;
  item: { name: string; unit: string };
};

type Bill = {
  id: number;
  billNo: number;
  date: string;
  mode: "CASH" | "CREDIT";
  total: number;
  paidAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  account: { id: number; name: string } | null;
  items: BillItem[];
};

type StockRow = {
  id: number;
  name: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
};

type AccountRow = {
  id: number;
  name: string;
};

// `orig` is the saved line this row started from (null for rows added while editing), so the
// popup can show what changed.
type EditRow = {
  key: string;
  itemId: string;
  qty: string;
  price: string;
  orig: { billItemId: number; itemId: number; name: string; qty: number; price: number } | null;
};

function emptyEditRow(): EditRow {
  return { key: Math.random().toString(36).slice(2), itemId: "", qty: "", price: "", orig: null };
}

function isRowEdited(r: EditRow) {
  return (
    r.orig !== null &&
    (r.itemId !== String(r.orig.itemId) ||
      (Number(r.qty) || 0) !== r.orig.qty ||
      (Number(r.price) || 0) !== r.orig.price)
  );
}

function signedMoney(n: number) {
  if (Math.abs(n) < 0.005) return "—";
  return `${n > 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`;
}

function SectionTitle({
  children,
  className = "mb-1.5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-xs font-semibold uppercase tracking-wide text-gray-500 ${className}`}>
      {children}
    </h3>
  );
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-gray-600">{children}</label>;
}

type View = "DATE" | "RANGE" | "ALL";

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function BillsRegister({ type }: { type: "SALE" | "PURCHASE" }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("DATE");
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [items, setItems] = useState<StockRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [editDate, setEditDate] = useState("");
  const [editMode, setEditMode] = useState<"CASH" | "CREDIT">("CASH");
  const [editAccountId, setEditAccountId] = useState("");
  const [editAmountReceived, setEditAmountReceived] = useState("");
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  // Delete All removes every bill of this type, not just the ones on screen, so its popup counts
  // them first: undefined while counting, null if the count failed.
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllSummary, setDeleteAllSummary] = useState<
    { count: number; total: number } | null | undefined
  >(undefined);

  useEffect(() => {
    fetchJson<StockRow[]>("/api/items").then((data) => {
      if (data) setItems(data);
    });
    fetchJson<AccountRow[]>("/api/accounts").then((data) => {
      if (data) setAccounts(data);
    });
  }, []);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (view === "DATE") {
      params.set("from", date);
      params.set("to", date);
    } else if (view === "RANGE") {
      params.set("from", from);
      params.set("to", to);
    }
    fetchJson<Bill[]>(`/api/bills?${params.toString()}`).then((data) => {
      if (data) setBills(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, date, from, to]);

  async function confirmDeleteBill(bill: Bill): Promise<string | null> {
    const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await parseJson<{ error?: string }>(res);
      return data?.error || "Could not delete the bill.";
    }
    setViewingId(null);
    load();
    return null;
  }

  function openDeleteAll() {
    setDeleteAllSummary(undefined);
    setDeleteAllOpen(true);
    fetchJson<Bill[]>(`/api/bills?type=${type}`)
      .then((data) =>
        setDeleteAllSummary(
          Array.isArray(data)
            ? { count: data.length, total: data.reduce((s, b) => s + b.total, 0) }
            : null
        )
      )
      .catch(() => setDeleteAllSummary(null));
  }

  async function confirmDeleteAll(): Promise<string | null> {
    const res = await fetch(`/api/bills?type=${type}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await parseJson<{ error?: string }>(res);
      return data?.error || "Could not delete the bills.";
    }
    load();
    return null;
  }

  function handleView(id: number) {
    setEditingId(null);
    setViewingId(id);
  }

  function handleEdit(bill: Bill) {
    setEditError(null);
    setEditDate(bill.date.slice(0, 10));
    setEditMode(bill.mode);
    setEditAccountId(bill.account ? String(bill.account.id) : "");
    setEditAmountReceived(bill.mode === "CREDIT" ? String(bill.paidAmount) : "");
    setEditRows(
      bill.items.map((it) => ({
        key: Math.random().toString(36).slice(2),
        itemId: String(it.itemId),
        qty: String(it.qty),
        price: String(it.price),
        orig: {
          billItemId: it.id,
          itemId: it.itemId,
          name: it.item.name,
          qty: it.qty,
          price: it.price,
        },
      }))
    );
    setViewingId(null);
    setEditingId(bill.id);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function updateEditRow(key: string, patch: Partial<EditRow>) {
    setEditRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeEditRow(key: string) {
    setEditRows((rs) => rs.filter((r) => r.key !== key));
  }

  function addEditRow() {
    setEditRows((rs) => [...rs, emptyEditRow()]);
  }

  function handleEditItemSelect(key: string, itemIdStr: string) {
    const item = items.find((i) => i.id === Number(itemIdStr));
    const defaultPrice = item ? (type === "SALE" ? item.salePrice : item.purchasePrice) : undefined;
    updateEditRow(key, {
      itemId: itemIdStr,
      price: defaultPrice !== undefined ? String(defaultPrice) : "",
    });
  }

  const editTotal = editRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);

  async function handleSaveEdit(id: number) {
    setEditError(null);
    const validRows = editRows.filter((r) => r.itemId && Number(r.qty) > 0);
    if (validRows.length === 0) {
      setEditError("Add at least one item with a quantity.");
      return;
    }
    if (editMode === "CREDIT" && !editAccountId) {
      setEditError("Select an account for a credit bill.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          mode: editMode,
          accountId: editAccountId ? Number(editAccountId) : null,
          items: validRows.map((r) => ({
            itemId: Number(r.itemId),
            qty: Number(r.qty),
            price: Number(r.price) || 0,
          })),
          paidAmount: editMode === "CREDIT" ? Number(editAmountReceived) || 0 : editTotal,
        }),
      });
      const data = await parseJson<{ error?: string }>(res);
      if (!res.ok) {
        setEditError(data?.error || "Could not save the bill.");
        return;
      }
      setEditingId(null);
      load();
    } finally {
      setSavingEdit(false);
    }
  }

  const emptyMessage =
    view === "DATE"
      ? "No bills on this date."
      : view === "RANGE"
        ? "No bills in this date range."
        : "No bills recorded yet.";

  const totalAmount = bills.reduce((s, b) => s + b.total, 0);
  const totalDue = bills.reduce((s, b) => s + (b.total - b.paidAmount), 0);

  const typeLabel = type === "SALE" ? "Sale" : "Purchase";
  const paidLabel = type === "SALE" ? "Amount Received" : "Amount Paid";
  const viewingBill = viewingId !== null ? bills.find((b) => b.id === viewingId) : undefined;
  const editingBill = editingId !== null ? bills.find((b) => b.id === editingId) : undefined;
  const viewingEdited =
    viewingBill !== undefined &&
    new Date(viewingBill.updatedAt).getTime() - new Date(viewingBill.createdAt).getTime() > 1000;
  const viewingDue = viewingBill ? viewingBill.total - viewingBill.paidAmount : 0;
  const viewingCost = viewingBill
    ? viewingBill.items.reduce((sum, it) => sum + it.qty * it.costPrice, 0)
    : 0;
  const viewingProfit = viewingBill ? viewingBill.total - viewingCost : 0;

  // What the edit popup compares against: the bill as saved ("before") vs the draft ("after").
  const itemById = new Map(items.map((i) => [i.id, i]));
  const editReceived = Number(editAmountReceived) || 0;
  const editPaid = editMode === "CASH" ? editTotal : Math.min(editReceived, editTotal);
  const editDue = editTotal - editPaid;
  const editCost =
    type === "SALE"
      ? editRows.reduce(
          (sum, r) => sum + (Number(r.qty) || 0) * (itemById.get(Number(r.itemId))?.purchasePrice ?? 0),
          0
        )
      : 0;
  const editProfit = editTotal - editCost;
  const editEditedCount = editRows.filter(isRowEdited).length;
  const editAddedCount = editRows.filter((r) => !r.orig && r.itemId && Number(r.qty) > 0).length;
  const editRemoved = editingBill
    ? editingBill.items.filter((it) => !editRows.some((r) => r.orig?.billItemId === it.id))
    : [];
  const beforeDue = editingBill ? editingBill.total - editingBill.paidAmount : 0;
  const beforeCost = editingBill
    ? editingBill.items.reduce((sum, it) => sum + it.qty * it.costPrice, 0)
    : 0;
  const beforeProfit = editingBill ? editingBill.total - beforeCost : 0;
  const editDirty =
    editingBill !== undefined &&
    (editDate !== editingBill.date.slice(0, 10) ||
      editMode !== editingBill.mode ||
      editAccountId !== (editingBill.account ? String(editingBill.account.id) : "") ||
      (editMode === "CREDIT" && editingBill.mode === "CREDIT" && editReceived !== editingBill.paidAmount) ||
      editEditedCount > 0 ||
      editAddedCount > 0 ||
      editRemoved.length > 0);
  const editingCreatedEdited =
    editingBill !== undefined &&
    new Date(editingBill.updatedAt).getTime() - new Date(editingBill.createdAt).getTime() > 1000;

  // What a delete does, in the register's own terms: stock is worked out from bills, so removing
  // one puts the quantities back the other way.
  const deleteStockEffect =
    type === "SALE"
      ? "The quantities sold go back into stock."
      : "The quantities purchased are taken back out of stock.";
  const billTypeWord = type === "SALE" ? "sale" : "purchase";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          tabs={[
            { value: "DATE", label: "By Date" },
            { value: "RANGE", label: "Date Range" },
            { value: "ALL", label: "All Bills" },
          ]}
          value={view}
          onChange={setView}
        />
        <button
          type="button"
          onClick={openDeleteAll}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          Delete All Bills
        </button>
      </div>

      {view !== "ALL" && (
        <div className="flex flex-wrap gap-4">
          {view === "DATE" ? (
            <div>
              <FieldLabel>Date</FieldLabel>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div>
                <FieldLabel>From</FieldLabel>
                <input
                  type="date"
                  className={inputClass}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>To</FieldLabel>
                <input
                  type="date"
                  className={inputClass}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}

      <Card className="overflow-hidden">
        <TableScroll>
          <table className={tableClass}>
          <thead className="bg-sky-50 text-sky-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Bill #</th>
              <th className="text-left font-semibold px-4 py-3">Account</th>
              <th className="text-left font-semibold px-4 py-3">Type</th>
              <th className="text-right font-semibold px-4 py-3">Total</th>
              <th className="text-right font-semibold px-4 py-3">Due</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading || bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-gray-500">
                  {loading ? "Loading..." : emptyMessage}
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-sky-100 hover:bg-sky-50 cursor-pointer"
                  onClick={() => handleView(b.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">#{b.billNo}</td>
                  <td className="px-4 py-3 text-gray-600">{b.account?.name || "Walk-in"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        b.mode === "CASH" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {b.mode === "CASH" ? "Cash" : "Credit"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatMoney(b.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600 font-medium">
                    {formatMoney(b.total - b.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(b.id);
                      }}
                      className="rounded-lg text-gray-600 hover:bg-sky-100 px-2 py-1 text-sm font-medium transition-colors"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(b);
                      }}
                      className="rounded-lg text-blue-600 hover:bg-sky-50 px-2 py-1 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <DangerButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingBill(b);
                      }}
                    >
                      Delete
                    </DangerButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </TableScroll>
      </Card>

      {bills.length > 0 && (
        <Card className="p-4 flex justify-end gap-8 text-sm">
          <div>
            <div className="text-gray-500">Total</div>
            <div className="font-bold text-gray-900">{formatMoney(totalAmount)}</div>
          </div>
          <div>
            <div className="text-gray-500">Outstanding</div>
            <div className="font-bold text-blue-600">{formatMoney(totalDue)}</div>
          </div>
        </Card>
      )}

      {viewingBill && (
        <Modal
          title={`${typeLabel} Bill #${viewingBill.billNo}`}
          subtitle={[
            viewingBill.date.slice(0, 10),
            viewingBill.account?.name || "Walk-in",
            viewingBill.mode === "CASH" ? "Cash" : "Credit",
          ].join(" · ")}
          onClose={() => setViewingId(null)}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingId(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-sky-100 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleEdit(viewingBill)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-sky-50 transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-sky-50 transition-colors"
              >
                Reprint
              </button>
              <button
                type="button"
                onClick={() => setDeletingBill(viewingBill)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Void Bill
              </button>
            </div>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sky-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 text-left">Item</th>
                <th className="py-2 pl-3 text-right">Qty</th>
                <th className="py-2 pl-3 text-right">Price</th>
                <th className="py-2 pl-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {viewingBill.items.map((it) => (
                <tr key={it.id} className="border-b border-sky-100">
                  <td className="py-2.5 text-gray-900">{it.item.name}</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap text-gray-700">
                    {it.qty} <span className="text-xs text-gray-400">{it.item.unit}</span>
                  </td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap text-gray-700">
                    {formatMoney(it.price)}
                  </td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap font-medium text-gray-900">
                    {formatMoney(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-base font-bold text-gray-900">{formatMoney(viewingBill.total)}</span>
            </div>
            {viewingBill.mode === "CREDIT" && (
              <div className="flex items-center justify-between text-gray-500">
                <span>{paidLabel}</span>
                <span>{formatMoney(viewingBill.paidAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-gray-500">
              <span>Amount Due</span>
              <span className={viewingDue > 0 ? "font-semibold text-blue-600" : ""}>
                {formatMoney(viewingDue)}
              </span>
            </div>
          </div>

          {type === "SALE" && (
            <div className="mt-5 rounded-lg bg-sky-50 px-4 py-3 text-sm print:hidden">
              <div className="flex items-center justify-between py-0.5 text-gray-500">
                <span>Sale Amount</span>
                <span className="text-gray-900">{formatMoney(viewingBill.total)}</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-gray-500">
                <span>Cost Amount</span>
                <span className="text-gray-900">{formatMoney(viewingCost)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-sky-100 pt-2">
                <span className="font-semibold text-gray-900">Profit</span>
                <span
                  className={`font-bold ${viewingProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatMoney(viewingProfit)}
                </span>
              </div>
            </div>
          )}

          {viewingBill.notes && (
            <div className="mt-5 text-sm">
              <div className="mb-0.5 text-xs text-gray-500">Notes</div>
              <div className="text-gray-900">{viewingBill.notes}</div>
            </div>
          )}

          <div className="mt-5 space-y-0.5 text-xs text-gray-400 print:hidden">
            <div>Created {new Date(viewingBill.createdAt).toLocaleString()}</div>
            {viewingEdited && <div>Last edited {new Date(viewingBill.updatedAt).toLocaleString()}</div>}
          </div>
        </Modal>
      )}

      {editingBill && (
        <Modal
          title={`Edit ${typeLabel} Bill #${editingBill.billNo}`}
          subtitle={[
            editingBill.date.slice(0, 10),
            editingBill.account?.name || "Walk-in",
            editingBill.mode === "CASH" ? "Cash" : "Credit",
          ].join(" · ")}
          onClose={cancelEdit}
          size="lg"
          closeOnBackdrop={false}
          footer={
            <>
              {editError && (
                <div className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-red-700">{editError}</div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-xs ${editDirty ? "font-medium text-amber-600" : "text-gray-400"}`}
                >
                  {editDirty ? "Unsaved changes" : "No changes yet"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-sky-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingEdit || !editDirty}
                    onClick={() => handleSaveEdit(editingBill.id)}
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <MiniLabel>Date</MiniLabel>
                <input
                  type="date"
                  className={compactInputClass}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div>
                <MiniLabel>Cash / Credit</MiniLabel>
                <select
                  className={compactSelectClass}
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as "CASH" | "CREDIT")}
                >
                  <option value="CASH">Cash</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
              <div>
                <MiniLabel>Account{editMode === "CASH" ? " (optional)" : ""}</MiniLabel>
                <select
                  className={compactSelectClass}
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                >
                  <option value="">Walk-in / Cash customer</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <SectionTitle className="">Items</SectionTitle>
                <button
                  type="button"
                  onClick={addEditRow}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  + Add Item
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-sky-100">
                <TableScroll>
                  <table className="w-full min-w-120 text-sm">
                    <thead className="bg-sky-50 text-xs font-semibold uppercase tracking-wide text-sky-700">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left">Item</th>
                        <th className="w-20 px-2.5 py-1.5 text-right">Qty</th>
                        <th className="w-24 px-2.5 py-1.5 text-right">Price</th>
                        <th className="w-24 px-2.5 py-1.5 text-right">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editRows.map((row) => {
                        const qty = Number(row.qty) || 0;
                        const price = Number(row.price) || 0;
                        const edited = isRowEdited(row);
                        const added = !row.orig;
                        return (
                          <tr key={row.key} className="border-t border-sky-100 align-top">
                            <td
                              className={`border-l-2 px-2.5 py-1.5 ${
                                edited
                                  ? "border-l-amber-400"
                                  : added
                                    ? "border-l-green-500"
                                    : "border-l-transparent"
                              }`}
                            >
                              <select
                                className={compactSelectClass}
                                value={row.itemId}
                                onChange={(e) => handleEditItemSelect(row.key, e.target.value)}
                              >
                                <option value="">Select item</option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name}
                                  </option>
                                ))}
                              </select>
                              {edited && row.orig && (
                                <div className="mt-0.5 text-xs text-amber-700">
                                  Was {row.orig.name} · {row.orig.qty} × {formatMoney(row.orig.price)}
                                </div>
                              )}
                              {added && row.itemId && (
                                <div className="mt-0.5 text-xs text-green-700">New item</div>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className={compactInputClass + " text-right"}
                                value={row.qty}
                                placeholder="0"
                                onChange={(e) => updateEditRow(row.key, { qty: e.target.value })}
                                onWheel={blurOnWheel}
                              />
                            </td>
                            <td className="px-2.5 py-1.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className={compactInputClass + " text-right"}
                                value={row.price}
                                placeholder="0.00"
                                onChange={(e) => updateEditRow(row.key, { price: e.target.value })}
                                onWheel={blurOnWheel}
                              />
                            </td>
                            <td className="px-2.5 py-3 text-right font-medium text-gray-900">
                              {formatMoney(qty * price)}
                            </td>
                            <td className="px-1.5 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeEditRow(row.key)}
                                className="text-gray-400 transition-colors hover:text-red-500"
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
              </div>
            </section>

            <section>
              <SectionTitle>Summary</SectionTitle>
              <div className="rounded-lg bg-sky-50 px-3.5 py-2.5 text-sm">
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-1">
                  <span></span>
                  <span className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Before
                  </span>
                  <span className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    After
                  </span>
                  <span className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Change
                  </span>

                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-right text-gray-500">{formatMoney(editingBill.total)}</span>
                  <span className="text-right font-bold text-gray-900">{formatMoney(editTotal)}</span>
                  <span className="text-right text-gray-500">{signedMoney(editTotal - editingBill.total)}</span>

                  {editMode === "CREDIT" && (
                    <>
                      <span className="text-gray-600">{paidLabel}</span>
                      <span className="text-right text-gray-500">{formatMoney(editingBill.paidAmount)}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={compactInputClass + " w-28 text-right"}
                        value={editAmountReceived}
                        placeholder="0.00"
                        onChange={(e) => setEditAmountReceived(e.target.value)}
                        onWheel={blurOnWheel}
                      />
                      <span className="text-right text-gray-500">
                        {signedMoney(editPaid - editingBill.paidAmount)}
                      </span>
                    </>
                  )}

                  <span className="text-gray-600">Amount Due</span>
                  <span className="text-right text-gray-500">{formatMoney(beforeDue)}</span>
                  <span className={`text-right ${editDue > 0 ? "font-semibold text-blue-600" : "text-gray-900"}`}>
                    {formatMoney(editDue)}
                  </span>
                  <span className="text-right text-gray-500">{signedMoney(editDue - beforeDue)}</span>

                  {type === "SALE" && (
                    <>
                      <span className="text-gray-600">Cost Amount</span>
                      <span className="text-right text-gray-500">{formatMoney(beforeCost)}</span>
                      <span className="text-right text-gray-900">{formatMoney(editCost)}</span>
                      <span className="text-right text-gray-500">{signedMoney(editCost - beforeCost)}</span>

                      <span className="font-semibold text-gray-900">Profit</span>
                      <span className="text-right text-gray-500">{formatMoney(beforeProfit)}</span>
                      <span
                        className={`text-right font-bold ${editProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatMoney(editProfit)}
                      </span>
                      <span
                        className={`text-right ${
                          Math.abs(editProfit - beforeProfit) < 0.005
                            ? "text-gray-500"
                            : editProfit > beforeProfit
                              ? "text-green-600"
                              : "text-red-600"
                        }`}
                      >
                        {signedMoney(editProfit - beforeProfit)}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-2.5 space-y-0.5 border-t border-sky-100 pt-2 text-xs text-gray-500">
                  {editEditedCount + editAddedCount + editRemoved.length === 0 ? (
                    <div>No item changes</div>
                  ) : (
                    <div>
                      {[
                        editEditedCount > 0 && `${editEditedCount} edited`,
                        editAddedCount > 0 && `${editAddedCount} added`,
                        editRemoved.length > 0 && `${editRemoved.length} removed`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {editRemoved.length > 0 && (
                        <span className="ml-1 text-red-600 line-through">
                          {editRemoved.map((it) => it.item.name).join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-gray-400">
                    Created {new Date(editingBill.createdAt).toLocaleString()}
                    {editingCreatedEdited &&
                      ` · Last edited ${new Date(editingBill.updatedAt).toLocaleString()}`}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Modal>
      )}

      {deletingBill && (
        <ConfirmDeleteModal
          title={`Delete ${typeLabel} Bill`}
          subtitle={`#${deletingBill.billNo}`}
          message={`You are about to permanently delete ${billTypeWord} bill #${deletingBill.billNo}.`}
          details={[
            { label: "Bill", value: `#${deletingBill.billNo}` },
            { label: "Date", value: deletingBill.date.slice(0, 10) },
            { label: "Account", value: deletingBill.account?.name || "Walk-in" },
            { label: "Payment", value: deletingBill.mode === "CASH" ? "Cash" : "Credit" },
            { label: "Total", value: formatMoney(deletingBill.total) },
            ...(deletingBill.total - deletingBill.paidAmount > 0
              ? [{ label: "Amount Due", value: formatMoney(deletingBill.total - deletingBill.paidAmount) }]
              : []),
          ]}
          effects={[
            deleteStockEffect,
            ...(deletingBill.account
              ? [
                  `The bill's total is taken out of ${deletingBill.account.name}'s ledger, so the account balance is recalculated.`,
                ]
              : []),
            ...(deletingBill.mode === "CASH" ? ["The cash amount is removed from the cash book."] : []),
            "The bill no longer counts in reports.",
          ]}
          onConfirm={() => confirmDeleteBill(deletingBill)}
          onClose={() => setDeletingBill(null)}
        >
          <SectionTitle className="mb-1 mt-4">Items</SectionTitle>
          <table className="w-full text-xs">
            <tbody>
              {deletingBill.items.map((it) => (
                <tr key={it.id} className="border-b border-sky-100 text-gray-700">
                  <td className="py-1.5 pr-2">{it.item.name}</td>
                  <td className="whitespace-nowrap py-1.5 pr-2 text-right">
                    {it.qty} <span className="text-gray-400">{it.item.unit}</span>
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right">{formatMoney(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ConfirmDeleteModal>
      )}

      {deleteAllOpen && (
        <ConfirmDeleteModal
          title={`Delete All ${typeLabel} Bills`}
          message={
            deleteAllSummary?.count === 0
              ? `There are no ${billTypeWord} bills to delete.`
              : `You are about to permanently delete every ${billTypeWord} bill, not just the ones listed on screen.`
          }
          confirmLabel="Delete All"
          confirmDisabled={deleteAllSummary === undefined || deleteAllSummary?.count === 0}
          details={[
            {
              label: "Bills to delete",
              value:
                deleteAllSummary === undefined
                  ? "Counting..."
                  : deleteAllSummary === null
                    ? "Unavailable"
                    : deleteAllSummary.count,
            },
            {
              label: "Combined total",
              value:
                deleteAllSummary === undefined
                  ? "Counting..."
                  : deleteAllSummary === null
                    ? "Unavailable"
                    : formatMoney(deleteAllSummary.total),
            },
          ]}
          effects={[
            "This ignores the date filter. Bills from every date are deleted.",
            deleteStockEffect,
            "Account ledgers, the cash book and reports are recalculated without these bills.",
          ]}
          onConfirm={confirmDeleteAll}
          onClose={() => setDeleteAllOpen(false)}
        />
      )}
    </div>
  );
}
