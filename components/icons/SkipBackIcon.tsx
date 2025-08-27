import React from 'react';

interface SkipBackIconProps {
  className?: string;
}

export const SkipBackIcon: React.FC<SkipBackIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
};