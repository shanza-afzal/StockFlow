"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Card,
  DangerButton,
  EmptyState,
  FieldLabel,
  PageHeader,
  PrimaryButton,
  TableScroll,
  blurOnWheel,
  inputClass,
  selectClass,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson, parseJson } from "@/lib/fetchJson";

type Account = { id: number; name: string; balance: number };
type Entry = {
  id: number;
  jvNo: number;
  date: string;
  amount: number;
  description: string | null;
  fromAccount: { id: number; name: string } | null;
  toAccount: { id: number; name: string } | null;
};

type Voucher = {
  jvNo: number;
  date: string;
  total: number;
  legs: Entry[];
};

type Row = {
  key: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string;
};

function emptyRow(): Row {
  return { key: Math.random().toString(36).slice(2), fromAccountId: "", toAccountId: "", amount: "", description: "" };
}

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
}

export default function AmountEntryPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  function loadEntries() {
    setLoading(true);
    fetchJson<Entry[]>("/api/amount-entries").then((data) => {
      if (data) setEntries(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchJson<Account[]>("/api/accounts").then((data) => {
      if (data) setAccounts(data);
    });
    loadEntries();
  }, []);

  const vouchers = useMemo<Voucher[]>(() => {
    const byJv = new Map<number, Entry[]>();
    for (const e of entries) {
      const list = byJv.get(e.jvNo) || [];
      list.push(e);
      byJv.set(e.jvNo, list);
    }
    return Array.from(byJv.entries())
      .map(([jvNo, legs]) => ({
        jvNo,
        date: legs[0].date,
        total: legs.reduce((s, l) => s + l.amount, 0),
        legs,
      }))
      .sort((a, b) => b.jvNo - a.jvNo);
  }, [entries]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    const validRows = rows.filter((r) => Number(r.amount) > 0);
    if (validRows.length === 0) {
      setError("Add at least one row with an amount greater than zero.");
      return;
    }
    for (const r of validRows) {
      if (r.fromAccountId === r.toAccountId) {
        setError("Paying and receiving account must be different on every row.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/amount-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          rows: validRows.map((r) => ({
            fromAccountId: r.fromAccountId ? Number(r.fromAccountId) : null,
            toAccountId: r.toAccountId ? Number(r.toAccountId) : null,
            amount: Number(r.amount),
            description: r.description,
          })),
        }),
      });
      const data = await parseJson<{ error?: string } | Entry[]>(res);
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error || "Could not save the entries.");
        return;
      }
      if (!data) {
        setError("Could not save the entries.");
        return;
      }
      setSuccess(`JV #${(data as Entry[])[0].jvNo} saved.`);
      setRows([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
      loadEntries();
      fetchJson<Account[]>("/api/accounts").then((d) => {
        if (d) setAccounts(d);
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVoucher(jvNo: number) {
    if (!confirm(`Delete JV #${jvNo}? This cannot be undone.`)) return;
    const res = await fetch(`/api/amount-entries?jvNo=${jvNo}`, { method: "DELETE" });
    if (res.ok) {
      loadEntries();
      fetchJson<Account[]>("/api/accounts").then((d) => {
        if (d) setAccounts(d);
      });
    }
  }

  return (
    <div>
      <PageHeader title="Amount Entry" />
      <p className="text-sm text-gray-500 -mt-4 mb-6">
        Move money between two accounts — e.g. an owner deposit, or a transfer between accounts. Every
        save is recorded as one Journal Voucher (JV).
      </p>

      <Card className="p-6 mb-6">
        <div className="max-w-xs mb-4">
          <FieldLabel>Date</FieldLabel>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <TableScroll>
          <table className={tableClass}>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Paying Account</th>
                <th className="text-left font-semibold px-3 py-2">Receiving Account</th>
                <th className="text-right font-semibold px-3 py-2 w-32">Amount</th>
                <th className="text-left font-semibold px-3 py-2">Details</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <select
                      className={selectClass}
                      value={row.fromAccountId}
                      onChange={(e) => updateRow(row.key, { fromAccountId: e.target.value })}
                    >
                      <option value="">Cash</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={selectClass}
                      value={row.toAccountId}
                      onChange={(e) => updateRow(row.key, { toAccountId: e.target.value })}
                    >
                      <option value="">Cash</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={inputClass + " text-right"}
                      value={row.amount}
                      placeholder="0.00"
                      onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                      onWheel={blurOnWheel}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className={inputClass}
                      value={row.description}
                      placeholder="e.g. owner deposit"
                      onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>

        <div className="mt-4">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            + Add Row
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
        {success && <div className="mt-4 rounded-lg bg-green-50 text-green-700 text-sm px-4 py-3">{success}</div>}
        <div className="mt-4">
          <PrimaryButton onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save JV"}
          </PrimaryButton>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState>Loading...</EmptyState>
        ) : vouchers.length === 0 ? (
          <EmptyState>No journal vouchers yet.</EmptyState>
        ) : (
          <TableScroll>
            <table className={tableClass}>
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">JV #</th>
                  <th className="text-left font-semibold px-4 py-3">Date</th>
                  <th className="text-left font-semibold px-4 py-3">Legs</th>
                  <th className="text-right font-semibold px-4 py-3">Total</th>
                  <th className="w-40"></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <Fragment key={v.jvNo}>
                    <tr
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpanded(expanded === v.jvNo ? null : v.jvNo)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">JV #{v.jvNo}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(v.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">{v.legs.length}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatMoney(v.total)}</td>
                      <td className="px-4 py-3 text-right flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(expanded === v.jvNo ? null : v.jvNo);
                          }}
                          className="text-sm font-semibold text-blue-600 hover:underline px-2 py-1"
                        >
                          View
                        </button>
                        <DangerButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVoucher(v.jvNo);
                          }}
                        >
                          Delete
                        </DangerButton>
                      </td>
                    </tr>
                    {expanded === v.jvNo && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={5} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-gray-500">
                              <tr>
                                <th className="text-left font-semibold py-1">Paying Account</th>
                                <th className="text-left font-semibold py-1">Receiving Account</th>
                                <th className="text-left font-semibold py-1">Details</th>
                                <th className="text-right font-semibold py-1">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {v.legs.map((leg) => (
                                <tr key={leg.id} className="border-t border-gray-200">
                                  <td className="py-1">{leg.fromAccount?.name || "Cash"}</td>
                                  <td className="py-1">{leg.toAccount?.name || "Cash"}</td>
                                  <td className="py-1">{leg.description || "—"}</td>
                                  <td className="py-1 text-right">{formatMoney(leg.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </div>
  );
}
