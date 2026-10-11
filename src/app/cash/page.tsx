"use client";

import { useEffect, useState } from "react";
import {
  Card,
  EmptyState,
  FieldLabel,
  HeroCard,
  PageHeader,
  PrimaryButton,
  Segmented,
  StatCard,
  TableScroll,
  inputClass,
  selectClass,
  tableClass,
} from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson, parseJson } from "@/lib/fetchJson";

type CashRow = {
  date: string;
  description: string;
  in: number;
  out: number;
  balance: number;
};

type CashData = {
  rows: CashRow[];
  totalIn: number;
  totalOut: number;
  inHand: number;
};

type Account = { id: number; name: string };

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function CashPage() {
  const [data, setData] = useState<CashData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchJson<CashData>("/api/cash").then((data) => {
      if (data) setData(data);
    });
  }

  useEffect(() => {
    load();
    fetchJson<Account[]>("/api/accounts").then((data) => {
      if (data) setAccounts(data);
    });
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          accountId: accountId ? Number(accountId) : null,
          amount: Number(amount),
          date,
          details,
        }),
      });
      const body = await parseJson<{ error?: string }>(res);
      if (!res.ok) {
        setError(body?.error || "Could not save the entry.");
        return;
      }
      setAccountId("");
      setAmount("");
      setDetails("");
      load();
    } finally {
      setSaving(false);
    }
  }

  const rows = data?.rows ?? [];

  return (
    <div>
      <PageHeader title="Cash" />

      <div className="mb-4">
        <HeroCard
          label="Cash In Hand"
          value={formatMoney(data?.inHand ?? 0)}
          tone={(data?.inHand ?? 0) < 0 ? "red" : "green"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Cash In" value={formatMoney(data?.totalIn ?? 0)} center />
        <StatCard label="Cash Out" value={formatMoney(data?.totalOut ?? 0)} center />
      </div>

      <Card className="p-6 mb-6">
        <div className="text-lg font-bold text-gray-900 mb-4">Add Cash In / Cash Out</div>

        <div className="mb-5">
          <Segmented
            options={[
              { value: "IN", label: "Cash In" },
              { value: "OUT", label: "Cash Out" },
            ]}
            value={direction}
            onChange={setDirection}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FieldLabel>{direction === "IN" ? "Received From" : "Paid To"}</FieldLabel>
            <select
              className={selectClass}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Amount</FieldLabel>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass + " text-right"}
              value={amount}
              placeholder="0.00"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
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
            <FieldLabel>Details</FieldLabel>
            <input
              className={inputClass}
              value={details}
              placeholder="Optional note"
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        <div className="mt-5">
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Entry"}
          </PrimaryButton>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {!data ? (
          <EmptyState>Loading...</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>No cash transactions yet.</EmptyState>
        ) : (
          <TableScroll>
            <table className={tableClass}>
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Date</th>
                <th className="text-left font-semibold px-4 py-3">Details</th>
                <th className="text-right font-semibold px-4 py-3">Cash In</th>
                <th className="text-right font-semibold px-4 py-3">Cash Out</th>
                <th className="text-right font-semibold px-4 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-900">{r.description}</td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {r.in > 0 ? formatMoney(r.in) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {r.out > 0 ? formatMoney(r.out) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatMoney(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </div>
  );
}
