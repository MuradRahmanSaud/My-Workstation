
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProgramDataRow } from '../types';
import { RefreshCw, Plus, GraduationCap, School } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { EditEntryModal } from '../components/EditEntryModal';
import { ProgramLeftPanel } from '../components/ProgramLeftPanel';
import { ProgramDashboard } from '../components/ProgramDashboard';
import { ProgramRightPanel } from '../components/ProgramRightPanel';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { normalizeId } from '../services/sheetService';

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
  const { data: allSections, programData, diuEmployeeData, teacherData, loading, reloadData, updateProgramData, semesterFilter, setSemesterFilter, uniqueSemesters } = useSheetData();
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

  const stats = useMemo(() => {
      if (!selectedProgram) return { uniqueCourses: 0, totalSections: 0, uniqueTeachers: 0, totalStudents: 0, unassigned: 0, lowEnrollment: 0, avgProgress: 0 };
      
      let programSections = allSections.filter(s => normalizeId(s.PID) === normalizeId(selectedProgram.PID));
      if (semesterFilter !== 'All') {
          programSections = programSections.filter(s => s.Semester === semesterFilter);
      }
      
      const uniqueCourses = new Set(programSections.map(s => s['Course Code'])).size;
      const totalSections = programSections.length;
      const uniqueTeachers = new Set(programSections.map(s => s['Teacher ID']).filter(id => id && id !== 'TBA')).size;
      const totalStudents = programSections.reduce((acc, s) => acc + parseInt(s.Student || '0', 10), 0);
      const unassigned = programSections.filter(s => !s['Teacher ID'] || s['Teacher ID'] === 'TBA').length;
      const lowEnrollment = programSections.filter(s => parseInt(s.Student || '0', 10) > 0 && parseInt(s.Student || '0', 10) < 10).length;

      let totalPct = 0;
      let validPctCount = 0;
      programSections.forEach(s => {
          const req = parseFloat(s.ClassRequirement || '0');
          const taken = parseFloat(s['Class Taken'] || '0');
          if (req > 0) {
              totalPct += (taken / req) * 100;
              validPctCount++;
          }
      });
      const avgProgress = validPctCount > 0 ? Math.round(totalPct / validPctCount) : 0;

      return { uniqueCourses, totalSections, uniqueTeachers, totalStudents, unassigned, lowEnrollment, avgProgress };
  }, [allSections, selectedProgram, semesterFilter]);

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

  const handleEditItem = (e: React.MouseEvent | null, row: ProgramDataRow) => {
      if (e) e.stopPropagation();
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
          'Dean': extractIds(data.Dean),
          'Associate Dean': extractIds(data['Associate Dean']),
          'Faculty Administration': extractIds(data['Faculty Administration']),
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

      <div className="flex-1 overflow-hidden flex flex-row relative">
        <ProgramLeftPanel 
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            selectedFaculty={selectedFaculty} setSelectedFaculty={setSelectedFaculty} faculties={faculties}
            selectedType={selectedType} setSelectedType={setSelectedType}
            selectedSemesterMode={selectedSemesterMode} setSelectedSemesterMode={setSelectedSemesterMode}
            semesterFilter={semesterFilter} setSemesterFilter={setSemesterFilter} uniqueSemesters={uniqueSemesters}
            sortedGroupKeys={sortedGroupKeys} groupedData={groupedData}
            selectedProgram={selectedProgram} onSelectProgram={setSelectedProgram} onEditProgram={handleEditItem}
            facultyColors={FACULTY_CHIP_COLORS} facultyHeaderColors={FACULTY_HEADER_COLORS}
            loading={loading.status === 'loading' && programData.length === 0}
        />

        <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col lg:flex-row">
            {selectedProgram ? (
                <>
                    <ProgramDashboard stats={stats} />
                    <ProgramRightPanel 
                        program={selectedProgram} 
                        diuEmployeeData={diuEmployeeData} 
                        teacherData={teacherData}
                        onEdit={(p) => handleEditItem(null, p)}
                    />
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
                    <School className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-sm font-medium">Select a program to view details</p>
                </div>
            )}
        </div>

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
          columns={['PID','Faculty Short Name','Faculty Full Name','Program Full Name','Program Short Name','Department Name','Program Type','Semester Type','Semester Duration Num','Theory Duration','Lab Duration','Theory Requirement','Lab Requirement','Dean', 'Associate Dean', 'Faculty Administration', 'Head','Associate Head','Administration']}
          hiddenFields={['Class Duration', 'Class Requirement', 'Semester Duration']}
          initialData={editingRow}
          keyColumn="PID"
          spreadsheetId={REF_SHEET_ID}
          fieldOptions={{
              'Dean': employeeOptions,
              'Associate Dean': employeeOptions,
              'Faculty Administration': employeeOptions,
              'Head': employeeOptions,
              'Associate Head': employeeOptions,
              'Administration': employeeOptions
          }}
          multiSelectFields={['Dean', 'Associate Dean', 'Faculty Administration', 'Head', 'Associate Head', 'Administration']}
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
