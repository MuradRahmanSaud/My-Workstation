
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProgramDataRow, FacultyLeadershipRow, DiuEmployeeRow } from '../types';
import { RefreshCw, Plus, GraduationCap, School } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { EditEntryModal } from '../components/EditEntryModal';
import { ProgramLeftPanel } from '../components/ProgramLeftPanel';
import { ProgramDashboard } from '../components/ProgramDashboard';
import { ProgramRightPanel } from '../components/ProgramRightPanel';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { normalizeId, submitSheetData } from '../services/sheetService';

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
  const { data: allSections, programData, facultyLeadershipData, diuEmployeeData, teacherData, loading, reloadData, updateProgramData, updateFacultyLeadershipData, updateDiuEmployeeData, semesterFilter, setSemesterFilter, uniqueSemesters } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSemesterMode, setSelectedSemesterMode] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);

  // External trigger for Right Panel Edit View
  const [forceEditTrigger, setForceEditTrigger] = useState<number>(0);

  // Add Program Modal State (Only for Add Mode now)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const employeeOptions = useMemo(() => {
      const map = new Map<string, string>();
      diuEmployeeData.forEach(e => {
          const id = e['Employee ID']?.trim();
          if (!id) return;
          const desig = [e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/');
          map.set(normalizeId(id), `${e['Employee Name']} - ${desig} (${id})`);
      });
      teacherData.forEach(t => {
          const id = t['Employee ID']?.trim();
          if (!id) return;
          const normId = normalizeId(id);
          if (!map.has(normId)) {
              map.set(normId, `${t['Employee Name']} - ${t.Designation} (${id})`);
          }
      });
      return Array.from(map.values()).sort();
  }, [diuEmployeeData, teacherData]);

  const employeeFieldOptions = useMemo(() => {
    const depts = new Set<string>(), grps = new Set<string>(), stats = new Set<string>();
    const adminDesigs = new Set<string>(), acadDesigs = new Set<string>();
    diuEmployeeData.forEach(e => {
        if (e.Department) depts.add(e.Department);
        if (e['Group Name']) e['Group Name'].split(',').forEach(g => grps.add(g.trim()));
        if (e.Status) stats.add(e.Status);
        if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']);
        if (e['Academic Designation']) acadDesigs.add(e['Academic Designation']);
    });
    return { 
        'Department': Array.from(depts).sort(), 
        'Group Name': Array.from(grps).sort().filter(Boolean), 
        'Status': ['Active', 'Inactive', 'On Leave'],
        'Administrative Designation': Array.from(adminDesigs).sort().filter(Boolean),
        'Academic Designation': Array.from(acadDesigs).sort().filter(Boolean)
    };
  }, [diuEmployeeData]);

  const extractIds = (fieldVal: string) => {
      if (!fieldVal) return '';
      return fieldVal.split(',').map(item => {
          const trimmed = item.trim();
          const match = trimmed.match(/\(([^)]+)\)$/);
          return match ? match[1] : trimmed;
      }).join(', ');
  };

  const syncEmployeeRoles = async (ids: string, role: string) => {
    if (!ids) return;
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    for (const id of idList) {
        const normId = normalizeId(id);
        const employee = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (employee && employee['Administrative Designation'] !== role) {
            const updated = { ...employee, 'Administrative Designation': role };
            updateDiuEmployeeData(prev => prev.map(e => normalizeId(e['Employee ID']) === normId ? updated : e));
            await submitSheetData('update', SHEET_NAMES.EMPLOYEE, updated, 'Employee ID', employee['Employee ID'].trim(), REF_SHEET_ID);
        }
    }
  };

  const handleSaveFacultyLeadership = async (data: any) => {
      const payload = {
          ...data,
          'Dean': extractIds(data.Dean),
          'Associate Dean': extractIds(data['Associate Dean']),
          'Administration': extractIds(data.Administration)
      };
      updateFacultyLeadershipData(prev => {
          const exists = prev.some(f => f['Faculty Short Name'] === payload['Faculty Short Name']);
          if (exists) return prev.map(f => f['Faculty Short Name'] === payload['Faculty Short Name'] ? payload : f);
          return [...prev, payload];
      });
      await submitSheetData('update', SHEET_NAMES.FACULTY_LEADERSHIP, payload, 'Faculty Short Name', payload['Faculty Short Name'], REF_SHEET_ID);
      await syncEmployeeRoles(payload.Dean, 'Dean');
      await syncEmployeeRoles(payload['Associate Dean'], 'Associate Dean');
      await syncEmployeeRoles(payload.Administration, 'Administration');
  };

  const handleSaveProgramLeadership = async (data: any) => {
      const payload = {
          ...data,
          'Head': extractIds(data.Head),
          'Associate Head': extractIds(data['Associate Head']),
          'Administration': extractIds(data.Administration)
      };
      updateProgramData(prev => prev.map(p => p.PID === payload.PID ? { ...p, ...payload } : p));
      if (selectedProgram?.PID === payload.PID) {
          setSelectedProgram({ ...selectedProgram, ...payload });
      }
      await submitSheetData('update', SHEET_NAMES.PROGRAM, payload, 'PID', payload.PID, REF_SHEET_ID);
      await syncEmployeeRoles(payload.Head, 'Head');
      await syncEmployeeRoles(payload['Associate Head'], 'Associate Head');
      await syncEmployeeRoles(payload.Administration, 'Administration');
  };

  const handleSaveProgramData = async (data: any) => {
      const tDur = data['Theory Duration'] || '0', lDur = data['Lab Duration'] || '0';
      const tReq = data['Theory Requirement'] || '0', lReq = data['Lab Requirement'] || '0';
      const sDurNum = data['Semester Duration Num'] || '4';
      
      const payload = {
          ...data,
          'Class Duration': `Theory ${tDur} Minutes, Lab ${lDur} Minutes`,
          'Class Requirement': `Theory ${tReq} Minutes, Lab ${lReq} Minutes`,
          'Semester Duration': `${sDurNum} Months`
      };
      delete payload['Theory Duration']; delete payload['Lab Duration']; delete payload['Theory Requirement']; delete payload['Lab Requirement']; delete payload['Semester Duration Num'];
      
      updateProgramData(prev => prev.map(p => p.PID === payload.PID ? { ...p, ...payload } : p));
      setSelectedProgram(prev => prev?.PID === payload.PID ? { ...prev, ...payload } : prev);
      
      // Update Program_DB
      await submitSheetData('update', SHEET_NAMES.PROGRAM, payload, 'PID', payload.PID, REF_SHEET_ID);

      // Sychronize Faculty Full Name with Faculty_DB if changed
      const facultyShort = payload['Faculty Short Name'];
      const facultyFull = payload['Faculty Full Name'];
      const existingFaculty = facultyLeadershipData.find(f => f['Faculty Short Name'] === facultyShort);
      
      if (existingFaculty && existingFaculty['Faculty Full Name'] !== facultyFull) {
          const updatedFaculty = { ...existingFaculty, 'Faculty Full Name': facultyFull };
          updateFacultyLeadershipData(prev => prev.map(f => f['Faculty Short Name'] === facultyShort ? updatedFaculty : f));
          await submitSheetData('update', SHEET_NAMES.FACULTY_LEADERSHIP, updatedFaculty, 'Faculty Short Name', facultyShort, REF_SHEET_ID);
      }
  };

  const handleSaveEmployee = async (data: any) => {
      updateDiuEmployeeData(prev => {
          const exists = prev.some(e => normalizeId(e['Employee ID']) === normalizeId(data['Employee ID']));
          if (exists) return prev.map(e => normalizeId(e['Employee ID']) === normalizeId(data['Employee ID']) ? { ...e, ...data } : e);
          return [data, ...prev];
      });
      let result = await submitSheetData('update', SHEET_NAMES.EMPLOYEE, data, 'Employee ID', data['Employee ID'].trim(), REF_SHEET_ID);
      if (result.result === 'error') {
          await submitSheetData('add', SHEET_NAMES.EMPLOYEE, data, 'Employee ID', data['Employee ID'].trim(), REF_SHEET_ID);
      }
  };

  const handleAddProgramSuccess = (newData: any) => {
      updateProgramData(prev => [newData, ...prev]);
      setSelectedProgram(newData);
  };

  const handleEditProgramSidebar = (e: React.MouseEvent, p: ProgramDataRow) => {
      e.stopPropagation();
      setSelectedProgram(p);
      setForceEditTrigger(prev => prev + 1);
  };

  const currentFacultyLeadership = useMemo(() => {
      if (!selectedProgram) return undefined;
      return facultyLeadershipData.find(f => f['Faculty Short Name'] === selectedProgram['Faculty Short Name']);
  }, [selectedProgram, facultyLeadershipData]);

  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {headerTitleTarget && createPortal(
          <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
             <div className="flex flex-col">
                <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">
                    <School className="w-4 h-4 mr-2 text-blue-600" />
                    Programs
                </h2>
             </div>
          </div>,
          headerTitleTarget
      )}
      {headerActionsTarget && createPortal(
          <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
            <button onClick={() => reloadData('all', true)} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} /></button>
          </div>,
          headerActionsTarget
      )}
      <div className="flex-1 overflow-hidden flex flex-row relative">
        <ProgramLeftPanel searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedFaculty={selectedFaculty} setSelectedFaculty={setSelectedFaculty} faculties={faculties} selectedType={selectedType} setSelectedType={setSelectedType} selectedSemesterMode={selectedSemesterMode} setSelectedSemesterMode={setSelectedSemesterMode} semesterFilter={semesterFilter} setSemesterFilter={setSemesterFilter} uniqueSemesters={uniqueSemesters} sortedGroupKeys={sortedGroupKeys} groupedData={groupedData} selectedProgram={selectedProgram} onSelectProgram={setSelectedProgram} onEditProgram={handleEditProgramSidebar} facultyColors={FACULTY_CHIP_COLORS} facultyHeaderColors={FACULTY_HEADER_COLORS} loading={loading.status === 'loading' && programData.length === 0} />
        <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col lg:flex-row">
            {selectedProgram ? (
                <>
                    <ProgramDashboard stats={stats} />
                    <ProgramRightPanel 
                        program={selectedProgram} 
                        facultyLeadership={currentFacultyLeadership} 
                        facultyLeadershipData={facultyLeadershipData}
                        diuEmployeeData={diuEmployeeData} 
                        teacherData={teacherData} 
                        employeeOptions={employeeOptions} 
                        employeeFieldOptions={employeeFieldOptions} 
                        onSaveFacultyLeadership={handleSaveFacultyLeadership} 
                        onSaveProgramLeadership={handleSaveProgramLeadership} 
                        onSaveProgramData={handleSaveProgramData}
                        onSaveEmployee={handleSaveEmployee}
                        forceEditTrigger={forceEditTrigger}
                    />
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50"><School className="w-16 h-16 mb-4 opacity-10" /><p className="text-sm font-medium">Select a program to view details</p></div>
            )}
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-30" title="Add New Program"><Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" /></button>
      </div>
      
      {/* Modal only for ADDING programs now */}
      <EditEntryModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          mode="add" 
          title="Add New Program" 
          sheetName={SHEET_NAMES.PROGRAM} 
          columns={['PID','Faculty Short Name','Faculty Full Name','Program Full Name','Program Short Name','Department Name','Program Type','Semester Type','Semester Duration Num','Theory Duration','Lab Duration','Theory Requirement','Lab Requirement']} 
          hiddenFields={['Class Duration', 'Class Requirement', 'Semester Duration']} 
          initialData={{ 'Semester Duration Num': '4', 'Theory Duration': '90', 'Lab Duration': '120', 'Theory Requirement': '0', 'Lab Requirement': '0' }}
          keyColumn="PID" 
          spreadsheetId={REF_SHEET_ID} 
          transformData={(data) => {
              const tDur = data['Theory Duration'] || '0', lDur = data['Lab Duration'] || '0', tReq = data['Theory Requirement'] || '0', lReq = data['Lab Requirement'] || '0', sDur = data['Semester Duration Num'] || '0';
              const result = { ...data, 'Class Duration': `Theory ${tDur} Minutes, Lab ${lDur} Minutes`, 'Class Requirement': `Theory ${tReq} Minutes, Lab ${lReq} Minutes`, 'Semester Duration': `${sDur} Months` };
              delete result['Theory Duration']; delete result['Lab Duration']; delete result['Theory Requirement']; delete result['Lab Requirement']; delete result['Semester Duration Num'];
              return result;
          }} 
          onSuccess={handleAddProgramSuccess} 
      />
    </div>
  );
};