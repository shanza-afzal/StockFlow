"use client";

import { FieldLabel, Tabs, inputClass } from "@/components/ui";
import type { ReportPicker } from "@/lib/useReport";

export default function ReportPeriodPicker({ picker }: { picker: ReportPicker }) {
  const { view, setView, date, setDate, from, setFrom, to, setTo } = picker;

  return (
    <div className="flex flex-col gap-4 mb-6">
      <Tabs
        tabs={[
          { value: "DATE", label: "By Date" },
          { value: "RANGE", label: "Date Range" },
          { value: "ALL", label: "All Time" },
        ]}
        value={view}
        onChange={setView}
      />

      {view !== "ALL" && (
        <div className="flex flex-wrap gap-4">
          {view === "DATE" ? (
            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <FieldLabel>From</FieldLabel>
                <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <FieldLabel>To</FieldLabel>
                <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
