"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, EmptyState, PageHeader, StatCard, inputClass } from "@/components/ui";
import { formatMoney } from "@/lib/calc";
import { fetchJson } from "@/lib/fetchJson";

type Summary = {
  sales: number;
  purchases: number;
  salesProfit: number;
  expenses: number;
  netProfit: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  saleBillCount: number;
  purchaseBillCount: number;
  expenseCount: number;
};

type Progress = {
  date: string;
  today: Summary;
  allTime: Summary;
  period: Summary;
  receivable: number;
  payable: number;
};

function localDateStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatLongDate(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Colour is reserved for meaning: a figure turns red only when it is a loss.
const signTone = (n: number) => (n < 0 ? "red" : "default");

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <p className="text-sm text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

// The two headline numbers: net profit, and the sales profit and expenses it is made of.
function ProfitHero({ title, caption, data }: { title: string; caption: string; data: Summary }) {
  const loss = data.netProfit < 0;
  const hasActivity = data.sales !== 0 || data.expenses !== 0;

  // How much of the sales profit is left after paying expenses.
  const kept = data.salesProfit > 0 ? Math.max(0, Math.min(100, (data.netProfit / data.salesProfit) * 100)) : 0;
  let verdict = "No sales or expenses recorded yet";
  if (hasActivity) {
    if (data.salesProfit <= 0 && data.expenses > 0) verdict = "No sales profit to cover the expenses";
    else if (loss) verdict = "Expenses are higher than sales profit";
    else if (data.expenses === 0) verdict = "No expenses — all sales profit is kept";
    else verdict = `${kept.toFixed(0)}% of sales profit is kept after expenses`;
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{caption}</div>
        </div>
        {hasActivity && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            <span className={`h-1.5 w-1.5 rounded-full ${loss ? "bg-rose-500" : "bg-emerald-500"}`} />
            {loss ? "Loss" : "Profit"}
          </span>
        )}
      </div>

      <div className={`mt-4 text-4xl font-bold tracking-tight break-all ${loss ? "text-red-600" : "text-gray-900"}`}>
        {formatMoney(data.netProfit)}
      </div>

      <dl className="mt-5 grid grid-cols-2 divide-x divide-sky-100 border-t border-sky-100 pt-4 text-sm">
        <div className="pr-4">
          <dt className="text-xs text-gray-500">Sales Profit</dt>
          <dd className="mt-0.5 font-semibold text-gray-900 break-all">{formatMoney(data.salesProfit)}</dd>
        </div>
        <div className="pl-4">
          <dt className="text-xs text-gray-500">Expenses</dt>
          <dd className="mt-0.5 font-semibold text-gray-900 break-all">− {formatMoney(data.expenses)}</dd>
        </div>
      </dl>

      {hasActivity && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-sky-100 overflow-hidden">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${kept}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-2">{verdict}</div>
        </div>
      )}
      {!hasActivity && <div className="text-xs text-gray-500 mt-4">{verdict}</div>}
    </Card>
  );
}

function MetricCard({
  label,
  value,
  negative = false,
  lines,
}: {
  label: string;
  value: string;
  negative?: boolean;
  lines: string[];
}) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-2 break-all ${negative ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="mt-3 border-t border-sky-100 pt-3 flex flex-col gap-0.5">
        {lines.map((line) => (
          <div key={line} className="text-xs text-gray-500">
            {line}
          </div>
        ))}
      </div>
    </Card>
  );
}

// One row of the comparison: sales profit on the left, expenses on the right, for the same span of time.
function ProfitVsExpenseRow({ heading, prefix, s }: { heading: string; prefix: string; s: Summary }) {
  const margin = s.sales > 0 ? ` · ${((s.salesProfit / s.sales) * 100).toFixed(1)}% margin` : "";
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{heading}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          label={`${prefix} Sales Profit`}
          value={formatMoney(s.salesProfit)}
          negative={s.salesProfit < 0}
          lines={[`From sales of ${formatMoney(s.sales)}`, `${plural(s.saleBillCount, "sale bill")}${margin}`]}
        />
        <MetricCard
          label={`${prefix} Expense`}
          value={formatMoney(s.expenses)}
          lines={[s.expenseCount === 0 ? "No expenses recorded" : plural(s.expenseCount, "expense payment")]}
        />
      </div>
    </div>
  );
}

export default function ProgressReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // The last response and the range it was fetched for. Keeping the previous response on screen
  // while a new range loads avoids blanking the whole page on every date change.
  const [result, setResult] = useState<{ key: string; data: Progress | null } | null>(null);

  const key = `${from}|${to}`;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ today: localDateStr() });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetchJson<Progress>(`/api/reports/progress?${params.toString()}`).then((d) => {
      if (!cancelled) setResult((prev) => ({ key, data: d ?? prev?.data ?? null }));
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, key]);

  const data = result?.data ?? null;
  const loading = result?.key !== key;
  const period = data?.period;

  return (
    <div>
      <PageHeader
        title="Progress Report"
        actions={
          data && (
            <span className="rounded-lg border border-sky-100 bg-white px-3 py-1.5 text-sm text-gray-600">
              {formatLongDate(data.date)}
            </span>
          )
        }
      />

      {!data ? (
        <EmptyState>{loading ? "Loading..." : "Could not load the report. Please refresh the page."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ProfitHero title="Today's Profit" caption="Net profit made today" data={data.today} />
              <ProfitHero title="Total Profit" caption="Net profit since the start" data={data.allTime} />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Net profit = Sales profit − Expenses. Sales profit is what you sold for minus what those goods cost you.
            </p>
          </section>

          <section className="border-t border-sky-100 pt-8">
            <SectionTitle title="Sales Profit & Expenses" />
            <div className="flex flex-col gap-6">
              <ProfitVsExpenseRow heading="Today" prefix="Today's" s={data.today} />
              <ProfitVsExpenseRow heading="Since the start" prefix="Total" s={data.allTime} />
            </div>
            {data.allTime.expenseCount === 0 && (
              <p className="text-xs text-gray-500 mt-3 rounded-lg bg-sky-50 border border-sky-100 px-4 py-3">
                No expenses have been recorded yet. To record one, go to{" "}
                <Link href="/amount-entry" className="font-semibold text-blue-600 hover:underline">
                  Amount Entry
                </Link>{" "}
                and pay from Cash (or any account) to an account of type <b>Expense</b>.
              </p>
            )}
          </section>

          <section className="border-t border-sky-100 pt-8">
            <SectionTitle
              title="Custom Period"
              hint="Pick dates to look at any stretch of time. The figures above are not affected."
            />

            <Card className="p-4 flex flex-wrap gap-4 items-end mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
                <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
                <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="text-xs text-gray-400">Leave blank for all-time.</div>
            </Card>

            {period && (
              <div className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
                <Card className="p-6">
                  <div className="font-semibold text-gray-900 mb-4 border-b border-sky-100 pb-3">Business Activity</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                      label="Sales"
                      value={formatMoney(period.sales)}
                      sub={plural(period.saleBillCount, "bill")}
                      accent="emerald"
                    />
                    <StatCard
                      label="Purchases"
                      value={formatMoney(period.purchases)}
                      sub={plural(period.purchaseBillCount, "bill")}
                      accent="violet"
                    />
                    <StatCard
                      label="Sales Profit"
                      value={formatMoney(period.salesProfit)}
                      tone={signTone(period.salesProfit)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <StatCard
                      label="Expenses"
                      value={formatMoney(period.expenses)}
                      sub={plural(period.expenseCount, "payment")}
                      accent="amber"
                    />
                    <StatCard
                      label="Net Profit"
                      value={formatMoney(period.netProfit)}
                      sub="Sales profit − Expenses"
                      tone={signTone(period.netProfit)}
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="font-semibold text-gray-900 mb-4 border-b border-sky-100 pb-3">Cash Flow</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Cash In" value={formatMoney(period.cashIn)} accent="emerald" />
                    <StatCard label="Cash Out" value={formatMoney(period.cashOut)} accent="rose" />
                    <StatCard
                      label="Net Cash Flow"
                      value={formatMoney(period.netCashFlow)}
                      tone={signTone(period.netCashFlow)}
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="font-semibold text-gray-900 mb-4 border-b border-sky-100 pb-3">
                    Outstanding (as of today)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard label="Receivable" value={formatMoney(data.receivable)} accent="emerald" />
                    <StatCard label="Payable" value={formatMoney(data.payable)} accent="rose" />
                  </div>
                </Card>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
