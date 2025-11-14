import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { TableHeader } from '../types';

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  headers: TableHeader<T>[];
  rowKeyAccessor: (row: T) => string;
  renderExpandedRow?: (row: T) => React.ReactNode;
  headerColor?: string;
}

const ITEMS_PER_PAGE = 50;

export const DataTable = <T extends Record<string, any>>({
  data,
  isLoading,
  error,
  headers,
  rowKeyAccessor,
  renderExpandedRow,
  headerColor,
}: DataTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  // Reset state when data prop changes. This handles filtering within a view.
  // The parent component will use the `key` prop to handle full view changes.
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRowKey(null);
  }, [data]);


  const handleRowClick = (row: T) => {
    if (!renderExpandedRow) return;
    const key = rowKeyAccessor(row);
    setExpandedRowKey(prevKey => (prevKey === key ? null : key));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 m-4 text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md">
        <h3 className="font-bold">Error loading data</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (data.length === 0 && !isLoading) {
    return (
      <div className="p-4 m-4 text-center text-gray-600 dark:text-gray-300">
        <h3 className="font-bold">No Data Found</h3>
        <p>Your search returned no results, or the data source is empty.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((page) => Math.max(page - 1, 1));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-grow w-full overflow-x-auto thin-scrollbar">
        <table className="w-full">
          <thead className={`text-xs font-semibold text-left text-white uppercase sticky top-0 z-10 ${headerColor || 'bg-cyan-600 dark:bg-cyan-700'}`}>
            <tr>
              {headers.map(({ label, align }) => (
                <th key={label} className={`px-3 py-2 whitespace-nowrap ${align === 'center' ? 'text-center' : ''}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-secondary divide-y dark:divide-gray-700">
            {paginatedData.map((row) => {
              const rowKey = rowKeyAccessor(row);
              const isExpanded = expandedRowKey === rowKey;
              const isExpandable = !!renderExpandedRow;

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={() => handleRowClick(row)}
                    className={`text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-accent text-sm ${isExpandable ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-gray-100 dark:bg-dark-accent' : ''}`}
                  >
                    {headers.map((header) => (
                      <td key={`${String(header.key)}-${rowKey}`} className={`px-4 py-2 whitespace-nowrap ${header.align === 'center' ? 'text-center' : ''}`}>
                        {header.render ? header.render(row) : row[header.key]}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpandedRow && (
                    <tr className="bg-gray-50 dark:bg-black/20">
                      <td colSpan={headers.length}>
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 flex justify-between items-center px-4 py-2 text-sm text-gray-600 bg-white dark:bg-dark-secondary dark:text-gray-400 border-t dark:border-gray-700">
          <div>
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, data.length)} of {data.length} results
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              aria-label="Previous Page"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              aria-label="Next Page"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};