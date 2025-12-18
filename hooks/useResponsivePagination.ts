
import { useState, useEffect, useRef, useMemo } from 'react';

interface PaginationOptions {
    defaultRows?: number;
    enableAutoResize?: boolean;
}

export const useResponsivePagination = <T>(data: T[], options: PaginationOptions = {}) => {
  const { defaultRows = 20, enableAutoResize = true } = options;
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRows);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive Pagination Logic
  useEffect(() => {
    if (!enableAutoResize) return;

    const calculateRows = () => {
        if (containerRef.current) {
            const containerHeight = containerRef.current.clientHeight;
            const headerHeight = 35; // Approx height of thead
            // Estimated row height for compact mode (text-11px + padding) ~ 29px
            const rowHeight = 29; 
            
            const availableHeight = containerHeight - headerHeight;
            const calculatedRows = Math.floor(availableHeight / rowHeight);
            
            // Ensure at least 5 rows and update
            setRowsPerPage(Math.max(5, calculatedRows));
        }
    };

    // Initial calculation
    calculateRows();

    // Observe resize
    const observer = new ResizeObserver(() => {
        calculateRows();
    });

    if (containerRef.current) {
        observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [enableAutoResize]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  
  const paginatedData = useMemo(() => {
     const start = (currentPage - 1) * rowsPerPage;
     return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  return {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    totalPages,
    paginatedData,
    containerRef
  };
};
