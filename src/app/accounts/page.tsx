"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  DangerButton,
  EmptyState,
  FieldLabel,
  PageHeader,
  PrimaryButton,
  Segmented,
  inputClass,
  selectClass,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson, parseJson } from "@/lib/fetchJson";

type AccountRow = {
  id: number;
  name: string;
  type: string;
  phone: string | null;
  address: string | null;
  balance: number;
};

const TYPES = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "BOTH", label: "Both" },
  { value: "CAPITAL", label: "Capital" },
  { value: "EXPENSE", label: "Expense" },
];

function emptyForm() {
  return { name: "", type: "CUSTOMER", phone: "", address: "", openingBalance: "" };
}

export default function AccountsPage() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [openingSide, setOpeningSide] = useState<"UDHAR" | "ADVANCE">("UDHAR");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetchJson<AccountRow[]>("/api/accounts").then((data) => {
      if (data) setRows(data);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) {
      setError("Account name is required.");
      return;
    }
    setSaving(true);
    try {
      const opening = Math.abs(Number(form.openingBalance) || 0);
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          openingBalance: openingSide === "UDHAR" ? opening : -opening,
        }),
      });
      const data = await parseJson<{ error?: string }>(res);
      if (!res.ok) {
        setError(data?.error || "Could not save the account.");
        return;
      }
      setForm(emptyForm());
      setOpeningSide("UDHAR");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this account?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const data = await parseJson<{ error?: string }>(res);
      alert(data?.error || "Could not delete account.");
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.address || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div>
      <PageHeader title="Accounts" />

      <Card className="p-6 mb-6">
        <div className="text-lg font-bold text-gray-900 mb-5">New Account</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <div>
            <FieldLabel>Name</FieldLabel>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <select
              className={selectClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Address</FieldLabel>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Opening Balance</FieldLabel>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass + " text-right"}
              value={form.openingBalance}
              placeholder="0.00"
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-5">
          <FieldLabel>This Opening Balance Is</FieldLabel>
          <Segmented
            options={[
              { value: "UDHAR", label: "They Owe You (Udhar)" },
              { value: "ADVANCE", label: "Already Paid (Advance)" },
            ]}
            value={openingSide}
            onChange={setOpeningSide}
            tone="red"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </PrimaryButton>
      </Card>

      <Card className="p-6">
        <div className="text-lg font-bold text-gray-900 mb-5">All Accounts</div>

        <div className="mb-5 max-w-md">
          <input
            className={inputClass}
            value={search}
            placeholder="Search by name, phone, or address"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <EmptyState>Loading...</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>No accounts found.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-left font-semibold px-4 py-3">Type</th>
                  <th className="text-left font-semibold px-4 py-3">Phone</th>
                  <th className="text-left font-semibold px-4 py-3">Address</th>
                  <th className="text-right font-semibold px-4 py-3">Balance</th>
                  <th className="w-40"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{r.type.toLowerCase()}</td>
                    <td className="px-4 py-3 text-gray-600">{r.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.address || "—"}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        r.balance > 0 ? "text-green-700" : r.balance < 0 ? "text-red-700" : "text-gray-400"
                      }`}
                    >
                      {formatMoney(Math.abs(r.balance))}
                      {r.balance !== 0 && (
                        <span className="text-xs font-normal ml-1 text-gray-400">
                          {r.balance > 0 ? "udhar" : "advance"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right flex gap-2 justify-end">
                      <Link
                        href={`/ledger/${r.id}`}
                        className="text-sm font-semibold text-blue-600 hover:underline px-2 py-1"
                      >
                        History
                      </Link>
                      <DangerButton onClick={() => handleDelete(r.id)}>Delete</DangerButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
