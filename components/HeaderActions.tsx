import React from 'react';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ThemeIcon } from './icons/ThemeIcon';
import { SunIcon } from './icons/SunIcon';
import { useThemeContext } from '../contexts/ThemeProvider';

interface HeaderActionsProps {
  googleSheetUrl: string;
  isSheetView: boolean;
  onToggleSheetView: () => void;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  googleSheetUrl,
  isSheetView,
  onToggleSheetView,
}) => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <div className="flex items-center space-x-1 pl-2 text-gray-500 dark:text-gray-400">
      <button
        onClick={() => window.open(googleSheetUrl, '_blank', 'noopener,noreferrer')}
        aria-label="Open Google Sheet in new tab"
        title="Open Google Sheet in new tab"
        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <ExternalLinkIcon className="h-5 w-5" />
      </button>
      <button
        onClick={onToggleSheetView}
        aria-label={isSheetView ? "Show Data Table" : "Show Google Sheet"}
        title={isSheetView ? "Show Data Table" : "Show Google Sheet"}
        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <EyeIcon className="h-5 w-5" />
      </button>
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <ThemeIcon className="h-5 w-5" />
        ) : (
          <SunIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};