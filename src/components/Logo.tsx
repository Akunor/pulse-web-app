import React from 'react';

export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 1000 1000" 
      className={className}
      aria-label="Pulse Logo"
    >
      <path
        fill="currentColor"
        d="M500 150c-152.5 0-300 147.5-300 300 0 152.5 147.5 300 300 300s300-147.5 300-300c0-152.5-147.5-300-300-300zm0 540c-132.5 0-240-107.5-240-240s107.5-240 240-240 240 107.5 240 240-107.5 240-240 240z"
      />
      <path
        fill="currentColor"
        d="M500 250c-110 0-200 90-200 200s90 200 200 200 200-90 200-200-90-200-200-200zm0 360c-88 0-160-72-160-160s72-160 160-160 160 72 160 160-72 160-160 160z"
      />
    </svg>
  );
}