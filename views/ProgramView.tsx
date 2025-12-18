
import React, { useState, useMemo } from 'react';
import { ProgramDataRow } from '../types';
import { Search, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { EditEntryModal } from '../components/EditEntryModal';
import { ProgramDetailsPanel } from '../components/ProgramDetailsPanel';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

export const ProgramView: React.FC = () => {
  const { programData, diuEmployeeData, loading, reloadData, updateProgramData } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');

  // Edit/Add Modal State (for Adding only)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<any>(undefined);

  // Detail Panel State
  const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);

  const filteredData = useMemo(() => {
    if (!searchTerm) return programData;
    const lower = searchTerm.toLowerCase();
    return programData.filter(item => 
      Object.values(item).some(val => String(val).toLowerCase().includes(lower))
    );
  }, [programData, searchTerm]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(filteredData);

  const columns: (keyof ProgramDataRow)[] = [
    'PID',
    'Faculty Short Name',
    'Faculty Full Name',
    'Program Full Name',
    'Program Short Name',
    'Department Name',
    'Program Type',
    'Semester Type',
    'Semester Duration',
    'No of Class Required',
    'Class Duration',
    'Class Requirement',
    'Head',
    'Associate Head',
    'Administration'
  ];

  // Prepare Employee Options for Add Modal
  const employeeOptions = useMemo(() => {
      const options = diuEmployeeData.map(e => {
          const desig = [e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/');
          return `${e['Employee Name']} - ${desig} (${e['Employee ID']})`;
      });
      return Array.from(new Set(options)).sort();
  }, [diuEmployeeData]);

  // Derive options for Add Modal
  const derivedOptions = useMemo(() => {
      const fields = [
          'Faculty Short Name',
          'Faculty Full Name',
          'Program Full Name',
          'Program Short Name',
          'Department Name',
          'Program Type',
          'Semester Type',
          'Semester Duration',
          'Class Requirement',
          'Class Duration'
      ];

      const options: Record<string, Set<string>> = {};
      fields.forEach(field => options[field] = new Set());

      programData.forEach(row => {
          fields.forEach(field => {
              const val = row[field as keyof ProgramDataRow];
              if (val) options[field].add(String(val));
          });
      });

      return fields.reduce((acc, field) => {
          acc[field] = Array.from(options[field]).sort();
          return acc;
      }, {} as Record<string, string[]>);
  }, [programData]);

  const calculateNoOfClassRequired = (reqStr: string, durStr: string): string => {
      const getVal = (str: string, type: 'Theory' | 'Lab') => {
          if (!str) return 0;
          const isTheory = type === 'Theory';
          
          const pattern = isTheory 
            ? /(?:theory|th|lecture|lec)[:\s-]*(\d+)/i 
            : /(?:lab|laboratory|lb)[:\s-]*(\d+)/i;
          
          const match = str.match(pattern);
          if (match) return parseFloat(match[1]);
          
          if (isTheory && !/(?:theory|th|lab|lb)/i.test(str)) {
              const simpleMatch = str.match(/(\d+(\.\d+)?)/);
              if (simpleMatch) return parseFloat(simpleMatch[1]);
          }
          
          return 0;
      };

      const reqTheory = getVal(reqStr, 'Theory');
      const reqLab = getVal(reqStr, 'Lab');
      
      const durTheory = getVal(durStr, 'Theory');
      const durLab = getVal(durStr, 'Lab');

      const classesTheory = (durTheory > 0) ? Math.floor(reqTheory / durTheory) : 0;
      const classesLab = (durLab > 0) ? Math.floor(reqLab / durLab) : 0;

      const parts = [];
      if (classesTheory > 0) parts.push(`Theory: ${classesTheory}`); 
      if (classesLab > 0) parts.push(`Lab: ${classesLab}`);
      
      return parts.length > 0 ? parts.join(', ') : '-';
  };

  const handleAdd = () => {
      setEditMode('add');
      setEditingRow(undefined);
      setIsEditModalOpen(true);
  };

  // Helper: Convert Formatted Strings back to IDs for API Submission (For Add Modal)
  const transformDataForSubmit = (data: any) => {
      const extractIds = (fieldVal: string) => {
          if (!fieldVal) return '';
          return fieldVal.split(',').map(item => {
              const trimmed = item.trim();
              const match = trimmed.match(/\(([^)]+)\)$/);
              return match ? match[1] : trimmed;
          }).join(', ');
      };

      return {
          ...data,
          'Head': extractIds(data.Head),
          'Associate Head': extractIds(data['Associate Head']),
          'Administration': extractIds(data.Administration)
      };
  };

  const handleModalSuccess = (newData: any) => {
      if (!newData) return;
      if (editMode === 'add') {
          updateProgramData(prev => [newData, ...prev]);
      }
  };

  const handlePanelUpdate = (newData: ProgramDataRow) => {
      updateProgramData(prev => prev.map(row => 
          row.PID === newData.PID ? { ...row, ...newData } : row
      ));
      setSelectedProgram(prev => prev ? { ...prev, ...newData } : prev);
  };

  const editColumns = [
    'PID',
    'Faculty Short Name',
    'Faculty Full Name',
    'Program Full Name',
    'Program Short Name',
    'Department Name',
    'Program Type',
    'Semester Type',
    'Semester Duration',
    'Class Requirement',
    'Class Duration',
    'Head',
    'Associate Head',
    'Administration'
  ];

  const fieldOptions = {
      ...derivedOptions,
      'Head': employeeOptions,
      'Associate Head': employeeOptions,
      'Administration': employeeOptions
  };

  const multiSelectFields = ['Head', 'Associate Head', 'Administration'];

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50 relative">
      
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 bg-white p-2 rounded border border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
           <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
             Program List
           </h2>
           <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-medium border border-blue-200">
                {filteredData.length}
           </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative group">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search Programs..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-48 md:w-64 outline-none transition-all"
                />
            </div>

            <button 
                onClick={() => reloadData()}
                disabled={loading.status === 'loading'}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-200 transition-all disabled:opacity-50"
                title="Refresh"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>

            <a 
                href="http://empapp.daffodilvarsity.edu.bd/diu-spm/home" 
                target="_blank" 
                rel="noreferrer"
                className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-200 transition-all ml-1 whitespace-nowrap"
                title="Open SPM Portal"
            >
                SPM Portal
            </a>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-row gap-2">
        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-white rounded border border-gray-200 shadow-sm relative flex flex-col">
            {loading.status === 'loading' && programData.length === 0 && (
                <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <div className="flex-1 overflow-auto relative" ref={containerRef}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                        <tr>
                            {columns.map((col) => (
                                <th key={col} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-left">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.map((row, idx) => {
                            const isSelected = selectedProgram?.PID === row.PID;
                            return (
                                <tr 
                                    key={idx} 
                                    onClick={() => setSelectedProgram(row)}
                                    className={`transition-colors group text-[11px] text-gray-700 leading-none h-[29px] cursor-pointer ${isSelected ? 'bg-blue-100 ring-1 ring-inset ring-blue-500' : 'hover:bg-blue-50/60'}`}
                                >
                                    {columns.map((col) => {
                                        let displayValue = row[col];
                                        
                                        // Calculation for 'No of Class Required'
                                        if (col === 'No of Class Required') {
                                            displayValue = calculateNoOfClassRequired(
                                                row['Class Requirement'] || '', 
                                                row['Class Duration'] || ''
                                            );
                                        }

                                        return (
                                            <td key={`${idx}-${col}`} className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 last:border-none max-w-[200px] overflow-hidden text-ellipsis">
                                                {displayValue || <span className="text-gray-300">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {filteredData.length === 0 && loading.status === 'success' && (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-gray-400">
                                    No programs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[30px]">
                <div className="flex items-center space-x-2">
                    <span>
                        {filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                        {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}
                    </span>
                </div>

                <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => setCurrentPage(1)} 
                        disabled={currentPage === 1}
                        className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    
                    <span className="min-w-[20px] text-center font-bold text-gray-700">
                        {currentPage}
                    </span>
                    
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => setCurrentPage(totalPages)} 
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>

        {/* Details Panel */}
        {selectedProgram && (
            <ProgramDetailsPanel 
                program={selectedProgram}
                allPrograms={programData}
                diuEmployeeData={diuEmployeeData}
                onClose={() => setSelectedProgram(null)}
                onUpdate={handlePanelUpdate}
            />
        )}
      </div>

      <button
          onClick={handleAdd}
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center z-40 hover:bg-blue-700 active:scale-90 transition-all hover:scale-105"
      >
          <Plus className="w-7 h-7" />
      </button>

      {/* Add Modal */}
      <EditEntryModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode={editMode}
          title='Add Program'
          sheetName={SHEET_NAMES.PROGRAM}
          columns={editColumns}
          initialData={editingRow}
          keyColumn="PID"
          spreadsheetId={REF_SHEET_ID}
          fieldOptions={fieldOptions}
          multiSelectFields={multiSelectFields}
          transformData={transformDataForSubmit}
          onSuccess={handleModalSuccess}
      />
    </div>
  );
};
