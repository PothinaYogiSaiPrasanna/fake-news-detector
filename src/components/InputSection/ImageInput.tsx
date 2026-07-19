import { useState, useRef, type ChangeEvent } from 'react';

interface ImageInputProps {
  onSubmit: (file: File) => void;
  disabled: boolean;
}

export function ImageInput({ onSubmit, disabled }: ImageInputProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (file) onSubmit(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          preview
            ? 'border-indigo-300 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        {preview ? (
          <div className="space-y-3">
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-sm" />
            <p className="text-sm text-gray-600">{file?.name}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <p className="text-gray-600 font-medium">Drop an image here or click to browse</p>
            <p className="text-sm text-gray-500">
              Supported: JPG, PNG, WebP (text in image will be extracted via OCR)
            </p>
          </div>
        )}
      </div>

      {preview && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={disabled || !file}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Extract & Analyze
          </button>
        </div>
      )}
    </div>
  );
}
