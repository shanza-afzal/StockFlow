"use client";

import { useEffect, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { Card, FieldLabel, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { fetchJson, parseJson } from "@/lib/fetchJson";

type Settings = {
  companyName: string;
  currency: string;
  address: string | null;
  phone: string | null;
  nextSaleNo: number;
  nextPurchNo: number;
};

type DataCounts = { bills: number; entries: number; accounts: number; items: number };

const CONFIRM_WORD = "DELETE";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [wiped, setWiped] = useState(false);

  useEffect(() => {
    fetchJson<Settings>("/api/settings").then((data) => {
      if (data) setSettings(data);
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  // Fetch the live counts first so the dialog shows exactly what is about to disappear.
  async function openDeleteAll() {
    setLoadingCounts(true);
    setCountsError(null);
    setWiped(false);
    try {
      const data = await fetchJson<DataCounts>("/api/settings/data");
      if (data) {
        setConfirmText("");
        setCounts(data);
      } else {
        setCountsError("Could not check your data. Please try again.");
      }
    } catch {
      setCountsError("Could not check your data. Please try again.");
    } finally {
      setLoadingCounts(false);
    }
  }

  async function confirmDeleteAll(): Promise<string | null> {
    const res = await fetch("/api/settings/data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: CONFIRM_WORD }),
    });
    if (!res.ok) {
      const data = await parseJson<{ error?: string }>(res);
      return data?.error || "Could not delete the data.";
    }
    // Numbering restarted, so refresh the "next purchase bill" figure shown above.
    const fresh = await fetchJson<Settings>("/api/settings");
    if (fresh) setSettings(fresh);
    setWiped(true);
    return null;
  }

  if (!settings) return null;

  return (
    <div>
      <PageHeader title="Settings" />

      <Card className="p-6 max-w-xl">
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>Company Name</FieldLabel>
            <input
              className={inputClass}
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Currency Symbol</FieldLabel>
            <input
              className={inputClass}
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Address</FieldLabel>
            <input
              className={inputClass}
              value={settings.address || ""}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <input
              className={inputClass}
              value={settings.phone || ""}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500 pt-2 border-t border-sky-100">
            <div>Sale Bill #: restarts from 1 every day</div>
            <div>Next Purchase Bill #: {settings.nextPurchNo}</div>
          </div>
        </div>
        {saved && (
          <div className="mt-4 rounded-lg bg-emerald-50 text-green-700 text-sm px-4 py-3">
            Settings saved.
          </div>
        )}
        <div className="mt-4">
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </PrimaryButton>
        </div>
      </Card>

      <Card className="mt-6 p-6 max-w-xl border-red-200!">
        <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
        <p className="mt-1 text-sm text-gray-600">
          Delete all data removes every bill, journal entry, account and stock item in one go, and
          restarts bill numbering. Your company name, currency, address and phone are kept.
        </p>
        {wiped && (
          <div className="mt-4 rounded-lg bg-emerald-50 text-green-700 text-sm px-4 py-3">
            All data has been deleted.
          </div>
        )}
        {countsError && (
          <div role="alert" className="mt-4 rounded-lg bg-rose-50 text-red-700 text-sm px-4 py-3">
            {countsError}
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={openDeleteAll}
            disabled={loadingCounts}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingCounts ? "Checking..." : "Delete All Data"}
          </button>
        </div>
      </Card>

      {counts && (
        <ConfirmDeleteModal
          title="Delete All Data"
          message="You are about to permanently delete everything you have entered in StockFlow."
          details={[
            { label: "Bills (sale & purchase)", value: counts.bills },
            { label: "Journal entries", value: counts.entries },
            { label: "Accounts", value: counts.accounts },
            { label: "Stock items", value: counts.items },
          ]}
          effects={[
            "All bills, journal entries, accounts and stock items are removed for good.",
            "Cash book, ledgers, reports and stock levels start again from zero.",
            "Bill and journal numbers restart from 1.",
            "Company name, currency, address and phone stay as they are.",
          ]}
          confirmLabel="Delete Everything"
          confirmDisabled={confirmText !== CONFIRM_WORD}
          onConfirm={confirmDeleteAll}
          onClose={() => setCounts(null)}
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
