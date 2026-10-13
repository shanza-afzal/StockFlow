import { ReactNode } from "react";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
      {actions}
    </div>
  );
}

// Tables keep their column layout on small screens and scroll sideways instead
// of collapsing, so figures stay comparable row to row.
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export const tableClass = "w-full min-w-[640px] text-sm";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-sky-100 bg-white shadow-sm shadow-sky-100/60 print:shadow-none ${className}`}>
      {children}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-1.5">{children}</label>;
}

export const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export const selectClass = inputClass + " bg-white";

// Denser variants for fields inside tables and dialogs.
export const compactInputClass =
  "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export const compactSelectClass = compactInputClass + " bg-white";

// A focused number input changes its value when the mouse wheel scrolls over it.
// Dropping focus on wheel lets the page scroll and leaves the typed value alone.
export const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-rose-50 px-2 py-1 text-sm font-medium transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Soft pastel card backgrounds. Written out in full so Tailwind can see every class.
const accentClasses = {
  emerald: "border-emerald-100 bg-linear-to-br from-emerald-50 to-white",
  rose: "border-rose-100 bg-linear-to-br from-rose-50 to-white",
  sky: "border-sky-100 bg-linear-to-br from-sky-50 to-white",
  amber: "border-amber-100 bg-linear-to-br from-amber-50 to-white",
  violet: "border-violet-100 bg-linear-to-br from-violet-50 to-white",
};

type Accent = keyof typeof accentClasses;

// Without an explicit accent a card is tinted to match its tone, so figures that are
// coloured green or red also read as such at a glance.
const toneAccent: Record<"default" | "green" | "red" | "blue", Accent> = {
  default: "sky",
  green: "emerald",
  red: "rose",
  blue: "sky",
};

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  center = false,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "red" | "blue";
  center?: boolean;
  accent?: Accent;
}) {
  const toneClass = {
    default: "text-gray-900",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  }[tone];
  // Not built on Card: its border color would compete with the accent border.
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm shadow-sky-100/60 print:shadow-none ${
        center ? "text-center" : ""
      } ${accentClasses[accent ?? toneAccent[tone]]}`}
    >
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap rounded-xl border border-sky-100 bg-white p-1 gap-1 w-fit max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-lg px-3 sm:px-4 py-2 text-sm font-semibold transition-colors ${
            value === tab.value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-sky-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "green",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tone?: "green" | "red";
}) {
  const activeClass = tone === "red" ? "bg-red-600 text-white" : "bg-green-600 text-white";
  return (
    <div className="flex flex-wrap rounded-xl border border-sky-100 bg-white p-1 gap-1 w-fit max-w-full">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-4 sm:px-5 py-2 text-sm font-semibold transition-colors ${
            value === option.value ? activeClass : "text-gray-600 hover:bg-sky-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function HeroCard({
  label,
  value,
  tone = "green",
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div
      className={`rounded-xl border py-8 text-center ${accentClasses[tone === "red" ? "rose" : "emerald"]}`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div
        className={`text-3xl sm:text-5xl font-bold mt-2 break-all ${
          tone === "red" ? "text-red-600" : "text-green-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-center py-10 text-sm text-gray-400">{children}</div>;
}
