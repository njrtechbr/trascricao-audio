import React, { useEffect, useState, useCallback } from 'react';

interface FeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
  autoClose?: boolean;
}

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const colors = {
  success: 'bg-green-100 border-green-400 text-green-700',
  error: 'bg-red-100 border-red-400 text-red-700',
  warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
  info: 'bg-blue-100 border-blue-400 text-blue-700'
};

const darkColors = {
  success: 'bg-green-900 border-green-600 text-green-200',
  error: 'bg-red-900 border-red-600 text-red-200',
  warning: 'bg-yellow-900 border-yellow-600 text-yellow-200',
  info: 'bg-blue-900 border-blue-600 text-blue-200'
};

export const Feedback: React.FC<FeedbackProps> = ({ 
  type, 
  message, 
  duration = 5000, 
  onClose, 
  autoClose = true 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Detectar tema atual
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
    };

    checkTheme();
    
    // Observar mudanças no tema
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Aguarda a animação de saída
  }, [onClose]);

  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, handleClose]);

  if (!isVisible) {
    return null;
  }

  const colorClasses = isDark ? darkColors[type] : colors[type];

  return (
    <div className={`
      relative max-w-md w-full
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className={`
        border-l-4 p-4 rounded-lg shadow-lg backdrop-blur-sm
        ${colorClasses}
        flex items-start gap-3
      `}>
        <span className="text-xl flex-shrink-0 mt-0.5">
          {icons[type]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-2 text-lg hover:opacity-70 transition-opacity"
          aria-label="Fechar notificação"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Contador global para garantir IDs únicos
let feedbackIdCounter = 0;

// Hook para gerenciar múltiplas notificações
export const useFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>>([]);

  const addFeedback = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => {
    const id = `feedback-${++feedbackIdCounter}`;
    setFeedbacks(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeFeedback = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(feedback => feedback.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => addFeedback('success', message, duration), [addFeedback]);
  const showError = useCallback((message: string, duration?: number) => addFeedback('error', message, duration), [addFeedback]);
  const showWarning = useCallback((message: string, duration?: number) => addFeedback('warning', message, duration), [addFeedback]);
  const showInfo = useCallback((message: string, duration?: number) => addFeedback('info', message, duration), [addFeedback]);

  const FeedbackContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {feedbacks.map((feedback) => (
        <Feedback
          key={feedback.id}
          type={feedback.type}
          message={feedback.message}
          duration={feedback.duration}
          onClose={() => removeFeedback(feedback.id)}
        />
      ))}
    </div>
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    FeedbackContainer
  };
};