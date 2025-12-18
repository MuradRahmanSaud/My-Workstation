import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProgramDataRow } from '../types';
import { Search, RefreshCw, Plus, School, ChevronRight, Pencil, GraduationCap } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { EditEntryModal } from '../components/EditEntryModal';
import { ProgramDetailsPanel } from '../components/ProgramDetailsPanel';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

const FACULTY_CHIP_COLORS: Record<string, string> = {
  'FBE': 'bg-red-100 text-red-700 border-red-200',
  'FE': 'bg-orange-100 text-orange-700 border-orange-200',
  'FHLS': 'bg-amber-100 text-amber-700 border-amber-200',
  'FHSS': 'bg-green-100 text-green-700 border-green-200',
  'FSIT': 'bg-blue-100 text-blue-700 border-blue-200',
};

const FACULTY_HEADER_COLORS: Record<string, string> = {
  'FBE': 'bg-red-50 text-red-800',
  'FE': 'bg-orange-50 text-orange-800',
  'FHLS': 'bg-amber-50 text-amber-800',
  'FHSS': 'bg-green-50 text-green-800',
  'FSIT': 'bg-blue-50 text-blue-800',
};

export const ProgramView: React.FC = () => {
  const { programData, diuEmployeeData, loading, reloadData, updateProgramData } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSemesterMode, setSelectedSemesterMode] = useState<string | null>(null);

  const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);

  useEffect(() => {
    if (programData.length > 0 && !selectedProgram) {
      setSelectedProgram(programData[0]);
    }
  }, [programData, selectedProgram]);

  const faculties = useMemo(() => {
    const set = new Set<string>();
    programData.forEach(p => { if (p['Faculty Short Name']) set.add(p['Faculty Short Name']); });
    return Array.from(set).sort();
  }, [programData]);

  const filteredData = useMemo(() => {
    let filtered = programData;
    if (selectedFaculty !== 'All') filtered = filtered.filter(p => p['Faculty Short Name'] === selectedFaculty);
    if (selectedType) filtered = filtered.filter(p => p['Program Type'] === selectedType);
    if (selectedSemesterMode) filtered = filtered.filter(p => p['Semester Type'] === selectedSemesterMode);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item['Program Short Name'].toLowerCase().includes(lower) ||
        item.PID.toLowerCase().includes(lower) ||
        item['Program Full Name'].toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [programData, searchTerm, selectedFaculty, selectedType, selectedSemesterMode]);

  const groupedData = useMemo(() => {
    const groups: Record<string, ProgramDataRow[]> = {};
    filteredData.forEach(p => {
      const fac = p['Faculty Short Name'] || 'Other';
      if (!groups[fac]) groups[fac] = [];
      groups[fac].push(p);
    });
    return groups;
  }, [filteredData]);

  const sortedGroupKeys = useMemo(() => {
    const order = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
    return Object.keys(groupedData).sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groupedData]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<any>(undefined);

  const handleAdd = () => {
    setEditMode('add');
    setEditingRow({
      'Semester Duration Num': '4',
      'Theory Duration': '90',
      'Lab Duration': '120',
      'Theory Requirement': '0',
      'Lab Requirement': '0'
    });
    setIsEditModalOpen(true);
  };

  const handleEditItem = (e: React.MouseEvent, row: ProgramDataRow) => {
      e.stopPropagation();
      setEditMode('edit');
      const durStr = row['Class Duration'] || '';
      const reqStr = row['Class Requirement'] || '';
      const semDurStr = row['Semester Duration'] || '';
      
      setEditingRow({
          ...row,
          'Theory Duration': (durStr.match(/Theory\s+(\d+)/i) || [])[1] || '90',
          'Lab Duration': (durStr.match(/Lab\s+(\d+)/i) || [])[1] || '120',
          'Theory Requirement': (reqStr.match(/Theory\s+(\d+)/i) || [])[1] || '0',
          'Lab Requirement': (reqStr.match(/Lab\s+(\d+)/i) || [])[1] || '0',
          'Semester Duration Num': (semDurStr.match(/(\d+)/) || [])[1] || '4',
      });
      setIsEditModalOpen(true);
  };

  const handlePanelUpdate = (newData: ProgramDataRow) => {
    updateProgramData(prev => prev.map(row => row.PID === newData.PID ? { ...row, ...newData } : row));
    setSelectedProgram(prev => prev ? { ...prev, ...newData } : prev);
  };

  const transformDataForSubmit = (data: any) => {
      const extractIds = (fieldVal: string) => {
          if (!fieldVal) return '';
          return fieldVal.split(',').map(item => {
              const trimmed = item.trim();
              const match = trimmed.match(/\(([^)]+)\)$/);
              return match ? match[1] : trimmed;
          }).join(', ');
      };
      const tDur = data['Theory Duration'] || '0';
      const lDur = data['Lab Duration'] || '0';
      const combinedDuration = `Theory ${tDur} Minutes, Lab ${lDur} Minutes`;
      const tReq = data['Theory Requirement'] || '0';
      const lReq = data['Lab Requirement'] || '0';
      const combinedRequirement = `Theory ${tReq} Minutes, Lab ${lReq} Minutes`;
      const sDur = data['Semester Duration Num'] || '0';
      const formattedSemDuration = `${sDur} Months`;
      const result = {
          ...data,
          'Class Duration': combinedDuration,
          'Class Requirement': combinedRequirement,
          'Semester Duration': formattedSemDuration,
          'Head': extractIds(data.Head),
          'Associate Head': extractIds(data['Associate Head']),
          'Administration': extractIds(data.Administration)
      };
      delete result['Theory Duration']; delete result['Lab Duration']; delete result['Theory Requirement']; delete result['Lab Requirement']; delete result['Semester Duration Num'];
      return result;
  };

  const employeeOptions = useMemo(() => {
      return diuEmployeeData.map(e => {
          const desig = [e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/');
          return `${e['Employee Name']} - ${desig} (${e['Employee ID']})`;
      }).sort();
  }, [diuEmployeeData]);

  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      
      {headerTitleTarget && createPortal(
          <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
             {selectedProgram ? (
                 <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-[13px] md:text-sm font-bold text-gray-900 truncate leading-tight">
                            {selectedProgram['Program Full Name']}
                        </h2>
                        <p className="text-[10px] text-gray-500 truncate font-medium">
                            {selectedProgram['Faculty Full Name']} (PID: {selectedProgram.PID})
                        </p>
                    </div>
                 </div>
             ) : (
                <div className="flex flex-col">
                    <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">
                        <School className="w-4 h-4 mr-2 text-blue-600" />
                        Programs
                    </h2>
                </div>
             )}
          </div>,
          headerTitleTarget
      )}

      {headerActionsTarget && createPortal(
          <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
            <button 
                onClick={() => reloadData()}
                disabled={loading.status === 'loading'}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
                title="Refresh"
            >
                <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>,
          headerActionsTarget
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-hidden flex flex-row relative">
        
        {/* Left Pane: Sidebar - Narrower at 220px */}
        <div className="w-full md:w-[220px] flex flex-col bg-white border-r border-gray-200 shadow-sm overflow-hidden shrink-0">
            {/* Top Sidebar Filters */}
            <div className="p-2 space-y-2.5 shrink-0 bg-white border-b border-gray-100">
                {/* Faculty chips row */}
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1">
                  <button 
                    onClick={() => setSelectedFaculty('All')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${selectedFaculty === 'All' ? 'bg-[#008080] text-white border-[#006666]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                    All
                  </button>
                  {faculties.map(fac => (
                    <button 
                      key={fac}
                      onClick={() => setSelectedFaculty(fac)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border whitespace-nowrap ${selectedFaculty === fac ? 'ring-2 ring-blue-400 ring-offset-0' : ''} ${FACULTY_CHIP_COLORS[fac] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {fac}
                    </button>
                  ))}
                </div>

                {/* Programs Label */}
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">Programs</div>

                {/* Filter Rows */}
                <div className="space-y-1.5 px-0.5">
                    {/* Program Type Row */}
                    <div className="flex flex-wrap gap-1">
                    {['Graduate', 'Undergraduate'].map((cat) => {
                        const isActive = selectedType === cat;
                        return (
                            <button 
                                key={cat}
                                onClick={() => setSelectedType(isActive ? null : cat)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${isActive ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                    </div>
                    {/* Semester Type Row */}
                    <div className="flex flex-wrap gap-1">
                    {['Bi-Semester', 'Tri-Semester'].map((cat) => {
                        const isActive = selectedSemesterMode === cat;
                        return (
                            <button 
                                key={cat}
                                onClick={() => setSelectedSemesterMode(isActive ? null : cat)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${isActive ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-[11px] outline-none focus:border-blue-500 transition-all placeholder:text-gray-400 font-medium"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto thin-scrollbar bg-white">
                {loading.status === 'loading' && programData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : sortedGroupKeys.map((fac) => (
                    <div key={fac} className="mb-0">
                        <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${FACULTY_HEADER_COLORS[fac] || 'bg-gray-100 text-gray-600'} sticky top-0 z-10 border-b border-gray-100/50`}>
                          {fac}
                        </div>
                        <div className="py-0">
                          {groupedData[fac].map((row) => {
                            const isActive = selectedProgram?.PID === row.PID;
                            return (
                                <div 
                                    key={row.PID}
                                    onClick={() => setSelectedProgram(row)}
                                    className={`px-3 py-2 flex items-center group cursor-pointer transition-colors border-l-4 ${
                                        isActive 
                                        ? 'bg-blue-50/50 border-blue-600' 
                                        : 'bg-white border-transparent hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="w-1 h-1 rounded-full bg-orange-400 mr-2 shrink-0 shadow-sm" />
                                    <div className="flex-1 min-w-0 flex items-baseline">
                                        <span className="text-[10px] font-bold text-gray-400 font-mono w-6 shrink-0">{row.PID}</span>
                                        <span className={`text-[11px] font-medium truncate ${isActive ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>
                                            {row['Program Short Name']}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => handleEditItem(e, row)}
                                            className="p-1 hover:bg-blue-100 rounded text-blue-500 transition-colors"
                                            title="Edit Program"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <ChevronRight className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-gray-300'}`} />
                                    </div>
                                </div>
                            );
                          })}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Pane: Detail View */}
        <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col">
            {selectedProgram ? (
                <ProgramDetailsPanel 
                    program={selectedProgram}
                    allPrograms={programData}
                    diuEmployeeData={diuEmployeeData}
                    onClose={() => setSelectedProgram(null)}
                    onUpdate={handlePanelUpdate}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
                    <School className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-sm font-medium">Select a program to view details</p>
                </div>
            )}
        </div>

        {/* Floating Action Button for New Program */}
        <button
            onClick={handleAdd}
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-30"
            title="Add New Program"
        >
            <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <EditEntryModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode={editMode}
          title={editMode === 'add' ? 'Add Program' : 'Edit Program'}
          sheetName={SHEET_NAMES.PROGRAM}
          columns={['PID','Faculty Short Name','Faculty Full Name','Program Full Name','Program Short Name','Department Name','Program Type','Semester Type','Semester Duration Num','Theory Duration','Lab Duration','Theory Requirement','Lab Requirement','Head','Associate Head','Administration']}
          hiddenFields={['Class Duration', 'Class Requirement', 'Semester Duration']}
          initialData={editingRow}
          keyColumn="PID"
          spreadsheetId={REF_SHEET_ID}
          fieldOptions={{
              'Head': employeeOptions,
              'Associate Head': employeeOptions,
              'Administration': employeeOptions
          }}
          multiSelectFields={['Head', 'Associate Head', 'Administration']}
          transformData={transformDataForSubmit}
          onSuccess={(newData) => {
              if (newData) {
                  if (editMode === 'add') {
                      updateProgramData(prev => [newData, ...prev]);
                      setSelectedProgram(newData);
                  } else {
                      updateProgramData(prev => prev.map(r => r.PID === newData.PID ? newData : r));
                      setSelectedProgram(newData);
                  }
              }
          }}
      />
    </div>
  );
};