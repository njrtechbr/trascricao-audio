import React from 'react';

interface NavigationProps {
  currentStep: 'upload' | 'processing' | 'transcription' | 'completed';
  onStepClick?: (step: 'upload' | 'processing' | 'transcription' | 'completed') => void;
}

const steps = [
  { id: 'upload', label: 'Upload de Áudio', icon: '📁' },
  { id: 'processing', label: 'Processamento', icon: '⚙️' },
  { id: 'transcription', label: 'Transcrição', icon: '📝' },
  { id: 'completed', label: 'Concluído', icon: '✅' }
] as const;

export const Navigation: React.FC<NavigationProps> = ({ currentStep, onStepClick }) => {
  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  const isStepCompleted = (stepIndex: number) => {
    return stepIndex < getCurrentStepIndex();
  };

  const isStepCurrent = (stepIndex: number) => {
    return stepIndex === getCurrentStepIndex();
  };

  const isStepAccessible = (stepIndex: number) => {
    return stepIndex <= getCurrentStepIndex();
  };

  return (
    <nav className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(index);
          const isCurrent = isStepCurrent(index);
          const isAccessible = isStepAccessible(index);

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isAccessible && onStepClick?.(step.id)}
                  disabled={!isAccessible}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-200
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white shadow-lg'
                        : isCurrent
                        ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-200'
                        : isAccessible
                        ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  aria-label={`${step.label} - ${isCompleted ? 'Concluído' : isCurrent ? 'Atual' : 'Pendente'}`}
                >
                  {isCompleted ? '✓' : step.icon}
                </button>
                <span className={`
                  mt-2 text-sm font-medium text-center max-w-20
                  ${
                    isCurrent
                      ? 'text-blue-600 font-semibold'
                      : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }
                `}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-1 mx-4 rounded transition-colors duration-200
                  ${
                    isCompleted
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};