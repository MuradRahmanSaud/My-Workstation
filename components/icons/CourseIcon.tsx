
import React from 'react';

export const CourseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M12 6.253v11.494m-9-5.747h18M5.47 5.47a.375.375 0 11-.53 0 .375.375 0 01.53 0zm13.06 13.06a.375.375 0 11-.53 0 .375.375 0 01.53 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.253v11.494m-9-5.747h18"
    />
    <path d="M4 6h16v12H4z" stroke="none" />
    <path d="M12 6.253v11.494M4.75 12h14.5" />
    <path d="M16 3.5l4 8.5-4 8.5M8 20.5l-4-8.5 4-8.5" />
  </svg>
);
