
import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, BarChart3, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { ClassRoomTable } from '../components/ClassRoomTable';
import { ClassRoomDistributionReport } from '../components/ClassRoomDistributionReport';
import { EditEntryModal } from '../components/EditEntryModal';
import { SHEET_NAMES } from '../constants';
import { ClassRoomDataRow } from '../types';

export const ClassRoomView: React.FC = () => {
  const { classroomData, programData, data: sectionData, loading, reloadData, updateClassroomData } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportMode, setIsReportMode] = useState(false);
  
  // Edit State
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

  const handleAdd = () => {
      setEditMode('add');
      setEditingRow(undefined);
      setIsEditModalOpen(true);
  };

  const handleEdit = (row: ClassRoomDataRow) => {
      setEditMode('edit');
      setEditingRow(row);
      setIsEditModalOpen(true);
  };

  const handleModalSuccess = (newData: any) => {
      if (!newData) return; // Should not happen with current logic

      if (editMode === 'add') {
          updateClassroomData(prev => [newData, ...prev]); // Prepend new data for visibility
      } else {
          // Edit mode: Find the row by its original key value (Room)
          const originalRoom = editingRow?.Room;
          if (originalRoom) {
              updateClassroomData(prev => prev.map(row => 
                  row.Room === originalRoom ? { ...row, ...newData } : row
              ));
          }
      }
      // Optimistic update done, no reloadData needed
  };

  const columns = [
      'PID',
      'Building',
      'Floor',
      'Room',
      'Room Type',
      'Capacity',
      'Slot Duration',
      'Slot Per Room',
      'Shared Program'
  ];

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50">
      
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 bg-white p-2 rounded border border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
           <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
             {isReportMode ? 'Class Room Distribution Report' : 'Class Room List'}
           </h2>
           {!isReportMode && (
               <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-medium border border-blue-200">
                    {filteredData.length}
               </span>
           )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded p-0.5 shadow-sm mr-2">
                <button 
                    onClick={() => setIsReportMode(false)}
                    className={`p-1 rounded transition-colors ${!isReportMode ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    title="List View"
                >
                    <List className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => setIsReportMode(true)}
                    className={`p-1 rounded transition-colors ${isReportMode ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Report View"
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                </button>
            </div>

            {!isReportMode && (
                <>
                    <button 
                        onClick={handleAdd}
                        className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Room
                    </button>

                    <div className="relative group">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search Rooms..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-48 md:w-64 outline-none transition-all"
                        />
                    </div>
                </>
            )}

            <button 
                onClick={() => reloadData('sections')}
                disabled={loading.status === 'loading'}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-200 transition-all disabled:opacity-50"
                title="Refresh"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white rounded border border-gray-200 shadow-sm relative flex flex-col">
        {loading.status === 'loading' && classroomData.length === 0 && (
            <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}

        {isReportMode ? (
            <ClassRoomDistributionReport 
                data={classroomData} 
                programData={programData} 
                sectionData={sectionData}
            />
        ) : (
            <>
                <div className="flex-1 overflow-auto relative" ref={containerRef}>
                    <ClassRoomTable 
                        data={paginatedData} 
                        programData={programData} 
                        onEdit={handleEdit}
                    />
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
            </>
        )}
      </div>

      {/* Edit Modal */}
      <EditEntryModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode={editMode}
          title={editMode === 'add' ? 'Add New Room' : 'Edit Room'}
          sheetName={SHEET_NAMES.CLASSROOM}
          columns={columns}
          initialData={editingRow}
          keyColumn="Room" // Assuming Room Number is unique or we use a composite key concept. Ideally should have ID. App Script logic uses keyColumn. Let's use Room as key for now.
          onSuccess={handleModalSuccess}
      />
    </div>
  );
};
