import { useState } from 'react';

interface URLInputProps {
  onSubmit: (url: string) => void;
  disabled: boolean;
}

export function URLInput({ onSubmit, disabled }: URLInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  };

  const isValid = url.trim().length > 0 &&
    /^https?:\/\/.+\..+/i.test(url.trim()) ||
    /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(url.trim());

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Enter a URL (e.g., https://example.com/article)"
            disabled={disabled}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔗</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !isValid}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Analyze URL
        </button>
      </div>
      {url.trim().length > 0 && !isValid && (
        <p className="text-xs text-amber-600">
          Please enter a valid URL (e.g., https://example.com)
        </p>
      )}
      <p className="text-xs text-gray-500">
        We'll attempt to fetch the page content for analysis. If fetching fails, we'll analyze the URL itself.
      </p>
    </div>
  );
}
