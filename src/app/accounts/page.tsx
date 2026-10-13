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
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
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

type DeleteAllPreview = { total: number; deletable: number; kept: number };

const CONFIRM_WORD = "DELETE";

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
  const [deleting, setDeleting] = useState<AccountRow | null>(null);
  const [deleteAll, setDeleteAll] = useState<DeleteAllPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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

  async function confirmDelete(row: AccountRow): Promise<string | null> {
    const res = await fetch(`/api/accounts/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
      return null;
    }
    const data = await parseJson<{ error?: string }>(res);
    return data?.error || "Could not delete account.";
  }

  // Ask the server first so the dialog shows exactly how many accounts will go and how many stay.
  async function openDeleteAll() {
    setNotice(null);
    setLoadingPreview(true);
    try {
      const preview = await fetchJson<DeleteAllPreview>("/api/accounts/delete-all");
      if (preview) {
        setConfirmText("");
        setDeleteAll(preview);
      } else {
        setNotice({ tone: "error", text: "Could not check your accounts. Please try again." });
      }
    } catch {
      setNotice({ tone: "error", text: "Could not check your accounts. Please try again." });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function confirmDeleteAll(): Promise<string | null> {
    const res = await fetch("/api/accounts/delete-all", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: CONFIRM_WORD }),
    });
    const data = await parseJson<{ error?: string; deleted?: number; kept?: number }>(res);
    if (!res.ok) return data?.error || "Could not delete the accounts.";
    const deleted = data?.deleted ?? 0;
    const kept = data?.kept ?? 0;
    setNotice({
      tone: "ok",
      text:
        `Deleted ${deleted} ${deleted === 1 ? "account" : "accounts"}.` +
        (kept > 0 ? ` ${kept} kept because they have bills or journal entries.` : ""),
    });
    load();
    return null;
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
        <div className="text-lg font-bold text-gray-900 mb-5 border-b border-sky-100 pb-4">New Account</div>

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

        <div className="border-t border-sky-100 pt-4">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 text-red-700 text-sm px-4 py-3">{error}</div>
          )}

          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </PrimaryButton>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-sky-100 pb-4">
          <div className="text-lg font-bold text-gray-900">All Accounts</div>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={openDeleteAll}
              disabled={loadingPreview}
              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingPreview ? "Checking..." : "Delete All Accounts"}
            </button>
          )}
        </div>

        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={`mb-5 rounded-lg text-sm px-4 py-3 ${
              notice.tone === "ok" ? "bg-emerald-50 text-green-700" : "bg-rose-50 text-red-700"
            }`}
          >
            {notice.text}
          </div>
        )}

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
              <thead className="bg-sky-50 text-sky-700">
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
                  <tr key={r.id} className="border-t border-sky-100 hover:bg-sky-50">
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
                      <DangerButton onClick={() => setDeleting(r)}>Delete</DangerButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleting && (
        <ConfirmDeleteModal
          title="Delete Account"
          subtitle={deleting.name}
          message="You are about to permanently delete this account."
          details={[
            { label: "Name", value: deleting.name },
            { label: "Type", value: <span className="capitalize">{deleting.type.toLowerCase()}</span> },
            { label: "Phone", value: deleting.phone || "—" },
            { label: "Address", value: deleting.address || "—" },
            {
              label: "Balance",
              value:
                deleting.balance === 0
                  ? formatMoney(0)
                  : `${formatMoney(Math.abs(deleting.balance))} ${deleting.balance > 0 ? "udhar" : "advance"}`,
            },
          ]}
          effects={[
            "The account and its opening balance are removed for good.",
            "An account that already has bills or journal entries can't be deleted. If that's the case, you'll be told here.",
          ]}
          onConfirm={() => confirmDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}

      {deleteAll && (
        <ConfirmDeleteModal
          title="Delete All Accounts"
          message={
            deleteAll.deletable === 0
              ? "None of your accounts can be deleted, because every one of them has bills or journal entries."
              : "You are about to permanently delete every account that has no bills or journal entries."
          }
          details={[
            { label: "Total accounts", value: deleteAll.total },
            { label: "Will be deleted", value: deleteAll.deletable },
            { label: "Will be kept (in use)", value: deleteAll.kept },
          ]}
          effects={[
            "Accounts without any bills or journal entries are removed for good, along with their opening balances.",
            "Accounts that have bills or journal entries are kept, so ledgers, cash book and reports stay correct.",
            "Bills, journal entries and stock items are not touched.",
          ]}
          confirmLabel="Delete Accounts"
          confirmDisabled={deleteAll.deletable === 0 || confirmText !== CONFIRM_WORD}
          onConfirm={confirmDeleteAll}
          onClose={() => setDeleteAll(null)}
        >
          <div className="mt-4">
            <FieldLabel>
              Type <span className="font-mono text-red-600">{CONFIRM_WORD}</span> to confirm
            </FieldLabel>
            <input
              className={inputClass}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
