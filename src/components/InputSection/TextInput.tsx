import { useState } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
}

export function TextInput({ onSubmit, disabled }: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length >= 10) {
      onSubmit(trimmed);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste or type the news article, social media post, or claim you want to analyze..."
        rows={6}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {wordCount > 0 ? `${wordCount} words` : 'Minimum 10 words required'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={disabled || text.trim().length < 10}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Analyze Text
        </button>
      </div>
    </div>
  );
}
