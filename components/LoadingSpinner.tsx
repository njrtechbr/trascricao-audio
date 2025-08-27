import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = 'Carregando...',
  variant = 'primary' 
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'border-t-blue-500',
    secondary: 'border-t-purple-500',
    accent: 'border-t-pink-500'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} ${colorClasses[variant]} 
            border-4 border-gray-200 rounded-full animate-spin`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-2 h-2 ${colorClasses[variant].replace('border-t-', 'bg-')} rounded-full`} />
        </div>
      </div>
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
};

export const LoadingDots: React.FC = () => (
  <div className="flex space-x-1">
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ 
  message, 
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center space-y-4 p-8">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
      <svg 
        className="w-8 h-8 text-red-600" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
    </div>
    <p className="text-center text-gray-700">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Tentar Novamente
      </button>
    )}
  </div>
);

export const SuccessState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center space-y-4 p-8">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
      <svg 
        className="w-8 h-8 text-green-600" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 13l4 4L19 7" 
        />
      </svg>
    </div>
    <p className="text-center text-gray-700">{message}</p>
  </div>
);