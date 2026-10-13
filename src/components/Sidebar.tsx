"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/" },
  { label: "Sale Bill", href: "/sale-bill" },
  { label: "Sale Bills Register", href: "/sale-bills-register" },
  { label: "Amount Entry", href: "/amount-entry" },
  { label: "Stock", href: "/stock" },
  { label: "Cash", href: "/cash" },
  { label: "Ledger", href: "/ledger" },
  { label: "Accounts", href: "/accounts" },
  { label: "Purchase Bill", href: "/purchase-bill" },
  { label: "Purchase Bills Register", href: "/purchase-bills-register" },
  { label: "Sales Reports", href: "/sales-reports" },
  { label: "Purchase Reports", href: "/purchase-reports" },
  { label: "Progress Report", href: "/progress-report" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-sky-100 bg-linear-to-b from-sky-100/70 via-white to-violet-100/60 h-screen sticky top-0 overflow-y-auto">
      <nav className="px-3 py-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors ${
                active
                  ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-200"
                  : "text-gray-800 hover:bg-white/70 hover:text-sky-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
