"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  DangerButton,
  EmptyState,
  FieldLabel,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  TableScroll,
  Tabs,
  inputClass,
  selectClass,
  tableClass,
} from "@/components/ui";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import LowStockAlert, { StockBadge } from "@/components/LowStockAlert";
import { formatMoney } from "@/lib/calc";
import { fetchJson, parseJson } from "@/lib/fetchJson";
import { stockLevel } from "@/lib/stockLevel";

type StockRow = {
  id: number;
  name: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  value: number;
};

function emptyForm() {
  return { name: "", unit: "pcs", purchasePrice: "", salePrice: "", openingStock: "" };
}

type Tab = "CURRENT" | "NEW" | "UPDATE";

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("CURRENT");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [deleting, setDeleting] = useState<StockRow | null>(null);

  const [updateId, setUpdateId] = useState("");
  const [updateForm, setUpdateForm] = useState(emptyForm());
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSaving, setUpdateSaving] = useState(false);

  function load() {
    setLoading(true);
    fetchJson<StockRow[]>("/api/items").then((data) => {
      if (data) setRows(data);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const lowStockItems = useMemo(() => rows.filter((r) => stockLevel(r.stock) !== "OK"), [rows]);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase())),
    [rows, search]
  );

  async function handleAdd() {
    setError(null);
    if (!form.name.trim()) {
      setError("Item name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await parseJson<{ error?: string }>(res);
      if (!res.ok) {
        setError(data?.error || "Could not add item.");
        return;
      }
      setForm(emptyForm());
      load();
      setTab("CURRENT");
    } finally {
      setSaving(false);
    }
  }

  function startAdjust(row: StockRow) {
    setAdjustingId(row.id);
    setAdjustValue(String(row.stock));
  }

  async function saveAdjust(id: number) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStock: Number(adjustValue) }),
    });
    if (res.ok) {
      setAdjustingId(null);
      load();
    }
  }

  async function confirmDelete(row: StockRow): Promise<string | null> {
    const res = await fetch(`/api/items/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
      return null;
    }
    const data = await parseJson<{ error?: string }>(res);
    return data?.error || "Could not delete item.";
  }

  function selectForUpdate(idStr: string) {
    setUpdateId(idStr);
    setUpdateError(null);
    const row = rows.find((r) => r.id === Number(idStr));
    if (row) {
      setUpdateForm({
        name: row.name,
        unit: row.unit,
        purchasePrice: String(row.purchasePrice),
        salePrice: String(row.salePrice),
        openingStock: "",
      });
    } else {
      setUpdateForm(emptyForm());
    }
  }

  async function handleUpdateSave() {
    if (!updateId) {
      setUpdateError("Select an item to update.");
      return;
    }
    setUpdateSaving(true);
    setUpdateError(null);
    try {
      const { openingStock, ...rest } = updateForm;
      const res = await fetch(`/api/items/${updateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) {
        const data = await parseJson<{ error?: string }>(res);
        setUpdateError(data?.error || "Could not update item.");
        return;
      }
      load();
      setTab("CURRENT");
      setUpdateId("");
      setUpdateForm(emptyForm());
    } finally {
      setUpdateSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Stock" />

      <div className="mb-6">
        <Tabs
          tabs={[
            { value: "CURRENT", label: "Current Stock" },
            { value: "NEW", label: "New Item" },
            { value: "UPDATE", label: "Update Item" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "CURRENT" && !loading && <LowStockAlert items={lowStockItems} />}

      {tab === "CURRENT" && (
        <Card className="p-6">
          <input
            className={inputClass + " max-w-sm mb-4"}
            placeholder="Search by item name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <EmptyState>Loading...</EmptyState>
          ) : filteredRows.length === 0 ? (
            <EmptyState>No items found.</EmptyState>
          ) : (
            <TableScroll>
              <table className={tableClass}>
              <thead className="bg-sky-50 text-sky-700">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-right font-semibold px-4 py-3">Current Qty</th>
                  <th className="text-right font-semibold px-4 py-3">Sale Price</th>
                  <th className="w-48"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) =>
                  adjustingId === r.id ? (
                    <tr key={r.id} className="border-t border-sky-100 bg-sky-50/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-400">Unit: {r.unit}</div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="any"
                          className={inputClass + " text-right"}
                          value={adjustValue}
                          onChange={(e) => setAdjustValue(e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatMoney(r.salePrice)}</td>
                      <td className="px-4 py-2 text-right flex gap-2 justify-end">
                        <SecondaryButton className="px-2 py-1" onClick={() => saveAdjust(r.id)}>
                          Save
                        </SecondaryButton>
                        <SecondaryButton className="px-2 py-1" onClick={() => setAdjustingId(null)}>
                          Cancel
                        </SecondaryButton>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className="border-t border-sky-100 hover:bg-sky-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {r.name}
                          <StockBadge stock={r.stock} />
                        </div>
                        <div className="text-xs text-gray-400">Unit: {r.unit}</div>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          { OUT: "text-red-600", LOW: "text-amber-600", OK: "text-gray-900" }[stockLevel(r.stock)]
                        }`}
                      >
                        {r.stock}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatMoney(r.salePrice)}</td>
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        <SecondaryButton className="px-2 py-1" onClick={() => startAdjust(r)}>
                          Adjust Stock
                        </SecondaryButton>
                        <DangerButton onClick={() => setDeleting(r)}>Delete</DangerButton>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
              </table>
            </TableScroll>
          )}
        </Card>
      )}

      {tab === "NEW" && (
        <Card className="p-6 max-w-3xl">
          <div className="font-semibold text-gray-900 mb-4 border-b border-sky-100 pb-3">Add Item</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Item name"
              />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <input
                className={inputClass}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pcs"
              />
            </div>
            <div>
              <FieldLabel>Purchase Price</FieldLabel>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <FieldLabel>Sale Price</FieldLabel>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <FieldLabel>Opening Stock</FieldLabel>
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={form.openingStock}
                onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-5 border-t border-sky-100 pt-4">
            {error && <div className="mb-4 rounded-lg bg-rose-50 text-red-700 text-sm px-4 py-3">{error}</div>}
            <PrimaryButton onClick={handleAdd} disabled={saving}>
              {saving ? "Adding..." : "Add Item"}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {tab === "UPDATE" && (
        <Card className="p-6 max-w-3xl">
          <div className="font-semibold text-gray-900 mb-4 border-b border-sky-100 pb-3">Update Item</div>
          <div className="max-w-sm mb-4">
            <FieldLabel>Item</FieldLabel>
            <select className={selectClass} value={updateId} onChange={(e) => selectForUpdate(e.target.value)}>
              <option value="">Select an item</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {updateId && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input
                    className={inputClass}
                    value={updateForm.name}
                    onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Unit</FieldLabel>
                  <input
                    className={inputClass}
                    value={updateForm.unit}
                    onChange={(e) => setUpdateForm({ ...updateForm, unit: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Purchase Price</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={inputClass}
                    value={updateForm.purchasePrice}
                    onChange={(e) => setUpdateForm({ ...updateForm, purchasePrice: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Sale Price</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={inputClass}
                    value={updateForm.salePrice}
                    onChange={(e) => setUpdateForm({ ...updateForm, salePrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-5 border-t border-sky-100 pt-4">
                {updateError && (
                  <div className="mb-4 rounded-lg bg-rose-50 text-red-700 text-sm px-4 py-3">{updateError}</div>
                )}
                <PrimaryButton onClick={handleUpdateSave} disabled={updateSaving}>
                  {updateSaving ? "Saving..." : "Save Changes"}
                </PrimaryButton>
              </div>
            </>
          )}
        </Card>
      )}

      {deleting && (
        <ConfirmDeleteModal
          title="Delete Item"
          subtitle={deleting.name}
          message="You are about to permanently delete this item from your stock."
          details={[
            { label: "Name", value: deleting.name },
            { label: "Unit", value: deleting.unit },
            { label: "Current Qty", value: deleting.stock },
            { label: "Purchase Price", value: formatMoney(deleting.purchasePrice) },
            { label: "Sale Price", value: formatMoney(deleting.salePrice) },
            { label: "Stock Value", value: formatMoney(deleting.value) },
          ]}
          effects={[
            `The item and its remaining stock (${deleting.stock} ${deleting.unit}) are removed from your inventory.`,
            "An item that already appears on a bill can't be deleted. If that's the case, you'll be told here.",
          ]}
          onConfirm={() => confirmDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
