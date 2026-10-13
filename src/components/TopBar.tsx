export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-sky-100 bg-white/70">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-lg border border-sky-100 px-3 py-2 text-gray-700 hover:bg-sky-50"
      >
        ☰
      </button>
    </div>
  );
}
