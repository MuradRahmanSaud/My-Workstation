import React from 'react';

export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    {...props}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.228a4.5 4.5 0 00-1.82-3.72M9 12a4.5 4.5 0 014.5-4.5m4.5 4.5a4.5 4.5 0 01-4.5 4.5M9 12l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17.657a3.75 3.75 0 01-2.25-1.3l-2.293-2.293M9 12a4.5 4.5 0 00-4.5 4.5m4.5-4.5v-2.25M9 12V9m3 3V9m-3 3h3m6 0v2.25c0 .621.504 1.125 1.125 1.125H18a1.125 1.125 0 011.125-1.125V12m-4.5 0v3.75c0 .621.504 1.125 1.125 1.125H15a1.125 1.125 0 011.125-1.125V12" 
    />
  </svg>
);
