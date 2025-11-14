import React from 'react';
import { HeaderActions } from './HeaderActions';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { FilterIcon } from './icons/FilterIcon';
import { SearchIcon } from './icons/SearchIcon';
import { SyncIcon } from './icons/SyncIcon';
import { PortalIcon } from './icons/PortalIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface SectionViewHeaderProps {
  dataForDisplayLength: number;
  onOpenFilterPanel: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  loadAllData: () => Promise<void>;
  isLoading: boolean;
  googleSheetUrl: string;
  isSheetView: boolean;
  onToggleSheetView: () => void;
  onReportClick: () => void;
  isReportViewActive: boolean;
}

export const SectionViewHeader: React.FC<SectionViewHeaderProps> = ({
  dataForDisplayLength,
  onOpenFilterPanel,
  searchTerm,
  setSearchTerm,
  loadAllData,
  isLoading,
  googleSheetUrl,
  isSheetView,
  onToggleSheetView,
  onReportClick,
  isReportViewActive,
}) => {
  return (
    <div className="flex justify-between items-center px-4 py-2 border-b dark:border-gray-700 flex-shrink-0">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
        Total Sections <span className="text-cyan-600">{dataForDisplayLength}</span>
      </h2>
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenFilterPanel}
          aria-label="Open filters"
          className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
        >
          <FilterIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-72 pl-9 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-700 dark:text-light"
          />
        </div>
        <button 
          onClick={onReportClick}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-cyan-600 text-white rounded-md text-sm font-semibold hover:bg-cyan-700 transition-colors">
          {isReportViewActive ? <ChevronLeftIcon className="h-4 w-4" /> : <ClipboardListIcon className="h-4 w-4" />}
          <span>{isReportViewActive ? 'Back' : 'Report'}</span>
        </button>
        <button 
          onClick={loadAllData}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <SyncIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Syncing...' : 'Sync Data'}</span>
        </button>
        <button 
          onClick={() => window.open('http://empapp.daffodilvarsity.edu.bd/diu-spm/login', '_blank', 'noopener,noreferrer')}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
          <PortalIcon className="h-4 w-4" />
          <span>SPM Portal</span>
        </button>
        <HeaderActions
          googleSheetUrl={googleSheetUrl}
          isSheetView={isSheetView}
          onToggleSheetView={onToggleSheetView}
        />
      </div>
    </div>
  );
};