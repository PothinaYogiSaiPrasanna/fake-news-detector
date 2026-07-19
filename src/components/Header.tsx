interface HeaderProps {
  onReset: () => void;
  hasResult: boolean;
}

export function Header({ onReset, hasResult }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={onReset} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">TruthScope</span>
        </button>

        {hasResult && (
          <button
            onClick={onReset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Analysis
          </button>
        )}
      </div>
    </header>
  );
}
