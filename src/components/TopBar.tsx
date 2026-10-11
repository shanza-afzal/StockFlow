export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 lg:py-4 border-b border-gray-100">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="lg:hidden rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50"
      >
        ☰
      </button>
      <span className="lg:hidden font-bold text-gray-900">Safi ERP</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-500">mudassar</span>
        <span className="text-xs font-semibold bg-gray-100 text-gray-700 rounded-full px-3 py-1">
          Owner
        </span>
      </div>
    </div>
  );
}
