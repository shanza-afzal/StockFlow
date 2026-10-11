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
import { formatMoney } from "@/lib/calc";
import { fetchJson, parseJson } from "@/lib/fetchJson";

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

  async function handleDelete(id: number) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const data = await parseJson<{ error?: string }>(res);
      alert(data?.error || "Could not delete item.");
    }
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
              <thead className="bg-gray-50 text-gray-500">
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
                    <tr key={r.id} className="border-t border-gray-100 bg-blue-50/40">
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
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-400">Unit: {r.unit}</div>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          r.stock <= 0 ? "text-red-600" : r.stock <= 5 ? "text-amber-600" : "text-gray-900"
                        }`}
                      >
                        {r.stock}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatMoney(r.salePrice)}</td>
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        <SecondaryButton className="px-2 py-1" onClick={() => startAdjust(r)}>
                          Adjust Stock
                        </SecondaryButton>
                        <DangerButton onClick={() => handleDelete(r.id)}>Delete</DangerButton>
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
          <div className="font-semibold text-gray-900 mb-4">Add Item</div>
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
          {error && <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
          <div className="mt-4">
            <PrimaryButton onClick={handleAdd} disabled={saving}>
              {saving ? "Adding..." : "Add Item"}
            </PrimaryButton>
          </div>
        </Card>
      )}

      {tab === "UPDATE" && (
        <Card className="p-6 max-w-3xl">
          <div className="font-semibold text-gray-900 mb-4">Update Item</div>
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
              {updateError && (
                <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{updateError}</div>
              )}
              <div className="mt-4">
                <PrimaryButton onClick={handleUpdateSave} disabled={updateSaving}>
                  {updateSaving ? "Saving..." : "Save Changes"}
                </PrimaryButton>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
