
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProgramDataRow, CourseSectionData, StudentDataRow } from '../types';
import { RefreshCw, Plus, School, ArrowLeft, Filter, Search } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useSectionFilters } from '../hooks/useSectionFilters';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { useCourseAggregation, CourseSummaryItem } from '../hooks/useCourseAggregation';
import { useTeacherAggregation, TeacherSummaryItem } from '../hooks/useTeacherAggregation';
import { EditEntryModal } from '../components/EditEntryModal';
import { ProgramLeftPanel } from '../components/ProgramLeftPanel';
import { ProgramDashboard } from '../components/ProgramDashboard';
import { ProgramRightPanel } from '../components/ProgramRightPanel';
import { SectionTable } from '../components/SectionTable';
import { CourseSummaryTable } from '../components/CourseSummaryTable';
import { TeacherSummaryTable } from '../components/TeacherSummaryTable';
import { AdmittedReportTable } from '../components/AdmittedReportTable';
import { UnregisteredStudentsModal } from '../components/UnregisteredStudentsModal';
import { FilterPanel } from '../components/FilterPanel';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { normalizeId, submitSheetData, extractSheetIdAndGid } from '../services/sheetService';

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
  const { data: allSections, programData, facultyLeadershipData, diuEmployeeData, teacherData, loading, reloadData, updateProgramData, updateFacultyLeadershipData, updateDiuEmployeeData, semesterFilter, setSemesterFilter, uniqueSemesters, studentDataLinks, studentCache, loadStudentData, updateStudentData, registeredData, loadRegisteredData } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSemesterMode, setSelectedSemesterMode] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>('courses');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeUnregList, setActiveUnregList] = useState<{ semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string } | null>(null);
  const [selectedAdmittedSemesters, setSelectedAdmittedSemesters] = useState<Set<string>>(new Set());
  const [registrationFilters, setRegistrationFilters] = useState<Map<string, 'registered' | 'unregistered'>>(new Map());
  const [selectedStudent, setSelectedStudent] = useState<StudentDataRow | null>(null);

  useEffect(() => {
    if (activeReport === 'admitted') {
        if (registeredData.length === 0) loadRegisteredData();
    }
  }, [activeReport, registeredData.length, loadRegisteredData]);

  const admittedSemestersOptions = useMemo(() => {
      const keys = Array.from(studentDataLinks.keys()) as string[];
      const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
      return keys.sort((a, b) => {
          const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
          const matchA = a.match(regex);
          const matchB = b.match(regex);
          if (!matchA || !matchB) return b.localeCompare(a);
          let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
          let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
          if (yearA !== yearB) return yearB - yearA;
          return (seasonWeight[matchB[1].toLowerCase()] || 0) - (seasonWeight[matchA[1].toLowerCase()] || 0);
      });
  }, [studentDataLinks]);

  useEffect(() => {
      if (admittedSemestersOptions.length > 0 && selectedAdmittedSemesters.size === 0) {
          setSelectedAdmittedSemesters(new Set(admittedSemestersOptions.slice(0, 12)));
      }
  }, [admittedSemestersOptions]);

  useEffect(() => {
      selectedAdmittedSemesters.forEach(sem => {
          if (!studentCache.has(sem)) loadStudentData(sem);
      });
  }, [selectedAdmittedSemesters, studentCache, loadStudentData]);

  const registeredSemesters = useMemo(() => {
      if (registeredData.length === 0) return [];
      const keys = Object.keys(registeredData[0]).filter(k => k.trim() !== '');
      const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
      return keys.sort((a, b) => {
          const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
          const matchA = a.match(regex);
          const matchB = b.match(regex);
          if (!matchA || !matchB) return b.localeCompare(a);
          let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
          let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
          if (yearA !== yearB) return yearB - yearA;
          return (seasonWeight[matchB[1].toLowerCase()] || 0) - (seasonWeight[matchA[1].toLowerCase()] || 0);
      });
  }, [registeredData]);

  const registrationLookup = useMemo(() => {
      const map = new Map<string, Set<string>>();
      if (registeredData.length === 0) return map;
      registeredData.forEach(row => {
          Object.entries(row).forEach(([sem, idVal]) => {
              if (sem && idVal) {
                  const sId = String(idVal).trim();
                  if (!map.has(sId)) map.set(sId, new Set());
                  map.get(sId)!.add(sem);
              }
          });
      });
      return map;
  }, [registeredData]);

  const programMap = useMemo(() => {
      const map = new Map<string, string>();
      programData.forEach(p => { if (p.PID && p['Program Short Name']) map.set(normalizeId(p.PID), p['Program Short Name']); });
      return map;
  }, [programData]);

  const programScopedData = useMemo(() => {
    if (!selectedProgram) return [];
    const pid = normalizeId(selectedProgram.PID);
    return allSections.filter(s => normalizeId(s.PID) === pid);
  }, [allSections, selectedProgram]);

  const { searchTerm: reportSearch, setSearchTerm: setReportSearch, filteredData, attributeOptions, selectedTeachers, setSelectedTeachers, selectedCourseTypes, setSelectedCourseTypes, selectedTypes, setSelectedTypes, selectedCredits, setSelectedCredits, selectedCapacities, setSelectedCapacities, studentMin, setStudentMin, studentMax, setStudentMax, selectedStudentCounts, setSelectedStudentCounts, classTakenMin, setClassTakenMin, classTakenMax, setClassTakenMax, selectedClassTakens, setSelectedClassTakens, selectedMissingFields, setSelectedMissingFields, clearAllFilters } = useSectionFilters(programScopedData, programData);

  const courseSummaryData = useCourseAggregation(filteredData);
  const teacherSummaryData = useTeacherAggregation(filteredData);

  const tableOptions = useMemo(() => {
      const programs = new Set<string>();
      const types = new Set<string>();
      const credits = new Set<string>();
      const totalSections = new Set<number>();
      const totalCapacity = new Set<number>();
      const totalStudents = new Set<number>();
      const totalVacancy = new Set<number>();
      const extraSections = new Set<number>();
      courseSummaryData.forEach(item => {
          programs.add(item.program); types.add(item.courseType); credits.add(item.credit);
          totalSections.add(item.totalSections); totalCapacity.add(item.totalCapacity);
          totalStudents.add(item.totalStudents); totalVacancy.add(item.totalVacancy);
          extraSections.add(item.extraSections);
      });
      return { programs: Array.from(programs).sort(), types: Array.from(types).sort(), credits: Array.from(credits).sort((a,b) => parseFloat(a) - parseFloat(b)), totalSections: Array.from(totalSections).sort((a, b) => a - b), totalCapacity: Array.from(totalCapacity).sort((a, b) => a - b), totalStudents: Array.from(totalStudents).sort((a, b) => a - b), totalVacancy: Array.from(totalVacancy).sort((a, b) => a - b), extraSections: Array.from(extraSections).sort((a, b) => a - b) };
  }, [courseSummaryData]);

  const activeDataForReport = useMemo(() => {
    if (activeReport === 'courses') return courseSummaryData;
    if (activeReport === 'teachers') return teacherSummaryData;
    if (activeReport === 'unassigned') return filteredData.filter(d => !d['Teacher ID'] || d['Teacher ID'] === 'TBA');
    if (activeReport === 'low_student') return filteredData.filter(d => { const s = parseInt(d.Student || '0', 10); return s > 0 && s < 7; });
    if (activeReport === 'class_taken') return filteredData;
    return filteredData;
  }, [activeReport, filteredData, courseSummaryData, teacherSummaryData]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(activeDataForReport);
  const [forceEditTrigger, setForceEditTrigger] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => { if (programData.length > 0 && !selectedProgram) setSelectedProgram(programData[0]); }, [programData, selectedProgram]);
  useEffect(() => { setReportSearch(''); clearAllFilters(); setActiveUnregList(null); setSelectedStudent(null); }, [selectedProgram?.PID]);
  useEffect(() => { setActiveUnregList(null); }, [activeReport]);

  useEffect(() => {
    if (activeReport === 'admitted' && selectedProgram && !activeUnregList && admittedSemestersOptions.length > 0 && registeredSemesters.length > 0) {
      const targetRegSem = registeredSemesters[0];
      const pidNorm = normalizeId(selectedProgram.PID);
      const allUnregStudents: StudentDataRow[] = [];

      admittedSemestersOptions.forEach(sem => {
          const students = studentCache.get(sem);
          if (students) {
              const unregForSem = students.filter(s => {
                  if (normalizeId(s.PID) !== pidNorm) return false;
                  const id = String(s['Student ID']).trim();
                  return !registrationLookup.get(id)?.has(targetRegSem);
              });
              const tagged = unregForSem.map(s => ({ ...s, _semester: sem }));
              allUnregStudents.push(...tagged);
          }
      });

      setActiveUnregList({
          semester: 'All Semesters',
          programId: selectedProgram.PID,
          programName: selectedProgram['Program Short Name'],
          students: allUnregStudents as any,
          targetSemester: targetRegSem
      });
    }
  }, [activeReport, selectedProgram, activeUnregList, admittedSemestersOptions, registeredSemesters, studentCache, registrationLookup]);

  const faculties = useMemo(() => {
    const set = new Set<string>();
    programData.forEach(p => { if (p['Faculty Short Name']) set.add(p['Faculty Short Name']); });
    return Array.from(set).sort();
  }, [programData]);

  const groupedData = useMemo(() => {
    const groups: Record<string, ProgramDataRow[]> = {};
    programData.forEach(p => {
        const fac = p['Faculty Short Name'] || 'Other';
        if (!groups[fac]) groups[fac] = [];
        const matchesSearch = !searchTerm || p['Program Short Name'].toLowerCase().includes(searchTerm.toLowerCase()) || p.PID.toLowerCase().includes(searchTerm.toLowerCase()) || p['Program Full Name'].toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFaculty = selectedFaculty === 'All' || p['Faculty Short Name'] === selectedFaculty;
        const matchesType = !selectedType || p['Program Type'] === selectedType;
        const matchesSemesterMode = !selectedSemesterMode || p['Semester Type']?.includes(selectedSemesterMode);
        if (matchesSearch && matchesFaculty && matchesType && matchesSemesterMode) groups[fac].push(p);
    });
    Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key]; else groups[key].sort((a, b) => a['Program Short Name'].localeCompare(b['Program Short Name'])); });
    return groups;
  }, [programData, searchTerm, selectedFaculty, selectedType, selectedSemesterMode]);

  const sortedGroupKeys = useMemo(() => Object.keys(groupedData).sort(), [groupedData]);

  const stats = useMemo(() => {
      if (!selectedProgram) return { uniqueCourses: 0, totalSections: 0, uniqueTeachers: 0, totalStudents: 0, unassigned: 0, lowEnrollment: 0, avgProgress: 0 };
      let sections = programScopedData;
      if (semesterFilter !== 'All') sections = sections.filter(s => s.Semester === semesterFilter);
      const uniqueCourses = new Set(sections.map(s => s['Course Code'])).size;
      const totalSections = sections.length;
      const uniqueTeachers = new Set(sections.map(s => s['Teacher ID']).filter(id => id && id !== 'TBA')).size;
      const totalStudents = sections.reduce((acc, s) => acc + parseInt(s.Student || '0', 10), 0);
      const unassigned = sections.filter(s => !s['Teacher ID'] || s['Teacher ID'] === 'TBA').length;
      const lowEnrollment = sections.filter(s => { const st = parseInt(s.Student || '0', 10); return st > 0 && st < 7; }).length;
      let totalPct = 0, validPctCount = 0;
      sections.forEach(s => { const req = parseFloat(s.ClassRequirement || '0'), taken = parseFloat(s['Class Taken'] || '0'); if (req > 0) { totalPct += (taken / req) * 100; validPctCount++; } });
      return { uniqueCourses, totalSections, uniqueTeachers, totalStudents, unassigned, lowEnrollment, avgProgress: validPctCount > 0 ? Math.round(totalPct / validPctCount) : 0 };
  }, [programScopedData, selectedProgram, semesterFilter]);

  const employeeOptions = useMemo(() => {
      const map = new Map<string, string>();
      diuEmployeeData.forEach(e => { const id = e['Employee ID']?.trim(); if (!id) return; map.set(normalizeId(id), `${e['Employee Name']} - ${[e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/')} (${id})`); });
      teacherData.forEach(t => { const id = t['Employee ID']?.trim(); if (!id) return; const normId = normalizeId(id); if (!map.has(normId)) map.set(normId, `${t['Employee Name']} - ${t.Designation} (${id})`); });
      return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [diuEmployeeData, teacherData]);

  const employeeFieldOptions = useMemo(() => {
    const depts = new Set<string>(), grps = new Set<string>(), adminDesigs = new Set<string>(), acadDesigs = new Set<string>();
    diuEmployeeData.forEach(e => { if (e.Department) depts.add(e.Department); if (e['Group Name']) e['Group Name'].split(',').forEach(g => grps.add(g.trim())); if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']); if (e['Academic Designation']) acadDesigs.add(e['Academic Designation']); });
    return { 'Department': Array.from(depts).sort(), 'Group Name': Array.from(grps).sort().filter(Boolean), 'Status': ['Active', 'Inactive', 'On Leave'], 'Administrative Designation': Array.from(adminDesigs).sort().filter(Boolean), 'Academic Designation': Array.from(acadDesigs).sort().filter(Boolean) };
  }, [diuEmployeeData]);

  const handleSaveFacultyLeadership = async (data: any) => { const extractIds = (v: string) => v ? v.split(',').map(i => { const m = i.trim().match(/\(([^)]+)\)$/); return m ? m[1] : i.trim(); }).join(', ') : ''; const payload = { ...data, 'Dean': extractIds(data.Dean), 'Associate Dean': extractIds(data['Associate Dean']), 'Administration': extractIds(data.Administration) }; updateFacultyLeadershipData(prev => { const exists = prev.some(f => f['Faculty Short Name'] === payload['Faculty Short Name']); return exists ? prev.map(f => f['Faculty Short Name'] === payload['Faculty Short Name'] ? payload : f) : [...prev, payload]; }); await submitSheetData('update', SHEET_NAMES.FACULTY_LEADERSHIP, payload, 'Faculty Short Name', payload['Faculty Short Name'], REF_SHEET_ID); };
  const handleSaveProgramLeadership = async (data: any) => { const extractIds = (v: string) => v ? v.split(',').map(i => { const m = i.trim().match(/\(([^)]+)\)$/); return m ? m[1] : i.trim(); }).join(', ') : ''; const payload = { ...data, 'Head': extractIds(data.Head), 'Associate Head': extractIds(data['Associate Head']), 'Administration': extractIds(data.Administration) }; updateProgramData(prev => prev.map(p => p.PID === payload.PID ? { ...p, ...payload } : p)); if (selectedProgram?.PID === payload.PID) setSelectedProgram({ ...selectedProgram, ...payload }); await submitSheetData('update', SHEET_NAMES.PROGRAM, payload, 'PID', payload.PID, REF_SHEET_ID); };
  const handleSaveProgramData = async (data: any) => { const payload = { ...data, 'Class Duration': `Theory ${data['Theory Duration']} Minutes, Lab ${data['Lab Duration']} Minutes`, 'Class Requirement': `Theory ${data['Theory Requirement']} Minutes, Lab ${data['Lab Requirement']} Minutes`, 'Semester Duration': `${data['Semester Duration Num']} Months` }; delete payload['Theory Duration']; delete payload['Lab Duration']; delete payload['Theory Requirement']; delete payload['Lab Requirement']; delete payload['Semester Duration Num']; updateProgramData(prev => prev.map(p => p.PID === payload.PID ? { ...p, ...payload } : p)); setSelectedProgram(prev => prev?.PID === payload.PID ? { ...prev, ...payload } : prev); await submitSheetData('update', SHEET_NAMES.PROGRAM, payload, 'PID', payload.PID, REF_SHEET_ID); };
  const handleSaveEmployee = async (data: any, persist: boolean = true) => { updateDiuEmployeeData(prev => { const exists = prev.some(e => normalizeId(e['Employee ID']) === normalizeId(data['Employee ID'])); return exists ? prev.map(e => normalizeId(e['Employee ID']) === normalizeId(data['Employee ID']) ? { ...e, ...data } : e) : [data, ...prev]; }); if (persist) { let r = await submitSheetData('update', SHEET_NAMES.EMPLOYEE, data, 'Employee ID', data['Employee ID'].trim(), REF_SHEET_ID); if (r.result === 'error' && (r.message || '').toLowerCase().includes('not found')) await submitSheetData('add', SHEET_NAMES.EMPLOYEE, data, 'Employee ID', data['Employee ID'].trim(), REF_SHEET_ID); } };

  const handleSaveStudent = async (semester: string, student: StudentDataRow) => {
    const link = studentDataLinks.get(semester);
    if (!link) return;
    const { id } = extractSheetIdAndGid(link);
    if (!id) return;
    
    // 1. Immediate local state update for current view
    setSelectedStudent(prev => prev ? { ...prev, ...student } : null);

    // 2. Prepare payload for API (remove internal props)
    const { _semester, ...apiPayload } = student as any;

    try {
        // 3. Persist to API: sheetName must be the semester name as per tab names
        await submitSheetData('update', semester, apiPayload, 'Student ID', student['Student ID'].trim(), id);
        
        // 4. Update the studentCache Map in global context
        updateStudentData(semester, student['Student ID'], student);

        // 5. Refresh unreg list UI if active
        if (activeUnregList) {
            const newStudents = activeUnregList.students.map(s => s['Student ID'] === student['Student ID'] ? { ...s, ...student } : s);
            setActiveUnregList({ ...activeUnregList, students: newStudents });
        }
    } catch (e) {
        console.error("Failed to persist student update", e);
    }
  };

  const currentFacultyLeadership = useMemo(() => selectedProgram ? facultyLeadershipData.find(f => f['Faculty Short Name'] === selectedProgram['Faculty Short Name']) : undefined, [selectedProgram, facultyLeadershipData]);
  const headerActionsTarget = document.getElementById('header-actions-area'), headerTitleTarget = document.getElementById('header-title-area');
  const activeFilterCount = selectedTeachers.size + selectedCourseTypes.size + selectedTypes.size + selectedCredits.size + selectedCapacities.size + (studentMin || studentMax ? 1 : 0) + (classTakenMin || classTakenMax ? 1 : 0) + selectedMissingFields.size;

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {headerTitleTarget && createPortal(<div className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">{activeReport && (<button onClick={() => { setActiveReport(null); setActiveUnregList(null); setSelectedStudent(null); }} className="p-1.5 hover:bg-white rounded-full text-gray-500 shadow-sm border border-gray-100 transition-all"><ArrowLeft className="w-4 h-4" /></button>)}<h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate"><School className="w-4 h-4 mr-2 text-blue-600" />{activeReport ? `${activeReport.replace('_', ' ')}` : 'Programs'}</h2></div>, headerTitleTarget)}
      {headerActionsTarget && createPortal(<div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">{activeReport && (<><button onClick={() => setIsFilterPanelOpen(true)} className={`flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all ${activeFilterCount > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200'}`}><Filter className="w-3.5 h-3.5" /><span>Filter</span>{activeFilterCount > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full ml-1">{activeFilterCount}</span>}</button><div className="relative group"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-1 focus:ring-blue-500 w-32 md:w-48 transition-all" /></div></>)}<button onClick={() => reloadData('all', true)} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"><RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} /></button></div>, headerActionsTarget)}
      <div className="flex-1 overflow-hidden flex flex-row relative">
        <ProgramLeftPanel searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedFaculty={selectedFaculty} setSelectedFaculty={setSelectedFaculty} faculties={faculties} selectedType={selectedType} setSelectedType={setSelectedType} selectedSemesterMode={selectedSemesterMode} setSelectedSemesterMode={setSelectedSemesterMode} semesterFilter={semesterFilter} setSemesterFilter={setSemesterFilter} uniqueSemesters={uniqueSemesters} sortedGroupKeys={sortedGroupKeys} groupedData={groupedData} selectedProgram={selectedProgram} onSelectProgram={setSelectedProgram} onEditProgram={(e, p) => { setSelectedProgram(p); setForceEditTrigger(prev => prev + 1); }} facultyColors={FACULTY_CHIP_COLORS} facultyHeaderColors={FACULTY_HEADER_COLORS} loading={loading.status === 'loading' && programData.length === 0} />
        <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col lg:flex-row">
            {selectedProgram ? (
                <>
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 border-r border-gray-100">
                        <div className="p-2 md:p-3 shrink-0 bg-white shadow-sm border-b border-gray-100">
                            <ProgramDashboard stats={stats} onCardClick={setActiveReport} activeReport={activeReport} />
                        </div>
                        {activeReport && (
                            <div className="flex-1 flex flex-col overflow-hidden bg-white animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex-1 overflow-auto relative p-2" ref={containerRef}>
                                    {(activeReport === 'sections' || activeReport === 'unassigned' || activeReport === 'low_student' || activeReport === 'class_taken') && (<SectionTable data={paginatedData as CourseSectionData[]} isDashboardMode={true} headerColor="bg-slate-700" />)}
                                    {activeReport === 'courses' && (<CourseSummaryTable data={paginatedData as CourseSummaryItem[]} expandedKeys={new Set()} toggleRow={() => {}} headerColor="bg-slate-700" isCompact={true} options={tableOptions} filters={{ programs: new Set(), types: selectedCourseTypes, credits: selectedCredits, totalSections: new Set(), totalCapacity: new Set(), totalStudents: new Set(), totalVacancy: new Set(), extraSections: new Set() }} onFilterChange={{ setPrograms: () => {}, setTypes: setSelectedCourseTypes, setCredits: setSelectedCredits, setTotalSections: () => {}, setTotalCapacity: () => {}, setTotalStudents: () => {}, setTotalVacancy: () => {}, setExtraSections: () => {} }} />)}
                                    {activeReport === 'teachers' && (<TeacherSummaryTable data={paginatedData as TeacherSummaryItem[]} expandedKeys={new Set()} toggleRow={() => {}} headerColor="bg-slate-700" />)}
                                    {activeReport === 'admitted' && (
                                        <div className="flex flex-col h-full overflow-hidden">
                                            <div className="flex flex-row h-full gap-2 p-1">
                                                {/* Left Half: Semester Analysis */}
                                                <div className="flex-1 border border-gray-200 rounded-lg overflow-auto thin-scrollbar bg-white shadow-sm">
                                                    <AdmittedReportTable 
                                                        selectedAdmittedSemesters={selectedAdmittedSemesters}
                                                        studentCache={studentCache}
                                                        registrationLookup={registrationLookup}
                                                        registeredSemesters={registeredSemesters}
                                                        programMap={programMap}
                                                        programData={programData}
                                                        selectedPrograms={new Set([normalizeId(selectedProgram.PID)])}
                                                        selectedFaculties={new Set()}
                                                        setSelectedFaculties={() => {}}
                                                        selectedProgramTypes={new Set()}
                                                        selectedSemesterTypes={new Set()}
                                                        onUnregClick={setActiveUnregList}
                                                    />
                                                </div>
                                                {/* Right Half: Unregistered List */}
                                                <div className="flex-1 border border-gray-200 rounded-lg overflow-auto thin-scrollbar bg-white shadow-sm">
                                                    {activeUnregList ? (
                                                        <UnregisteredStudentsModal 
                                                            isInline={true}
                                                            isOpen={true} 
                                                            onClose={() => setActiveUnregList(null)} 
                                                            semester={activeUnregList.semester} 
                                                            programName={activeUnregList.programName} 
                                                            programId={activeUnregList.programId} 
                                                            targetSemester={activeUnregList.targetSemester} 
                                                            students={activeUnregList.students}
                                                            programMap={programMap}
                                                            registrationLookup={registrationLookup}
                                                            onRowClick={(student) => setSelectedStudent(student)}
                                                        />
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/20">
                                                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                                                                <ArrowLeft className="w-6 h-6 rotate-180 opacity-20" />
                                                            </div>
                                                            <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">Click an Unregistered count to view students</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {activeReport !== 'admitted' && (<div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-[10px] text-gray-500 font-bold shrink-0"><span>Records: {activeDataForReport.length}</span><div className="flex items-center space-x-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-40 shadow-sm">Prev</button><span className="px-2">{currentPage} / {totalPages || 1}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-40 shadow-sm">Next</button></div></div>)}
                            </div>
                        )}
                    </div>
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
                        onSaveStudent={handleSaveStudent}
                        forceEditTrigger={forceEditTrigger} 
                        selectedStudent={selectedStudent}
                        studentSemester={selectedStudent ? (selectedStudent as any)._semester : undefined}
                        onCloseStudent={() => setSelectedStudent(null)}
                    />
                </>
            ) : (<div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50"><School className="w-16 h-16 mb-4 opacity-10" /><p className="text-sm font-medium">Select a program to view details</p></div>)}
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-30" title="Add New Program"><Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" /></button>
      </div>
      <FilterPanel isOpen={isFilterPanelOpen} onClose={() => setIsFilterPanelOpen(false)} programData={programData} semesterFilter={semesterFilter} setSemesterFilter={setSemesterFilter} uniqueSemesters={uniqueSemesters} selectedFaculties={new Set()} setSelectedFaculties={() => {}} selectedProgramTypes={new Set()} setSelectedProgramTypes={() => {}} selectedSemesterTypes={new Set()} setSelectedSemesterTypes={() => {}} selectedPrograms={new Set()} setSelectedPrograms={() => {}} attributeOptions={attributeOptions} selectedTeachers={selectedTeachers} setSelectedTeachers={setSelectedTeachers} selectedCourseTypes={selectedCourseTypes} setSelectedCourseTypes={setSelectedCourseTypes} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} selectedCredits={selectedCredits} setSelectedCredits={setSelectedCredits} selectedCapacities={selectedCapacities} setSelectedCapacities={setSelectedCapacities} studentMin={studentMin} setStudentMin={setStudentMin} studentMax={studentMax} setStudentMax={setStudentMax} studentCache={studentCache} selectedStudentCounts={selectedStudentCounts} setSelectedStudentCounts={setSelectedStudentCounts} classTakenMin={classTakenMin} setClassTakenMin={setClassTakenMin} classTakenMax={classTakenMax} setClassTakenMax={setClassTakenMax} selectedClassTakens={selectedClassTakens} setSelectedClassTakens={setSelectedClassTakens} selectedMissingFields={selectedMissingFields} setSelectedMissingFields={setSelectedMissingFields} onClearAll={clearAllFilters} hideProgramTab={true} viewMode={activeReport === 'admitted' ? 'admitted' : undefined} admittedSemestersOptions={admittedSemestersOptions} selectedAdmittedSemesters={selectedAdmittedSemesters} onAdmittedSemesterChange={setSelectedAdmittedSemesters} registeredSemestersOptions={registeredSemesters} registrationFilters={registrationFilters} onRegistrationFilterChange={setRegistrationFilters} />
      <EditEntryModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} mode="add" title="Add New Program" sheetName={SHEET_NAMES.PROGRAM} columns={['PID','Faculty Short Name','Faculty Full Name','Program Full Name','Program Short Name','Department Name','Program Type','Semester Type','Semester Duration Num','Theory Duration','Lab Duration','Theory Requirement','Lab Requirement']} hiddenFields={['Class Duration', 'Class Requirement', 'Semester Duration']} initialData={{ 'Semester Duration Num': '4', 'Theory Duration': '90', 'Lab Duration': '120', 'Theory Requirement': '0', 'Lab Requirement': '0' }} keyColumn="PID" spreadsheetId={REF_SHEET_ID} transformData={(data) => { const tDur = data['Theory Duration'] || '0', lDur = data['Lab Duration'] || '0', tReq = data['Theory Requirement'] || '0', lReq = data['Lab Requirement'] || '0', sDur = data['Semester Duration Num'] || '0'; return { ...data, 'Class Duration': `Theory ${tDur} Minutes, Lab ${lDur} Minutes`, 'Class Requirement': `Theory ${tReq} Minutes, Lab ${lReq} Minutes`, 'Semester Duration': `${sDur} Months` }; }} onSuccess={(newData) => { updateProgramData(prev => [newData, ...prev]); setSelectedProgram(newData); }} />
    </div>
  );
};
