import type { ReactNode } from 'react';

interface AuthStateMessageProps {
  type: 'success' | 'error';
  title: string;
  message: string | ReactNode;
  onClose?: () => void;
  onRetry?: () => void;
  closeButtonText?: string;
  retryButtonText?: string;
}

export function AuthStateMessage({
  type,
  title,
  message,
  onClose,
  onRetry,
  closeButtonText = 'Close',
  retryButtonText = 'Try Again',
}: AuthStateMessageProps) {
  const isSuccess = type === 'success';

  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center">
        <div className="mb-8">
          {isSuccess ? (
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-3xl font-bold mb-4 text-bolt-elements-textPrimary">{title}</h2>

        <div className="text-lg text-bolt-elements-textSecondary mb-8 leading-relaxed max-w-sm mx-auto">{message}</div>

        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {retryButtonText}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
                onRetry
                  ? 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 border-2 border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive'
                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {closeButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
