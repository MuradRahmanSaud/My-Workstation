
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, List, CheckCircle, XCircle, ChevronDown, GraduationCap, ClipboardList, Users, Banknote, AlertTriangle, PowerOff, Clock, Table, FilterX } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
// Fix: Import isValEmpty from EmployeeView to resolve 'Cannot find name isValEmpty' error
import { isValEmpty } from './EmployeeView';
import { normalizeId } from '../services/sheetService';

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
  
  const [registeredSearchTerm, setRegisteredSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const sortedSemesters = useMemo(() => {
      const keys = Array.from(studentDataLinks.keys()) as string[];
      
      const seasonWeight: Record<string, number> = { 
        'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3
      };

      // Sort descending: Latest Year first, then Latest Season weight
      return keys.sort((a, b) => {
        const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
        const matchA = a.match(regex);
        const matchB = b.match(regex);
        
        if (!matchA || !matchB) return b.localeCompare(a);

        let yearA = parseInt(matchA[2], 10);
        if (yearA < 100) yearA += 2000;
        const seasonA = matchA[1].toLowerCase(); 

        let yearB = parseInt(matchB[2], 10);
        if (yearB < 100) yearB += 2000;
        const seasonB = matchB[1].toLowerCase();
        
        if (yearA !== yearB) return yearB - yearA;
        return (seasonWeight[seasonB] || 0) - (seasonWeight[seasonA] || 0);
      });
  }, [studentDataLinks]);

  useEffect(() => {
      if (sortedSemesters.length > 0 && !selectedSemester) setSelectedSemester(sortedSemesters[0]);
  }, [sortedSemesters, selectedSemester]);

  useEffect(() => {
      if (registeredData.length === 0) loadRegisteredData();
  }, [registeredData.length, loadRegisteredData]);

  // Dynamically derive columns from registeredData to mirror the Google Sheet structure
  const registeredColumns = useMemo(() => {
      if (registeredData.length === 0) return [];
      // Get all keys from the first row, filtering out empty ones to mirror sheet headers
      return Object.keys(registeredData[0]).filter(k => k.trim() !== '');
  }, [registeredData]);

  useEffect(() => {
      if (registeredColumns.length > 0 && !selectedRegisteredSemester) {
          setSelectedRegisteredSemester(registeredColumns[0]);
      }
  }, [registeredColumns, selectedRegisteredSemester]);

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

  const registeredIdSetForFilter = useMemo(() => {
      const set = new Set<string>();
      if (!selectedRegisteredSemester || registeredData.length === 0) return set;
      registeredData.forEach(row => {
          const val = row[selectedRegisteredSemester];
          if (val) set.add(normalizeId(String(val)));
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
          String(row['Student Name'] || '').toLowerCase().includes(lower) || 
          normalizeId(String(row['Student ID'] || '')).includes(normalizeId(lower)) || 
          String(row.Mobile || '').includes(lower) ||
          (row['Father Name'] || '').toLowerCase().includes(lower) ||
          (row['Mother Name'] || '').toLowerCase().includes(lower) ||
          (row['Mentor'] || '').toLowerCase().includes(lower) ||
          (row['Disciplinary Action'] || '').toLowerCase().includes(lower) ||
          (row['Dropout Classification'] || '').toLowerCase().includes(lower) ||
          (row['Discussion Remark'] || '').toLowerCase().includes(lower)
      );
  }, [activeData, searchTerm, viewMode]);

  const filteredRegisteredData = useMemo(() => {
      if (!registeredSearchTerm || viewMode !== 'registered') return activeData;
      const cleanSearch = normalizeId(registeredSearchTerm);
      // Filter rows by checking if ANY column in that row matches the search term
      return activeData.filter(row => 
          Object.values(row).some(val => normalizeId(String(val)).includes(cleanSearch))
      );
  }, [activeData, registeredSearchTerm, viewMode]);

  const displayData = useMemo(() => {
      return viewMode === 'details' ? filteredDetailsData : filteredRegisteredData;
  }, [viewMode, filteredDetailsData, filteredRegisteredData]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(displayData);

  const detailColumns = [
    'SL', 
    'Program', 
    'Student ID', 
    'Student Name', 
    'Credit Req', 
    'Credit Com', 
    'Dues',
    'Mentor',
    'Father Name',
    'Father Mob',
    'Mother Name',
    'Mother Mob',
    'Def Reg', 
    'Def Type',
    'Supervisor', 
    'Def Status', 
    'Deg Status', 
    'Disc. Action',
    'Dropout Class',
    'Discussion Remark',
    'Mobile', 
    'Status'
  ];

  const handleRefresh = async () => {
      setIsManualRefreshing(true);
      try {
          // Force reload admitted metadata (includes links and registered database)
          await reloadData('admitted', true);
          if (viewMode === 'details' && selectedSemester) {
              await loadStudentData(selectedSemester, true);
          }
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
             <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg p-0.5 shadow-sm overflow-hidden mr-2">
                 <button
                    onClick={() => setViewMode('details')}
                    className={`flex items-center px-3 py-1 text-[11px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === 'details' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                    <List className="w-3.5 h-3.5 mr-1.5" />
                    Details
                 </button>
                 <button
                    onClick={() => setViewMode('registered')}
                    className={`flex items-center px-3 py-1 text-[11px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === 'registered' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                    <Table className="w-3.5 h-3.5 mr-1.5" />
                    Registered DB
                 </button>
             </div>
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
                            className="text-[10px] font-black border-gray-200 rounded-full focus:ring-blue-500 py-1.5 pl-2 pr-6 bg-white cursor-pointer hover:border-blue-300 transition-colors uppercase text-slate-600 shadow-sm"
                        >
                            {sortedSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select 
                            value={selectedRegisteredSemester} 
                            onChange={(e) => setSelectedRegisteredSemester(e.target.value)}
                            className="text-[10px] font-black border-gray-200 rounded-full focus:ring-green-500 py-1.5 pl-2 pr-6 bg-white cursor-pointer hover:border-green-300 transition-colors uppercase text-green-600 shadow-sm"
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
                    placeholder={viewMode === 'details' ? "Search by ID or Name..." : "Search in Database..."} 
                    value={viewMode === 'details' ? searchTerm : registeredSearchTerm}
                    onChange={(e) => viewMode === 'details' ? setSearchTerm(e.target.value) : setRegisteredSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 lg:w-64 outline-none transition-all shadow-sm"
                />
            </div>

            <button 
                onClick={handleRefresh}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                title="Refresh All Data"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>,
          headerActionsTarget
      )}

        <div className="flex-1 overflow-hidden bg-white rounded border border-gray-200 shadow-sm relative flex flex-col">
            {isLoading ? (
                <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-blue-600 font-black uppercase tracking-widest animate-pulse">{progressMessage}</p>
                </div>
            ) : displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FilterX className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-[0.2em]">No records found</p>
                    <button onClick={() => { setSearchTerm(''); setRegisteredSearchTerm(''); }} className="mt-4 px-4 py-1.5 text-[10px] font-black uppercase border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 transition-all">Clear Search</button>
                </div>
            ) : (
                <div className="flex-1 overflow-auto relative thin-scrollbar" ref={containerRef}>
                    <table className="w-full text-left border-collapse border-separate border-spacing-0">
                        <thead className="bg-slate-800 sticky top-0 z-10 shadow-md">
                            <tr>
                                {(viewMode === 'details' ? detailColumns : registeredColumns).map((col, idx) => (
                                    <th 
                                        key={idx} 
                                        className={`px-3 py-2.5 text-[10px] font-black text-white uppercase tracking-widest border-b border-slate-700 border-r border-slate-700 last:border-r-0 whitespace-nowrap ${col === 'SL' ? 'w-1' : ''} text-center`}
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.map((row, idx) => {
                                return (
                                    <tr key={idx} className="hover:bg-blue-50/60 transition-colors text-[11px] text-gray-700 leading-none h-[34px]">
                                        {viewMode === 'details' ? (
                                            <>
                                                <td className="px-2 py-1 text-center w-1 text-gray-400 font-bold border-r border-gray-50">{row.SL}</td>
                                                <td className="px-2 py-1 text-center font-bold text-gray-500 whitespace-nowrap border-r border-gray-50">
                                                    {(() => {
                                                        const pid = row.PID;
                                                        const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                        const shortName = programMap.get(normalize(pid));
                                                        return shortName ? `${pid} ${shortName}` : pid;
                                                    })()}
                                                </td>
                                                <td className="px-2 py-1 font-black text-blue-600 font-mono text-center border-r border-gray-50">
                                                    {row['Student ID']}
                                                </td>
                                                <td className="px-2 py-1 font-bold text-slate-800 border-r border-gray-50">{row['Student Name']}</td>
                                                
                                                <td className="px-2 py-1 text-center text-gray-600 border-r border-gray-50">{row['Credit Requirement'] || '-'}</td>
                                                <td className="px-2 py-1 text-center font-bold text-slate-700 border-r border-gray-50">{row['Credit Completed'] || '-'}</td>
                                                
                                                <td className="px-2 py-1 text-center font-black text-red-600 border-r border-gray-50">{row['Dues'] || '-'}</td>

                                                <td className="px-2 py-1 text-left truncate max-w-[120px] border-r border-gray-50" title={row['Mentor']}>{row['Mentor'] || '-'}</td>
                                                <td className="px-2 py-1 text-left truncate max-w-[120px] border-r border-gray-50" title={row['Father Name']}>{row['Father Name'] || '-'}</td>
                                                <td className="px-2 py-1 text-left text-[10px] font-mono text-gray-500 border-r border-gray-50">{row['Father Mobile'] || '-'}</td>
                                                <td className="px-2 py-1 text-left truncate max-w-[120px] border-r border-gray-50" title={row['Mother Name']}>{row['Mother Name'] || '-'}</td>
                                                <td className="px-2 py-1 text-left text-[10px] font-mono text-gray-500 border-r border-gray-50">{row['Mother Mobile'] || '-'}</td>

                                                <td className="px-2 py-1 text-center text-gray-500 border-r border-gray-50">{row['Defense Registration'] || '-'}</td>
                                                <td className="px-2 py-1 text-center italic text-blue-500 font-bold border-r border-gray-50">{row['Defense Type'] || '-'}</td>
                                                <td className="px-2 py-1 text-left truncate max-w-[120px] border-r border-gray-50" title={row['Defense Supervisor']}>{row['Defense Supervisor'] || '-'}</td>
                                                <td className="px-2 py-1 text-center italic text-gray-500 border-r border-gray-50">{row['Defense Status'] || '-'}</td>
                                                <td className="px-2 py-1 text-center font-bold text-purple-600 border-r border-gray-50">{row['Degree Status'] || '-'}</td>

                                                <td className="px-2 py-1 text-center truncate max-w-[150px] border-r border-gray-50" title={row['Disciplinary Action']}>
                                                    {!isValEmpty(row['Disciplinary Action']) ? (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                                            Active
                                                        </span>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>

                                                <td className="px-2 py-1 text-center whitespace-nowrap border-r border-gray-50">
                                                    {(() => {
                                                        const dropClass = row['Dropout Classification'] || '';
                                                        if (isValEmpty(dropClass)) return <span className="text-gray-300">-</span>;
                                                        
                                                        const isPerm = dropClass.includes('Permanent');
                                                        const isTemp = dropClass.includes('Temporary');
                                                        
                                                        return (
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter ${
                                                                isPerm ? 'bg-red-50 text-red-700 border-red-200' : 
                                                                isTemp ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                                                'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}>
                                                                {isPerm ? <PowerOff className="w-2.5 h-2.5 mr-1" /> : isTemp ? <Clock className="w-2.5 h-2.5 mr-1" /> : null}
                                                                {dropClass}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                <td className="px-2 py-1 text-left truncate max-w-[150px] border-r border-gray-50" title={row['Discussion Remark']}>
                                                    {row['Discussion Remark'] || '-'}
                                                </td>

                                                <td className="px-2 py-1 text-gray-600 font-mono border-r border-gray-50 text-center">{row.Mobile || '-'}</td>
                                                <td className="px-2 py-1 text-center">
                                                    {registeredIdSetForFilter.has(normalizeId(String(row['Student ID']))) ? (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700"><CheckCircle className="w-2.5 h-2.5 mr-1" />Registered</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700"><XCircle className="w-2.5 h-2.5 mr-1" />Unreg</span>
                                                    )}
                                                </td>
                                            </>
                                        ) : (
                                            registeredColumns.map((col, cIdx) => (
                                                <td key={cIdx} className="px-3 py-1 font-bold text-slate-600 text-center whitespace-nowrap border-r border-gray-50 last:border-r-0">
                                                    {row[col] ? (
                                                        <span className="text-blue-600 font-mono tracking-tighter">{row[col]}</span>
                                                    ) : '-'}
                                                </td>
                                            ))
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="bg-slate-50 px-4 py-2 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-black uppercase shrink-0 h-[40px] select-none rounded-b-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                <span>{displayData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, displayData.length)} of {displayData.length} Records</span>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 hover:bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-30 transition-all"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <div className="flex items-center px-4 py-1 bg-white border border-gray-200 rounded-lg shadow-sm font-black text-slate-700">
                        {currentPage} / {totalPages || 1}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-30 transition-all"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </div>
    </div>
  );
};
