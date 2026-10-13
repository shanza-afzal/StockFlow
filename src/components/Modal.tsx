"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const sizeClass = {
  md: "max-w-md",
  lg: "max-w-xl",
};

// Dialogs can stack (a delete confirmation opened from a bill popup). Only the topmost one
// answers Escape, and the page stays scroll-locked until the last one closes.
const openDialogs: symbol[] = [];
let overflowBeforeLock = "";

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  // Pinned under the scrolling body, so the actions stay visible on long content.
  footer?: ReactNode;
  size?: keyof typeof sizeClass;
  // Turn off for dialogs holding unsaved input, so a stray click outside doesn't discard it.
  closeOnBackdrop?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Callers pass inline handlers; reading the latest through a ref keeps this dialog's place in
  // the stack from being reshuffled on every re-render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = Symbol();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && openDialogs[openDialogs.length - 1] === id) onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    if (openDialogs.length === 0) overflowBeforeLock = document.body.style.overflow;
    openDialogs.push(id);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openDialogs.splice(openDialogs.indexOf(id), 1);
      if (openDialogs.length === 0) document.body.style.overflow = overflowBeforeLock;
    };
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Rendered straight under <body> so printing can hide the rest of the page and print only
  // this dialog (see the data-print-root rule in globals.css).
  return createPortal(
    <div
      data-print-root
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:block print:bg-transparent print:p-0"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-[85vh] w-full ${sizeClass[size]} flex-col rounded-xl bg-white shadow-xl focus:outline-none print:max-h-none print:max-w-none print:shadow-none`}
      >
        <div className="flex items-start justify-between gap-4 rounded-t-xl border-b border-sky-100 bg-linear-to-r from-sky-50 to-white px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors print:hidden"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-sky-100 px-5 py-3 print:hidden">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
