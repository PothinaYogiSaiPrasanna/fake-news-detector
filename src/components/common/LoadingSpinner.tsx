interface LoadingSpinnerProps {
  message?: string;
  progress?: string;
}

export function LoadingSpinner({ message, progress }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
      </div>
      {(message || progress) && (
        <div className="text-center">
          {message && <p className="text-lg font-medium text-gray-700">{message}</p>}
          {progress && <p className="text-sm text-gray-500 mt-1">{progress}</p>}
        </div>
      )}
    </div>
  );
}
