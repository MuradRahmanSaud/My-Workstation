
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCw, BarChart3, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { ClassRoomTable } from '../components/ClassRoomTable';
import { ClassRoomDistributionReport } from '../components/ClassRoomDistributionReport';
import { EditEntryModal } from '../components/EditEntryModal';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { ClassRoomDataRow } from '../types';

export const ClassRoomView: React.FC = () => {
  const { classroomData, programData, data: sectionData, loading, reloadData, updateClassroomData } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportMode, setIsReportMode] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<ClassRoomDataRow | undefined>(undefined);

  const filteredData = useMemo(() => {
    if (!searchTerm) return classroomData;
    const lower = searchTerm.toLowerCase();
    return classroomData.filter(item => 
      Object.values(item).some(val => String(val).toLowerCase().includes(lower))
    );
  }, [classroomData, searchTerm]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(filteredData);

  const handleEdit = (row: ClassRoomDataRow) => {
      setEditMode('edit');
      setEditingRow(row);
      setIsEditModalOpen(true);
  };

  const handleModalSuccess = (newData: any) => {
      if (!newData) return;
      if (editMode === 'add') updateClassroomData(prev => [newData, ...prev]);
      else {
          const originalRoom = editingRow?.Room;
          if (originalRoom) updateClassroomData(prev => prev.map(row => row.Room === originalRoom ? { ...row, ...newData } : row));
      }
  };

  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50 relative">
      
      {headerTitleTarget && createPortal(
          <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
             <div className="flex items-center bg-gray-100 border border-gray-200 rounded p-0.5 shadow-sm mr-2">
                <button onClick={() => setIsReportMode(false)} className={`p-1 rounded transition-colors ${!isReportMode ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><List className="w-3.5 h-3.5" /></button>
                <button onClick={() => setIsReportMode(true)} className={`p-1 rounded transition-colors ${isReportMode ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="Report View"><BarChart3 className="w-3.5 h-3.5" /></button>
             </div>
             <div className="flex flex-col">
                <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">
                    {isReportMode ? 'Distribution' : 'Class Room List'}
                </h2>
                {!isReportMode && <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1 rounded border border-gray-200">{filteredData.length} Rooms</span>}
             </div>
          </div>,
          headerTitleTarget
      )}

      {headerActionsTarget && createPortal(
          <div className="flex items-center space-x-1 md:space-x-2 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
            {!isReportMode && (
                <>
                    <div className="relative group hidden sm:block">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 lg:w-64 outline-none transition-all" />
                    </div>
                    <button onClick={() => { setEditMode('add'); setEditingRow(undefined); setIsEditModalOpen(true); }} className="hidden lg:flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[11px] font-bold transition-all shadow-sm active:scale-95"><Plus className="w-3 h-3 mr-1" />Add Room</button>
                </>
            )}
            <button onClick={() => reloadData('sections', true)} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} /></button>
          </div>,
          headerActionsTarget
      )}

      <div className="flex-1 overflow-hidden bg-white rounded border border-gray-200 shadow-sm relative flex flex-col">
        {isReportMode ? (
            <ClassRoomDistributionReport data={classroomData} programData={programData} sectionData={sectionData} />
        ) : (
            <>
                <div className="flex-1 overflow-auto relative" ref={containerRef}>
                    <ClassRoomTable data={paginatedData} programData={programData} onEdit={handleEdit} />
                </div>
                <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[30px]">
                    <span>{filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}</span>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="min-w-[20px] text-center font-bold text-gray-700">{currentPage}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </>
        )}
      </div>

      <EditEntryModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} mode="edit" title={editMode === 'add' ? 'Add New Room' : 'Edit Room'} sheetName={SHEET_NAMES.CLASSROOM} columns={['PID','Building','Floor','Room','Room Type','Capacity','Slot Duration','Slot Per Room','Shared Program']} initialData={editingRow} keyColumn="Room" spreadsheetId={REF_SHEET_ID} onSuccess={handleModalSuccess} />
    </div>
  );
};