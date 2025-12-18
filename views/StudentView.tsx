
import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, List, CheckCircle, XCircle } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

export const StudentView: React.FC = () => {
  const { 
      studentDataLinks, 
      studentCache, 
      loadStudentData, 
      loading: appLoading, 
      programData,
      registeredData, // Use from context
      loadRegisteredData, // Use from context
      reloadData
  } = useSheetData();
  
  // View Mode: 'details' (standard student list) or 'registered' (dynamic sheet)
  const [viewMode, setViewMode] = useState<'details' | 'registered'>('details');
  
  // Local State
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedRegisteredSemester, setSelectedRegisteredSemester] = useState('');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Registered Columns (derived from context data)
  const [registeredColumns, setRegisteredColumns] = useState<string[]>([]);
  const [registeredSearchTerm, setRegisteredSearchTerm] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  
  // Get sorted semesters from student data links
  const sortedSemesters = useMemo(() => {
      // Use the order from the sheet (insertion order in Map) to match Google Sheet rows exactly
      return Array.from(studentDataLinks.keys());
  }, [studentDataLinks]);

  // Auto-select latest source semester
  useEffect(() => {
      if (sortedSemesters.length > 0 && !selectedSemester) {
          setSelectedSemester(sortedSemesters[0]);
      }
  }, [sortedSemesters, selectedSemester]);

  // Load Registered Data on mount
  useEffect(() => {
      if (registeredData.length === 0) {
          loadRegisteredData();
      }
  }, [registeredData.length, loadRegisteredData]);

  // Update columns and auto-select semester when registered data loads
  useEffect(() => {
      if (registeredData.length > 0) {
          const columns = Object.keys(registeredData[0]).filter(k => k.trim() !== '');
          setRegisteredColumns(columns);
          
          if (columns.length > 0 && !selectedRegisteredSemester) {
               setSelectedRegisteredSemester(columns[0]); 
          }
      }
  }, [registeredData, selectedRegisteredSemester]);

  // Check cache and load student details data if needed
  useEffect(() => {
      if (viewMode === 'details' && selectedSemester) {
          if (!studentCache.has(selectedSemester)) {
              loadStudentData(selectedSemester);
          }
      }
  }, [selectedSemester, studentCache, viewMode, loadStudentData]);

  // Create Program Map for PID lookup
  const programMap = useMemo(() => {
      const map = new Map<string, string>();
      const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      programData.forEach(p => {
          if (p.PID && p['Program Short Name']) {
              map.set(normalize(p.PID), p['Program Short Name']);
          }
      });
      return map;
  }, [programData]);

  // Registered IDs Set for fast lookup
  const registeredIdSet = useMemo(() => {
      const set = new Set<string>();
      if (!selectedRegisteredSemester || registeredData.length === 0) return set;

      registeredData.forEach(row => {
          const val = row[selectedRegisteredSemester];
          if (val) {
              set.add(String(val).trim());
          }
      });
      return set;
  }, [registeredData, selectedRegisteredSemester]);

  // Determine active data based on cache for 'details' or context for 'registered'
  const activeData = useMemo(() => {
      if (viewMode === 'details') {
          return selectedSemester ? (studentCache.get(selectedSemester) || []) : [];
      } else {
          return registeredData;
      }
  }, [viewMode, selectedSemester, studentCache, registeredData]);

  const isDetailsLoading = viewMode === 'details' && selectedSemester && !studentCache.has(selectedSemester);
  // We assume registered data is loading if empty and we just triggered it, 
  // but context doesn't expose strict loading state for it. Using array length check is a proxy.
  const isRegisteredLoading = viewMode === 'registered' && registeredData.length === 0 && appLoading.status !== 'error'; 
  
  const isLoading = isDetailsLoading || isRegisteredLoading || isManualRefreshing;
  const progressMessage = isManualRefreshing ? 'Refreshing data...' : (isDetailsLoading ? 'Loading Student Data...' : 'Loading Registered Data...');

  const filteredDetailsData = useMemo(() => {
      if (!searchTerm || viewMode !== 'details') return activeData;
      const lower = searchTerm.toLowerCase();
      return activeData.filter(row => 
          row['Student Name'].toLowerCase().includes(lower) || 
          row['Student ID'].includes(lower) || 
          row.Mobile.includes(lower)
      );
  }, [activeData, searchTerm, viewMode]);

  const filteredRegisteredData = useMemo(() => {
      if (!registeredSearchTerm || viewMode !== 'registered') return activeData;
      const lower = registeredSearchTerm.toLowerCase();
      return activeData.filter(row => 
          Object.values(row).some(val => String(val).toLowerCase().includes(lower))
      );
  }, [activeData, registeredSearchTerm, viewMode]);

  // Use pagination for active view
  const displayData = viewMode === 'details' ? filteredDetailsData : filteredRegisteredData;
  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(displayData);

  // Replaced 'PID' with 'Program'
  const detailColumns = ['SL', 'Program', 'Student ID', 'Student Name', 'Sex', 'Mobile', 'Email', 'Status'];

  const handleRefresh = async () => {
      setIsManualRefreshing(true);
      try {
          // Trigger 'admitted' mode refresh which handles global config (student links) and registered data
          await reloadData('admitted');
          
          // Refresh details view if selected
          if (viewMode === 'details' && selectedSemester) {
               await loadStudentData(selectedSemester, true);
          }
      } catch (e) {
          console.error('Refresh failed', e);
      } finally {
          setIsManualRefreshing(false);
      }
  };

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 bg-white p-2 rounded border border-gray-200 shadow-sm shrink-0">
             <div className="flex items-center space-x-4">
                 <button
                    onClick={() => setViewMode(prev => prev === 'details' ? 'registered' : 'details')}
                    className={`flex items-center px-2 py-1 text-xs font-bold rounded border transition-all ${viewMode === 'registered' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                 >
                    <List className="w-3 h-3 mr-1.5" />
                    {viewMode === 'details' ? 'Registered Student' : 'Student Details'}
                 </button>

                 {viewMode === 'details' && (
                     <div className="flex items-center space-x-3">
                        {/* Source Semester Dropdown */}
                        <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-medium text-gray-400 uppercase">Source:</span>
                            <select 
                                value={selectedSemester} 
                                onChange={(e) => setSelectedSemester(e.target.value)}
                                className="text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1"
                            >
                                {sortedSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                {sortedSemesters.length === 0 && <option value="">No Data</option>}
                            </select>
                        </div>

                        {/* Registration Check Semester Dropdown */}
                        <div className="flex items-center space-x-1 border-l border-gray-200 pl-3">
                            <span className="text-[10px] font-medium text-gray-400 uppercase">Reg. Sem:</span>
                            <select 
                                value={selectedRegisteredSemester} 
                                onChange={(e) => setSelectedRegisteredSemester(e.target.value)}
                                className="text-xs border-gray-300 rounded focus:ring-green-500 focus:border-green-500 py-1"
                            >
                                {registeredColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                {registeredColumns.length === 0 && <option value="">Loading...</option>}
                            </select>
                        </div>
                     </div>
                 )}
                 
                 <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-medium border border-blue-200">
                    {displayData.length}
                 </span>
             </div>

             <div className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative group flex-1 md:flex-none">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder={viewMode === 'details' ? "Search students..." : "Search IDs..."}
                        value={viewMode === 'details' ? searchTerm : registeredSearchTerm}
                        onChange={(e) => viewMode === 'details' ? setSearchTerm(e.target.value) : setRegisteredSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-full md:w-48 outline-none transition-all"
                    />
                </div>
                <button 
                    onClick={handleRefresh}
                    className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-200 transition-all"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${appLoading.status === 'loading' || isLoading ? 'animate-spin' : ''}`} />
                </button>
             </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white rounded border border-gray-200 shadow-sm relative flex flex-col">
            {isLoading ? (
                <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-blue-600 font-medium animate-pulse">{progressMessage}</p>
                </div>
            ) : displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">
                        {viewMode === 'details' ? `No student data found for ${selectedSemester}.` : 'No registered student records found.'}
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-auto relative" ref={containerRef}>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                            <tr>
                                {(viewMode === 'details' ? detailColumns : registeredColumns).map((col, idx) => (
                                    <th key={idx} className={`px-1 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col === 'SL' ? 'w-1' : ''} ${viewMode === 'registered' || ['Status', 'Program', 'Sex'].includes(col) ? 'text-center' : 'text-left'}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/60 transition-colors text-[11px] text-gray-700 leading-none h-[29px]">
                                    {viewMode === 'details' ? (
                                        <>
                                            <td className="px-1 py-1 border-r border-transparent align-middle text-center w-1">{row.SL}</td>
                                            <td className="px-1 py-1 text-center font-bold text-gray-500 border-r border-transparent align-middle whitespace-nowrap">
                                                {(() => {
                                                    const pid = row.PID;
                                                    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                    const shortName = programMap.get(normalize(pid));
                                                    return shortName ? `${pid} ${shortName}` : pid;
                                                })()}
                                            </td>
                                            <td className="px-1 py-1 font-bold text-blue-600 border-r border-transparent align-middle">{row['Student ID']}</td>
                                            <td className="px-1 py-1 border-r border-transparent align-middle">{row['Student Name']}</td>
                                            <td className="px-1 py-1 text-center border-r border-transparent align-middle">{row.Sex}</td>
                                            <td className="px-1 py-1 text-gray-600 border-r border-transparent align-middle">{row.Mobile}</td>
                                            <td className="px-1 py-1 text-gray-500 border-r border-transparent align-middle">{row.Email}</td>
                                            <td className="px-1 py-1 text-center border-r border-transparent align-middle">
                                                {registeredIdSet.has(String(row['Student ID']).trim()) ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">
                                                        <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                                        Registered
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">
                                                        <XCircle className="w-2.5 h-2.5 mr-1" />
                                                        Unregistered
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        // Dynamic rendering for registered view
                                        registeredColumns.map((col) => (
                                            <td key={col} className="px-1 py-1 border-r border-transparent font-medium text-gray-600 text-center whitespace-nowrap align-middle">
                                                {row[col]}
                                            </td>
                                        ))
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {displayData.length > 0 && (
                <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[30px]">
                    <div className="flex items-center space-x-2">
                         <span>
                            {displayData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                            {Math.min(currentPage * rowsPerPage, displayData.length)} of {displayData.length}
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
            )}
        </div>
    </div>
  );
};
