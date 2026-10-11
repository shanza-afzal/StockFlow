"use client";

import { ReactNode, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="relative z-10">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="flex-1 bg-black/30"
            onClick={() => setMenuOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-6xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
