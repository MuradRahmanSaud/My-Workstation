
import React from 'react';

export const SectionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h18M3 14h18m-9-4v8m-7-8h.01M20.99 6h.01"
    />
    <path d="M4 4h16v16H4z" stroke="none" />
  </svg>
);
