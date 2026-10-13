"use client";

import { ReactNode, useState } from "react";
import Modal from "@/components/Modal";
import { SecondaryButton } from "@/components/ui";

export type DeleteDetail = { label: string; value: ReactNode };

// The one popup every delete goes through: what is about to be deleted, what that will change,
// and (if the server refuses) why, all without leaving the dialog.
export default function ConfirmDeleteModal({
  title,
  subtitle,
  message,
  details = [],
  effects = [],
  children,
  confirmLabel = "Delete",
  confirmDisabled = false,
  onConfirm,
  onClose,
}: {
  title: string;
  subtitle?: string;
  message: ReactNode;
  // Facts about the thing being deleted, shown as label/value rows.
  details?: DeleteDetail[];
  // Plain-language consequences, shown as a bulleted "What will happen" list.
  effects?: string[];
  // Extra content under the details, e.g. the items on a bill.
  children?: ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  // Does the delete. Resolve to null on success (the dialog then closes) or to an error message
  // to show in the dialog.
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!busy) onClose();
  }

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      const failure = await onConfirm();
      if (failure) setError(failure);
      else onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={close}
      closeOnBackdrop={!busy}
      footer={
        <div className="flex items-center justify-end gap-2">
          <SecondaryButton onClick={close} disabled={busy}>
            Cancel
          </SecondaryButton>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || confirmDisabled}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-base font-bold text-red-600"
        >
          !
        </div>
        <p className="pt-1.5 text-sm text-gray-700">{message}</p>
      </div>

      {details.length > 0 && (
        <dl className="mt-4 divide-y divide-sky-100 rounded-lg bg-sky-50 px-4 py-1 text-sm">
          {details.map((d) => (
            <div key={d.label} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-gray-500">{d.label}</dt>
              <dd className="min-w-0 break-words text-right font-medium text-gray-900">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {children}

      {effects.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            What will happen
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {effects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm font-semibold text-red-600">This cannot be undone.</p>

      {error && (
        <div role="alert" className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </Modal>
  );
}
