"use client";

import { useEffect, useState } from "react";
import { Card, FieldLabel, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { fetchJson } from "@/lib/fetchJson";

type Settings = {
  companyName: string;
  currency: string;
  address: string | null;
  phone: string | null;
  nextSaleNo: number;
  nextPurchNo: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100">
            <div>Sale Bill #: restarts from 1 every day</div>
            <div>Next Purchase Bill #: {settings.nextPurchNo}</div>
          </div>
        </div>
        {saved && (
          <div className="mt-4 rounded-lg bg-green-50 text-green-700 text-sm px-4 py-3">
            Settings saved.
          </div>
        )}
        <div className="mt-4">
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
