import React from 'react';

interface ClockIconProps {
  className?: string;
}

export const ClockIcon: React.FC<ClockIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <polyline points="12,6 12,12 16,14" strokeWidth={2} />
    </svg>
  );
};