import React from 'react';

interface PlayIconProps {
  className?: string;
}

export const PlayIcon: React.FC<PlayIconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
};