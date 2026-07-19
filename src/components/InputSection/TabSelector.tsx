import type { InputType } from '../../engine/types';

interface TabSelectorProps {
  active: InputType;
  onChange: (tab: InputType) => void;
  disabled: boolean;
}

const TABS: { id: InputType; label: string; icon: string }[] = [
  { id: 'text', label: 'Text', icon: 'Aa' },
  { id: 'url', label: 'URL', icon: '🔗' },
  { id: 'image', label: 'Image', icon: '🖼' },
];

export function TabSelector({ active, onChange, disabled }: TabSelectorProps) {
  return (
    <div className="flex border-b border-gray-200">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
