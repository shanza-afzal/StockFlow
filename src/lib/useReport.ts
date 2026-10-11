import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

export type ReportView = "DATE" | "RANGE" | "ALL";

export type ReportPicker = {
  view: ReportView;
  setView: (view: ReportView) => void;
  date: string;
  setDate: (date: string) => void;
  from: string;
  setFrom: (from: string) => void;
  to: string;
  setTo: (to: string) => void;
};

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// Loads a report for the day / date range / all-time period chosen in the picker. The page opens
// on today.
export function useReport<T>(endpoint: string) {
  const [view, setView] = useState<ReportView>("DATE");
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  // The response is kept with the query it answered, so a change of date/view reads as
  // "loading" until its own response lands and never shows another period's figures.
  const [result, setResult] = useState<{ query: string; data: T | null } | null>(null);

  const params = new URLSearchParams();
  if (view === "DATE") {
    params.set("from", date);
    params.set("to", date);
  } else if (view === "RANGE") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  const query = params.toString();

  useEffect(() => {
    let cancelled = false;
    fetchJson<T>(`${endpoint}?${query}`).then((d) => {
      if (!cancelled) setResult({ query, data: d });
    });
    return () => {
      cancelled = true;
    };
  }, [endpoint, query]);

  const loading = result?.query !== query;
  const data = loading ? null : result.data;
  const picker: ReportPicker = { view, setView, date, setDate, from, setFrom, to, setTo };

  return {
    picker,
    data,
    loading,
    // Bill numbers repeat day to day, so the bill tables show a Date column outside the day view.
    showDate: view !== "DATE",
    // Completes "No sales ..." style empty messages.
    period: view === "DATE" ? "on this date" : view === "RANGE" ? "in this date range" : "recorded yet",
  };
}

// Summing fractional quantities can leave float noise (0.1 + 0.2), so trim it for display.
export function formatQty(n: number) {
  return String(Number(n.toFixed(3)));
}
