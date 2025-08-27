import React from 'react';

interface SkipForwardIconProps {
  className?: string;
}

export const SkipForwardIcon: React.FC<SkipForwardIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
};