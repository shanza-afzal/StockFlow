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
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white h-screen sticky top-0 overflow-y-auto">
      <div className="px-6 py-6">
        <span className="text-xl font-bold text-gray-900">Safi ERP</span>
      </div>
      <nav className="px-3 pb-8 flex flex-col gap-1">
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
                active ? "bg-blue-50 text-blue-600" : "text-gray-900 hover:bg-gray-50"
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
