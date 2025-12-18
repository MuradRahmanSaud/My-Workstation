import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CourseSummaryItem } from '../hooks/useCourseAggregation';
import { CourseSectionData } from '../types';
import { Filter, Copy, Pencil } from 'lucide-react';

interface CourseSummaryTableProps {
    data: CourseSummaryItem[];
    expandedKeys: Set<string>;
    toggleRow: (key: string) => void;
    headerColor?: string;
    isCompact?: boolean;
    isMissingDataMode?: boolean;
    isDetailOpen?: boolean; // New prop to control column visibility
    onEdit?: (row: CourseSummaryItem) => void;
    onRowClick?: (row: CourseSummaryItem) => void;
    
    // Config for all filters
    options: {
        programs: string[];
        types: string[];
        credits: string[];
        totalSections: number[];
        totalCapacity: number[];
        totalStudents: number[];
        totalVacancy: number[];
        extraSections: number[];
    };
    filters: {
        programs: Set<string>;
        types: Set<string>;
        credits: Set<string>;
        totalSections: Set<number>;
        totalCapacity: Set<number>;
        totalStudents: Set<number>;
        totalVacancy: Set<number>;
        extraSections: Set<number>;
    };
    onFilterChange: {
        setPrograms: (s: Set<string>) => void;
        setTypes: (s: Set<string>) => void;
        setCredits: (s: Set<string>) => void;
        setTotalSections: (s: Set<number>) => void;
        setTotalCapacity: (s: Set<number>) => void;
        setTotalStudents: (s: Set<number>) => void;
        setTotalVacancy: (s: Set<number>) => void;
        setExtraSections: (s: Set<number>) => void;
    };
}

// Generic Column Filter Component
const ColumnFilter = <T extends string | number>({ 
    options, 
    selected, 
    onChange 
}: { 
    options: T[]; 
    selected: Set<T>; 
    onChange: (val: Set<T>) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleValue = (val: T) => {
        const newSet = new Set(selected);
        if (newSet.has(val)) {
            newSet.delete(val);
        } else {
            newSet.add(val);
        }
        onChange(newSet);
    };

    return (
        <div ref={containerRef} className="ml-1 relative inline-block">
            <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                <Filter className={`w-3 h-3 ${selected.size > 0 ? 'text-yellow-300 fill-current' : 'text-white opacity-50 hover:opacity-100'}`} />
            </div>
            
            {isOpen && (
                <div 
                    className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg rounded-md z-50 w-[500px] p-2 text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-[10px] font-bold text-gray-500 mb-2 px-1">Filter Values</div>
                    <div className="max-h-60 overflow-y-auto thin-scrollbar grid grid-cols-5 gap-1.5">
                        {options.map((val) => (
                            <label 
                                key={String(val)} 
                                className={`flex items-center justify-center px-1 py-1.5 rounded cursor-pointer border text-center transition-colors ${
                                    selected.has(val) 
                                        ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold' 
                                        : 'hover:bg-gray-50 border-gray-100 text-gray-600'
                                }`}
                                title={String(val)}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={selected.has(val)}
                                    onChange={() => toggleValue(val)}
                                    className="hidden"
                                />
                                <span className="text-[10px] font-semibold truncate w-full leading-tight">{val}</span>
                            </label>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                        <button 
                            onClick={() => onChange(new Set())}
                            className="text-[9px] text-gray-500 hover:text-red-500"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-[9px] text-purple-600 font-bold hover:underline"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


export const CourseSummaryTable: React.FC<CourseSummaryTableProps> = ({ 
    data, 
    expandedKeys, 
    toggleRow,
    options,
    filters,
    onFilterChange,
    headerColor,
    isCompact = false,
    isMissingDataMode = false,
    isDetailOpen = false,
    onEdit,
    onRowClick
}) => {

      const renderExpandedDetails = (rows: CourseSectionData[]) => {
        // Added 'SL' and 'SEMESTER' to columns
        const columns = ['SL', 'SEMESTER', 'SECTION', 'STUDENT', 'CAPACITY', 'CLASS TAKEN', 'WEEKLY CLASS', 'TEACHER'];
        const dataKeys: Record<string, keyof CourseSectionData> = {
            'SEMESTER': 'Semester',
            'SECTION': 'Section',
            'STUDENT': 'Student',
            'CAPACITY': 'Capacity',
            'CLASS TAKEN': 'Class Taken',
            'WEEKLY CLASS': 'Weekly Class',
        };

        // Calculate Totals
        const totalStudents = rows.reduce((acc, row) => {
            const val = parseInt(row.Student || '0', 10);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);

        const totalCapacity = rows.reduce((acc, row) => {
            const val = parseInt(row.Capacity || '0', 10);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
  
        return (
          <div className="p-3 bg-purple-50/50 shadow-inner">
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                      {/* Deepened background color for inner table header as requested */}
                      <thead className="bg-slate-200 border-b border-slate-300">
                          <tr>
                              {columns.map((col) => (
                                  <th key={col} className={`px-2 py-1.5 font-bold text-gray-700 uppercase tracking-wider ${col === 'TEACHER' ? 'text-left' : 'text-center'}`}>
                                      {col}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-2 py-1.5 text-center font-medium text-gray-500">{idx + 1}</td>
                                  <td className="px-2 py-1.5 text-center font-medium text-gray-600">{row[dataKeys['SEMESTER']] || '-'}</td>
                                  <td className="px-2 py-1.5 text-center font-bold text-gray-700">{row[dataKeys['SECTION']] || '-'}</td>
                                  <td className="px-2 py-1.5 text-center">{row[dataKeys['STUDENT']] || '0'}</td>
                                  <td className={`px-2 py-1.5 text-center font-medium ${!row.Capacity ? 'bg-red-100 text-red-600' : 'text-red-500'}`}>{row[dataKeys['CAPACITY']] || '-'}</td>
                                  <td className="px-2 py-1.5 text-center">{row[dataKeys['CLASS TAKEN']] || '-'}</td>
                                  <td className={`px-2 py-1.5 text-center font-medium ${!row['Weekly Class'] ? 'bg-red-100 text-red-600' : 'text-gray-600'}`}>{row['Weekly Class'] || '-'}</td>
                                  <td className="px-2 py-1.5 text-left">
                                      {(() => {
                                          const tid = row['Teacher ID'];
                                          const name = row['Employee Name'];
                                          const desig = row['Designation'];

                                          if (!tid || tid === 'TBA') return <span className="text-gray-400">TBA</span>;
                                          
                                          // Format: Teacher Name, Designation (Employee ID)
                                          return (
                                              <span>
                                                  {name || tid}
                                                  {desig ? `, ${desig}` : ''}
                                                  {name ? ` (${tid})` : ''}
                                              </span>
                                          );
                                      })()}
                                  </td>
                              </tr>
                          ))}
                          
                          {/* Total Row */}
                          <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                              <td className="px-2 py-1.5"></td>
                              <td className="px-2 py-1.5"></td>
                              <td className="px-2 py-1.5 text-right text-[10px] uppercase text-gray-600 tracking-wider">Total</td>
                              <td className="px-2 py-1.5 text-center text-gray-800">{totalStudents}</td>
                              <td className="px-2 py-1.5 text-center text-red-600">{totalCapacity}</td>
                              <td className="px-2 py-1.5"></td>
                              <td className="px-2 py-1.5"></td>
                              <td className="px-2 py-1.5"></td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
        );
      };

      const columns = useMemo(() => {
          if (isMissingDataMode) {
              return ['ACTION', 'REF', 'PROGRAM', 'COURSE CODE', 'COURSE TITLE', 'CREDIT', 'COURSE TYPE', 'CAPACITY', 'WEEKLY CLASS'];
          }
          if (isDetailOpen) {
               return ['COURSE CODE', 'COURSE TITLE', 'COURSE TYPE', 'CREDIT', 'VACANCY', 'EXTRA'];
          }
          return ['PROGRAM', 'COURSE CODE', 'COURSE TITLE', 'COURSE TYPE', 'CREDIT', ...(!isCompact ? ['TOTAL SECTIONS', 'TOTAL CAPACITY', 'TOTAL STUDENTS', 'TOTAL VACANCY', 'EXTRA SECTIONS'] : [])];
      }, [isMissingDataMode, isCompact, isDetailOpen]);

      const handleRefCopy = (e: React.MouseEvent, row: CourseSummaryItem) => {
          e.stopPropagation();
          const target = e.currentTarget as HTMLElement;
          
          target.classList.add('!bg-green-100', '!text-green-700', '!border-green-300');
          
          if (e.ctrlKey || e.shiftKey) {
              const rowData = `${row.ref}\t${row.pid}\t${row.program}\t${row.credit}\t${row.type || ''}`;
              navigator.clipboard.writeText(rowData);
          } else {
              navigator.clipboard.writeText(row.ref);
          }

          setTimeout(() => {
              target.classList.remove('!bg-green-100', '!text-green-700', '!border-green-300');
          }, 800);
      };

      return (
        <table className="w-full text-left border-collapse">
            <thead className={`${headerColor || 'bg-[#9333ea]'} sticky top-0 z-10 shadow-sm border-b border-gray-200`}>
                <tr className={`border-l-4 ${headerColor ? 'border-transparent' : 'border-[#9333ea]'}`}>
                    {columns.map((col, idx) => {
                        let filterComponent = null;

                        switch (col) {
                            case 'PROGRAM':
                                filterComponent = <ColumnFilter options={options.programs} selected={filters.programs} onChange={onFilterChange.setPrograms} />;
                                break;
                            case 'COURSE TYPE':
                                filterComponent = <ColumnFilter options={options.types} selected={filters.types} onChange={onFilterChange.setTypes} />;
                                break;
                            case 'CREDIT':
                                filterComponent = <ColumnFilter options={options.credits} selected={filters.credits} onChange={onFilterChange.setCredits} />;
                                break;
                            case 'TOTAL SECTIONS':
                                filterComponent = <ColumnFilter options={options.totalSections} selected={filters.totalSections} onChange={onFilterChange.setTotalSections} />;
                                break;
                            case 'TOTAL CAPACITY':
                                filterComponent = <ColumnFilter options={options.totalCapacity} selected={filters.totalCapacity} onChange={onFilterChange.setTotalCapacity} />;
                                break;
                            case 'TOTAL STUDENTS':
                                filterComponent = <ColumnFilter options={options.totalStudents} selected={filters.totalStudents} onChange={onFilterChange.setTotalStudents} />;
                                break;
                            case 'TOTAL VACANCY':
                            case 'VACANCY':
                                filterComponent = <ColumnFilter options={options.totalVacancy} selected={filters.totalVacancy} onChange={onFilterChange.setTotalVacancy} />;
                                break;
                            case 'EXTRA SECTIONS':
                            case 'EXTRA':
                                filterComponent = <ColumnFilter options={options.extraSections} selected={filters.extraSections} onChange={onFilterChange.setExtraSections} />;
                                break;
                            default:
                                break;
                        }

                        return (
                            <th key={idx} className={`px-2 py-2 text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap text-center relative group ${col === 'ACTION' ? 'w-10' : ''}`}>
                                <div className="flex items-center justify-center">
                                    {col}
                                    {filterComponent}
                                </div>
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {data.map((row) => {
                    const isExpanded = expandedKeys.has(row.key);
                    return (
                        <React.Fragment key={row.key}>
                            <tr 
                                onClick={() => onRowClick ? onRowClick(row) : toggleRow(row.key)}
                                className={`cursor-pointer transition-colors group text-[11px] leading-none h-[29px] border-l-4 ${isExpanded ? 'bg-purple-100 border-purple-600' : 'hover:bg-purple-50 border-transparent'}`}
                            >
                                {isMissingDataMode ? (
                                    <>
                                        <td className="px-2 py-1 text-center border-r border-transparent">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEdit && onEdit(row); }}
                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                title="Edit Reference Data"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </td>
                                        <td className="px-2 py-1 text-center relative">
                                            <button 
                                                className="inline-flex items-center justify-center space-x-1 px-1.5 py-0.5 rounded border border-gray-200 bg-white text-[10px] font-mono font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all active:scale-95 group/btn"
                                                onClick={(e) => handleRefCopy(e, row)}
                                                title="Click to copy Ref. Ctrl+Click to copy Row Data for Excel."
                                            >
                                                <span>{row.ref}</span>
                                                <Copy className="w-2.5 h-2.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                                            </button>
                                        </td>
                                        <td className="px-2 py-1 text-center font-medium text-gray-700">{row.program}</td>
                                        <td className="px-2 py-1 text-center font-bold text-blue-600">{row.courseCode}</td>
                                        <td className="px-2 py-1 text-left text-gray-800">{row.courseTitle}</td>
                                        <td className="px-2 py-1 text-center text-gray-600">{row.credit}</td>
                                        <td className={`px-2 py-1 text-center font-bold ${!row.courseType ? 'bg-red-100 text-red-600' : 'text-gray-600'}`}>{row.courseType || '-'}</td>
                                        <td className={`px-2 py-1 text-center font-bold ${!row.unitCapacity ? 'bg-red-100 text-red-600' : 'text-gray-600'}`}>{row.unitCapacity || '-'}</td>
                                        <td className={`px-2 py-1 text-center font-bold ${!row.weeklyClass ? 'bg-red-100 text-red-600' : 'text-gray-600'}`}>{row.weeklyClass || '-'}</td>
                                    </>
                                ) : isDetailOpen ? (
                                    <>
                                        <td className="px-2 py-1 text-center font-bold text-blue-600">{row.courseCode}</td>
                                        <td className="px-2 py-1 text-left text-gray-800 truncate max-w-[200px]" title={row.courseTitle}>{row.courseTitle}</td>
                                        <td className="px-2 py-1 text-center text-gray-600">{row.courseType}</td>
                                        <td className="px-2 py-1 text-center text-gray-600">{row.credit}</td>
                                        <td className={`px-2 py-1 text-center font-bold ${row.totalVacancy <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {row.totalVacancy}
                                        </td>
                                        <td className="px-2 py-1 text-center font-bold text-gray-500">{row.extraSections}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-2 py-1 text-center font-medium text-gray-700">{row.program}</td>
                                        <td className="px-2 py-1 text-center font-bold text-blue-600">{row.courseCode}</td>
                                        <td className="px-2 py-1 text-left text-gray-800">{row.courseTitle}</td>
                                        <td className="px-2 py-1 text-center text-gray-600">{row.courseType}</td>
                                        <td className="px-2 py-1 text-center text-gray-600">{row.credit}</td>
                                        
                                        {!isCompact && (
                                            <>
                                                <td className="px-2 py-1 text-center text-gray-700">{row.totalSections}</td>
                                                <td className="px-2 py-1 text-center font-medium text-gray-700">{row.totalCapacity}</td>
                                                <td className="px-2 py-1 text-center font-medium text-gray-700">{row.totalStudents}</td>
                                                <td className={`px-2 py-1 text-center font-bold ${row.totalVacancy <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {row.totalVacancy}
                                                </td>
                                                <td className="px-2 py-1 text-center font-bold text-gray-500">{row.extraSections}</td>
                                            </>
                                        )}
                                    </>
                                )}
                            </tr>
                            {isExpanded && !onRowClick && (
                                <tr>
                                    <td colSpan={columns.length} className="p-0 border-b border-gray-200">
                                        {renderExpandedDetails(row.rows)}
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
      );
};