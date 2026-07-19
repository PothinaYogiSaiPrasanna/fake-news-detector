import { useState } from 'react';
import type { AnalysisInput, InputType } from '../../engine/types';
import { TabSelector } from './TabSelector';
import { TextInput } from './TextInput';
import { URLInput } from './URLInput';
import { ImageInput } from './ImageInput';

interface InputSectionProps {
  onAnalyze: (input: AnalysisInput) => void;
  disabled: boolean;
}

export function InputSection({ onAnalyze, disabled }: InputSectionProps) {
  const [activeTab, setActiveTab] = useState<InputType>('text');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <TabSelector active={activeTab} onChange={setActiveTab} disabled={disabled} />

      <div className="p-4 sm:p-6">
        {activeTab === 'text' && (
          <TextInput
            onSubmit={text => onAnalyze({ type: 'text', content: text })}
            disabled={disabled}
          />
        )}
        {activeTab === 'url' && (
          <URLInput
            onSubmit={url => onAnalyze({ type: 'url', content: url })}
            disabled={disabled}
          />
        )}
        {activeTab === 'image' && (
          <ImageInput
            onSubmit={file => onAnalyze({ type: 'image', content: file.name, imageFile: file })}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
