import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
// Fix: Added ChevronDown to imports from lucide-react
import { RefreshCw, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, List, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

export const StudentView: React.FC = () => {
  const { 
      studentDataLinks, 
      studentCache, 
      loadStudentData, 
      loading: appLoading, 
      programData,
      registeredData,
      loadRegisteredData,
      reloadData
  } = useSheetData();
  
  const [viewMode, setViewMode] = useState<'details' | 'registered'>('details');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedRegisteredSemester, setSelectedRegisteredSemester] = useState('');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  const [registeredColumns, setRegisteredColumns] = useState<string[]>([]);
  const [registeredSearchTerm, setRegisteredSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const sortedSemesters = useMemo(() => Array.from(studentDataLinks.keys()), [studentDataLinks]);

  useEffect(() => {
      if (sortedSemesters.length > 0 && !selectedSemester) setSelectedSemester(sortedSemesters[0]);
  }, [sortedSemesters, selectedSemester]);

  useEffect(() => {
      if (registeredData.length === 0) loadRegisteredData();
  }, [registeredData.length, loadRegisteredData]);

  useEffect(() => {
      if (registeredData.length > 0) {
          const columns = Object.keys(registeredData[0]).filter(k => k.trim() !== '');
          setRegisteredColumns(columns);
          if (columns.length > 0 && !selectedRegisteredSemester) setSelectedRegisteredSemester(columns[0]); 
      }
  }, [registeredData, selectedRegisteredSemester]);

  useEffect(() => {
      if (viewMode === 'details' && selectedSemester) {
          if (!studentCache.has(selectedSemester)) loadStudentData(selectedSemester);
      }
  }, [selectedSemester, studentCache, viewMode, loadStudentData]);

  const programMap = useMemo(() => {
      const map = new Map<string, string>();
      const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      programData.forEach(p => {
          if (p.PID && p['Program Short Name']) map.set(normalize(p.PID), p['Program Short Name']);
      });
      return map;
  }, [programData]);

  const registeredIdSet = useMemo(() => {
      const set = new Set<string>();
      if (!selectedRegisteredSemester || registeredData.length === 0) return set;
      registeredData.forEach(row => {
          const val = row[selectedRegisteredSemester];
          if (val) set.add(String(val).trim());
      });
      return set;
  }, [registeredData, selectedRegisteredSemester]);

  const activeData = useMemo(() => {
      if (viewMode === 'details') return selectedSemester ? (studentCache.get(selectedSemester) || []) : [];
      return registeredData;
  }, [viewMode, selectedSemester, studentCache, registeredData]);

  const isDetailsLoading = viewMode === 'details' && selectedSemester && !studentCache.has(selectedSemester);
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
      return activeData.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lower)));
  }, [activeData, registeredSearchTerm, viewMode]);

  const displayData = viewMode === 'details' ? filteredDetailsData : filteredRegisteredData;
  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(displayData);

  const detailColumns = ['SL', 'Program', 'Student ID', 'Student Name', 'Sex', 'Mobile', 'Email', 'Status'];

  const handleRefresh = async () => {
      setIsManualRefreshing(true);
      try {
          await reloadData('admitted');
          if (viewMode === 'details' && selectedSemester) await loadStudentData(selectedSemester, true);
      } catch (e) {
          console.error('Refresh failed', e);
      } finally {
          setIsManualRefreshing(false);
      }
  };

  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50 relative">
      
      {headerTitleTarget && createPortal(
          <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
             <button
                onClick={() => setViewMode(prev => prev === 'details' ? 'registered' : 'details')}
                className={`flex items-center px-2 py-1 text-[11px] font-bold rounded border transition-all ${viewMode === 'registered' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-gray-600 hover:bg-gray-50 border-gray-200'}`}
             >
                <List className="w-3.5 h-3.5 mr-1.5" />
                {viewMode === 'details' ? 'Registered View' : 'Details View'}
             </button>
             <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                {displayData.length} Records
             </span>
          </div>,
          headerTitleTarget
      )}

      {headerActionsTarget && createPortal(
          <div className="flex items-center space-x-1 md:space-x-2 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
             {viewMode === 'details' && (
                 <div className="flex items-center space-x-2 mr-1">
                    <div className="relative">
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="text-[10px] font-bold border-gray-200 rounded-full focus:ring-blue-500 py-1 pl-2 pr-6 bg-white cursor-pointer hover:border-blue-300 transition-colors"
                        >
                            {sortedSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedRegisteredSemester} 
                            onChange={(e) => setSelectedRegisteredSemester(e.target.value)}
                            className="text-[10px] font-bold border-gray-200 rounded-full focus:ring-green-500 py-1 pl-2 pr-6 bg-white cursor-pointer hover:border-green-300 transition-colors"
                        >
                            {registeredColumns.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                 </div>
             )}

            <div className="relative group hidden sm:block">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={viewMode === 'details' ? searchTerm : registeredSearchTerm}
                    onChange={(e) => viewMode === 'details' ? setSearchTerm(e.target.value) : setRegisteredSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 outline-none transition-all"
                />
            </div>

            <button 
                onClick={handleRefresh}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                title="Refresh Data"
            >
                <RefreshCw className={`w-4 h-4 ${appLoading.status === 'loading' || isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>,
          headerActionsTarget
      )}

        <div className="flex-1 overflow-hidden bg-white rounded border border-gray-200 shadow-sm relative flex flex-col">
            {isLoading ? (
                <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-blue-600 font-medium animate-pulse">{progressMessage}</p>
                </div>
            ) : displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">No data found.</p>
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
                                            <td className="px-1 py-1 text-center w-1">{row.SL}</td>
                                            <td className="px-1 py-1 text-center font-bold text-gray-500 whitespace-nowrap">
                                                {(() => {
                                                    const pid = row.PID;
                                                    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                    const shortName = programMap.get(normalize(pid));
                                                    return shortName ? `${pid} ${shortName}` : pid;
                                                })()}
                                            </td>
                                            <td className="px-1 py-1 font-bold text-blue-600">{row['Student ID']}</td>
                                            <td className="px-1 py-1">{row['Student Name']}</td>
                                            <td className="px-1 py-1 text-center">{row.Sex}</td>
                                            <td className="px-1 py-1 text-gray-600">{row.Mobile}</td>
                                            <td className="px-1 py-1 text-gray-500">{row.Email}</td>
                                            <td className="px-1 py-1 text-center">
                                                {registeredIdSet.has(String(row['Student ID']).trim()) ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700"><CheckCircle className="w-2.5 h-2.5 mr-1" />Registered</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700"><XCircle className="w-2.5 h-2.5 mr-1" />Unreg</span>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        registeredColumns.map((col) => (
                                            <td key={col} className="px-1 py-1 font-medium text-gray-600 text-center whitespace-nowrap">
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

            <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[30px]">
                <span>{displayData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, displayData.length)} of {displayData.length}</span>
                <div className="flex items-center space-x-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="min-w-[20px] text-center font-bold text-gray-700">{currentPage}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </div>
    </div>
  );
};