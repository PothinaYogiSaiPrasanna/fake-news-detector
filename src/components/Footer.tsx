export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>
            <strong>TruthScope</strong> — A privacy-first fake news detection tool.
            All analysis runs entirely in your browser.
          </p>
          <p>
            This tool is a screening aid, not a definitive truth oracle.
            Always verify information from multiple trusted sources.
          </p>
          <p className="text-xs text-gray-400">
            Built with Transformers.js &middot; Tesseract.js &middot; React &middot; Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
