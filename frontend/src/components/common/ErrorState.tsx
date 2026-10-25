import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-10 gap-3 text-red-600">
      <AlertTriangle className="w-8 h-8" aria-hidden="true" />
      <p className="text-sm text-center">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;
