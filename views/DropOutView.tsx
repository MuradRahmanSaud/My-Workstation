
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareQuote, RefreshCw, ArrowLeft, School, Search, Filter, MessageSquare, User, X, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ListFilter, RotateCcw } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { DropOutDashboard, DropoutKpiType } from '../components/DropOutDashboard';
import { AdmittedReportTable } from '../components/AdmittedReportTable';
import { ProgramRightPanel } from '../components/ProgramRightPanel';
import { FilterPanel } from '../components/FilterPanel';
import { FollowupTimelineDashboard } from '../components/FollowupTimelineDashboard';
import { StudentDetailView } from '../components/StudentDetailView';
import { ProgramDataRow, StudentDataRow } from '../types';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { normalizeId, submitSheetData, extractSheetIdAndGid, normalizeSemesterString } from '../services/sheetService';
import { isValEmpty } from './EmployeeView';

const FIELD_SEP = ' ;; ';
const RECORD_SEP = ' || ';

export const DropOutView: React.FC = () => {
    const { 
        programData, facultyLeadershipData, diuEmployeeData, teacherData, loading, reloadData,
        studentDataLinks, studentCache, loadStudentData, updateStudentData, registeredData, loadRegisteredData,
        updateProgramData, updateFacultyLeadershipData, updateDiuEmployeeData, semesterFilter, uniqueSemesters
    } = useSheetData();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedSemesterMode, setSelectedSemesterMode] = useState<string | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    
    const [currentListType, setCurrentListType] = useState<DropoutKpiType>('all');
    
    // Drill-down State
    const [sessionDrillDown, setSessionDrillDown] = useState<{ semester: string, type: 'all' | 'registered' | 'unregistered' } | null>(null);

    const [selectedAdmittedSemesters, setSelectedAdmittedSemesters] = useState<Set<string>>(new Set());
    const [registrationFilters, setRegistrationFilters] = useState<Map<string, 'registered' | 'unregistered'>>(new Map());
    const [selectedStudent, setSelectedStudent] = useState<StudentDataRow | null>(null);
    const [shouldAutoOpenRemarks, setShouldAutoOpenRemarks] = useState(false);
    const [targetRegSem, setTargetRegSem] = useState<string>('');

    useEffect(() => {
        if (registeredData.length === 0) loadRegisteredData();
    }, [loadRegisteredData, registeredData.length]);

    useEffect(() => {
        if (programData.length > 0 && !selectedProgram) {
            setSelectedProgram(programData[0]);
        }
    }, [programData, selectedProgram]);

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

    useEffect(() => {
        if (registeredSemesters.length > 0 && !targetRegSem) {
            setTargetRegSem(registeredSemesters[0]);
        }
    }, [registeredSemesters, targetRegSem]);

    const registrationLookup = useMemo(() => {
        const map = new Map<string, Set<string>>();
        if (registeredData.length === 0) return map;
        registeredData.forEach(row => {
            Object.entries(row).forEach(([sem, idVal]) => {
                if (sem && idVal && String(idVal).trim() !== '') {
                    const sId = normalizeId(String(idVal)); 
                    const normSem = normalizeSemesterString(sem);
                    if (!map.has(sId)) map.set(sId, new Set());
                    map.get(sId)!.add(normSem);
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

    const checkDuesForSemester = (duesStr: string | undefined, targetSem: string) => {
        if (!duesStr || isValEmpty(duesStr)) return false;
        if (!duesStr.includes(FIELD_SEP)) return true; 
        const normalizedTarget = normalizeSemesterString(targetSem);
        const records = duesStr.split(RECORD_SEP).map(r => r.trim()).filter(Boolean);
        return records.some(r => {
            const fields = r.split(FIELD_SEP).map(f => f.trim());
            const recordSemesterNormalized = normalizeSemesterString(fields[3]);
            const isDone = fields[6] === 'DONE';
            return recordSemesterNormalized === normalizedTarget && !isDone;
        });
    };

    const kpiStats = useMemo(() => {
        if (!selectedProgram || !targetRegSem) return { enrolled: 0, registered: 0, unregistered: 0, pDrop: 0, tDrop: 0, crCom: 0, defense: 0, regPending: 0, dues: 0, followup: 0 };
        const pidNorm = normalizeId(selectedProgram.PID);
        const targetNorm = normalizeSemesterString(targetRegSem);
        let enrolled = 0, registered = 0, pDrop = 0, tDrop = 0, crCom = 0, defense = 0, regPending = 0, dues = 0, followup = 0;
        
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };
        const targetParsed = parseSem(targetRegSem);

        selectedAdmittedSemesters.forEach(sem => {
            const currentParsed = parseSem(sem);
            const isOnOrBefore = currentParsed.year < targetParsed.year || (currentParsed.year === targetParsed.year && currentParsed.season <= targetParsed.season);
            if (!isOnOrBefore) return;
            const students = studentCache.get(sem) || [];
            students.forEach(s => {
                if (normalizeId(s.PID) === pidNorm) {
                    enrolled++;
                    const id = normalizeId(s['Student ID']);
                    const registeredFor = registrationLookup.get(id);
                    const isRegistered = registeredFor ? registeredFor.has(targetNorm) : false;
                    
                    if (isRegistered) registered++;
                    const dropClass = s['Dropout Classification'] || '';
                    const isPDrop = dropClass.includes('Permanent');
                    const isTDrop = dropClass.includes('Temporary');
                    if (isPDrop) pDrop++;
                    if (isTDrop) tDrop++;
                    const credReq = parseFloat(s['Credit Requirement'] || '0');
                    const credCom = parseFloat(s['Credit Completed'] || '0');
                    const hasCrCom = !isNaN(credReq) && !isNaN(credCom) && credReq > 0 && (credCom >= credReq);
                    if (hasCrCom) crCom++;
                    if (!isValEmpty(s['Defense Registration'])) defense++;
                    if (!isRegistered && !isPDrop && !hasCrCom) regPending++;
                    if (checkDuesForSemester(s.Dues, targetRegSem)) dues++;
                    const remarksRaw = s['Discussion Remark'] || '';
                    if (remarksRaw) {
                        followup += remarksRaw.split(' || ').filter(Boolean).length;
                    }
                }
            });
        });
        return { enrolled, registered, unregistered: enrolled - registered, pDrop, tDrop, crCom, defense, regPending, dues, followup };
    }, [selectedProgram, selectedAdmittedSemesters, studentCache, registrationLookup, targetRegSem]);

    const getFilteredStudentList = useCallback((type: DropoutKpiType) => {
        if (!selectedProgram || !targetRegSem) return [];
        const pidNorm = normalizeId(selectedProgram.PID);
        const targetNorm = normalizeSemesterString(targetRegSem);
        const results: StudentDataRow[] = [];
        
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };
        const targetParsed = parseSem(targetRegSem);

        // Calculate based on drill-down if active
        if (sessionDrillDown) {
            const students = studentCache.get(sessionDrillDown.semester) || [];
            const sessionTargetNorm = targetNorm; // We check registration against the currently selected Target Registration Semester

            students.forEach(s => {
                if (normalizeId(s.PID) === pidNorm) {
                    const id = normalizeId(s['Student ID']);
                    const registeredFor = registrationLookup.get(id);
                    const isRegistered = registeredFor ? registeredFor.has(sessionTargetNorm) : false;

                    let drillMatch = false;
                    if (sessionDrillDown.type === 'all') drillMatch = true;
                    else if (sessionDrillDown.type === 'registered') drillMatch = isRegistered;
                    else if (sessionDrillDown.type === 'unregistered') drillMatch = !isRegistered;

                    if (drillMatch) {
                        results.push({ ...s, _semester: sessionDrillDown.semester });
                    }
                }
            });
            return results;
        }

        // Standard KPI logic
        selectedAdmittedSemesters.forEach(sem => {
            const currentParsed = parseSem(sem);
            const isOnOrBefore = currentParsed.year < targetParsed.year || (currentParsed.year === targetParsed.year && currentParsed.season <= targetParsed.season);
            if (!isOnOrBefore) return;
            
            const students = studentCache.get(sem) || [];
            students.forEach(s => {
                if (normalizeId(s.PID) === pidNorm) {
                    const id = normalizeId(s['Student ID']);
                    const registeredFor = registrationLookup.get(id);
                    const isRegistered = registeredFor ? registeredFor.has(targetNorm) : false;
                    
                    const dropClass = s['Dropout Classification'] || '';
                    const isPDrop = dropClass.includes('Permanent');
                    const isTDrop = dropClass.includes('Temporary');
                    const credReq = parseFloat(s['Credit Requirement'] || '0');
                    const credCom = parseFloat(s['Credit Completed'] || '0');
                    const hasCrCom = !isNaN(credReq) && !isNaN(credCom) && credReq > 0 && (credCom >= credReq);
                    const isDefense = !isValEmpty(s['Defense Registration']);
                    const hasFollowup = (s['Discussion Remark'] || '').trim() !== '';

                    let match = false;
                    if (type === 'all') match = true;
                    else if (type === 'registered') match = isRegistered;
                    else if (type === 'unregistered') match = !isRegistered;
                    else if (type === 'pdrop') match = isPDrop;
                    else if (type === 'tdrop') match = isTDrop;
                    else if (type === 'crcom') match = hasCrCom;
                    else if (type === 'defense') match = isDefense;
                    else if (type === 'regPending') match = !isRegistered && !isPDrop && !hasCrCom;
                    else if (type === 'dues') match = checkDuesForSemester(s.Dues, targetRegSem);
                    else if (type === 'followup') match = hasFollowup;

                    if (match) {
                        results.push({ ...s, _semester: sem });
                    }
                }
            });
        });
        return results;
    }, [selectedProgram, targetRegSem, selectedAdmittedSemesters, studentCache, registrationLookup, sessionDrillDown]);

    const activeFilteredStudents = useMemo(() => getFilteredStudentList(currentListType), [getFilteredStudentList, currentListType]);
    
    // Pagination for the Student Registry List
    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<StudentDataRow>(activeFilteredStudents);

    const handleCardClick = useCallback((type: DropoutKpiType) => {
        setCurrentListType(type);
        setSessionDrillDown(null); // Clear session drilldown when changing broad KPI
        setShouldAutoOpenRemarks(false);
        setCurrentPage(1); 
    }, [setCurrentPage]);

    const handleStatDrillDown = useCallback((semester: string, type: 'all' | 'registered' | 'unregistered') => {
        setSessionDrillDown({ semester, type });
        setCurrentPage(1);
    }, [setCurrentPage]);

    const handleFollowupStudentClick = (studentId: string) => {
        const student = activeFilteredStudents.find(s => normalizeId(s['Student ID']) === normalizeId(studentId));
        if (student) {
            setShouldAutoOpenRemarks(false); // Changed to false as requested
            setSelectedStudent(student);
        }
    };

    const employeeOptions = useMemo(() => {
        const map = new Map<string, string>();
        diuEmployeeData.forEach(e => { 
            const id = e['Employee ID']?.trim();
            if (!id) return;
            map.set(normalizeId(id), `${e['Employee Name']} - ${[e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/')} (${id})`); 
        });
        teacherData.forEach(t => {
            const id = t['Employee ID']?.trim();
            if (!id) return;
            const normId = normalizeId(id);
            if (!map.has(normId)) map.set(normId, `${t['Employee Name']} - ${t.Designation} (${id})`);
        });
        return Array.from(map.values()).sort();
    }, [diuEmployeeData, teacherData]);

    const employeeFieldOptions = useMemo(() => {
        const depts = new Set<string>(), grps = new Set<string>(), adminDesigs = new Set<string>(), acadDesigs = new Set<string>();
        diuEmployeeData.forEach(e => { if (e.Department) depts.add(e.Department); if (e['Group Name']) e['Group Name'].split(',').forEach(g => grps.add(g.trim())); if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']); if (e['Academic Designation']) acadDesigs.add(e['Academic Designation']); });
        return { 'Department': Array.from(depts).sort(), 'Group Name': Array.from(grps).sort().filter(Boolean), 'Status': ['Active', 'Inactive', 'On Leave'], 'Administrative Designation': Array.from(adminDesigs).sort().filter(Boolean), 'Academic Designation': Array.from(acadDesigs).sort().filter(Boolean) };
    }, [diuEmployeeData]);

    const handleUpdatePersonnel = async (data: any, persist = true) => {
        updateDiuEmployeeData(prev => prev.map(e => normalizeId(e['Employee ID']) === normalizeId(data['Employee ID']) ? { ...e, ...data } : e));
    };

    const handleSaveStudent = async (semester: string, student: StudentDataRow) => {
        const link = studentDataLinks.get(semester);
        if (!link) return;
        const { id: sheetId } = extractSheetIdAndGid(link);
        if (!sheetId) return;

        setSelectedStudent(prev => prev ? { ...prev, ...student } : null);
        updateStudentData(semester, student['Student ID'], student);
        
        const { _semester, ...apiPayload } = student as any;
        try {
            await submitSheetData('update', semester, apiPayload, 'Student ID', student['Student ID'].trim(), sheetId);
        } catch (e) {
            console.error("Failed to persist student update in DropOutView", e);
        }
    };

    const handleCloseStudent = () => {
        setSelectedStudent(null);
        setShouldAutoOpenRemarks(false);
    };

    const handleRefresh = async () => {
        await reloadData('admitted', true);
        if (selectedAdmittedSemesters.size > 0) {
            const promises = Array.from(selectedAdmittedSemesters).map(sem => loadStudentData(sem, true));
            await Promise.all(promises);
        }
    };

    const headerTitleTarget = document.getElementById('header-title-area');
    const headerActionsTarget = document.getElementById('header-actions-area');

    return (
        <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
            {headerTitleTarget && createPortal(
                <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">
                        <MessageSquareQuote className="w-4 h-4 mr-2 text-blue-600 shrink-0" />
                        Student Follow-up Analysis
                        {selectedProgram && (
                            <>
                                <span className="mx-2 text-gray-300 font-normal shrink-0">|</span>
                                <span className="text-blue-600 normal-case truncate max-w-[150px] md:max-w-none" title={selectedProgram['Program Full Name']}>
                                    {selectedProgram['Program Full Name']}
                                </span>
                            </>
                        )}
                    </h2>
                </div>, 
                headerTitleTarget
            )}
            {headerActionsTarget && createPortal(
                <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
                    <button onClick={() => setIsFilterPanelOpen(true)} className={`flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold rounded-full border bg-white text-gray-600 border-gray-200 transition-all hover:bg-gray-100`}>
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter Program & Data</span>
                    </button>
                    <button onClick={handleRefresh} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                </div>, 
                headerActionsTarget
            )}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {selectedProgram && (
                    <div className="p-2 md:p-3 shrink-0 bg-white shadow-sm border-b border-gray-100 z-20 w-full overflow-x-auto no-scrollbar">
                        <DropOutDashboard stats={kpiStats} comparisonSemester={targetRegSem} onCardClick={handleCardClick} activeType={currentListType} />
                    </div>
                )}

                <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col lg:flex-row">
                    {selectedProgram ? (
                        <>
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {currentListType === 'followup' ? (
                                        <div className="flex-1 overflow-hidden p-2 md:p-3">
                                            <FollowupTimelineDashboard students={getFilteredStudentList('followup')} onRowClick={handleFollowupStudentClick} diuEmployeeData={diuEmployeeData} teacherData={teacherData} />
                                        </div>
                                    ) : (
                                        <div className="flex flex-row h-full gap-2 p-2 overflow-hidden">
                                            {/* COLUMN 1: TARGET SESSION SUMMARY (45%) */}
                                            <div className="basis-[45%] w-[45%] shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
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
                                                    externalTargetRegSemester={targetRegSem}
                                                    onTargetRegSemesterChange={setTargetRegSem}
                                                    hideSummaryToggle={true}
                                                    hideSidebar={true}
                                                    onStatClick={handleStatDrillDown}
                                                    activeDrillDown={sessionDrillDown}
                                                />
                                            </div>

                                            {/* COLUMN 2: STUDENT REGISTRY LIST (25%) */}
                                            <div className="basis-[25%] w-[25%] shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                                <div className="px-3 py-1.5 border-b border-slate-600 bg-slate-700 flex items-center justify-between shrink-0 h-[34px]">
                                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center truncate">
                                                        <ListFilter className="w-3.5 h-3.5 mr-1.5 text-blue-300 shrink-0" />
                                                        {sessionDrillDown ? (
                                                            <span className="truncate">Registry: {sessionDrillDown.semester} ({sessionDrillDown.type === 'all' ? 'Enroll' : sessionDrillDown.type === 'registered' ? 'Reg' : 'Unreg'})</span>
                                                        ) : (
                                                            <span>Registry</span>
                                                        )}
                                                    </h3>
                                                    {sessionDrillDown ? (
                                                        <button 
                                                            onClick={() => setSessionDrillDown(null)}
                                                            className="bg-white/20 hover:bg-white/30 text-white rounded p-0.5 transition-colors"
                                                            title="Clear Drill-down"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                        </button>
                                                    ) : (
                                                        <span className="bg-white/20 text-white text-[9px] font-black px-1.5 rounded-full border border-white/10">
                                                            {activeFilteredStudents.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-slate-600 sticky top-0 z-10 shadow-sm border-b border-slate-600">
                                                            <tr>
                                                                <th className="px-3 py-1.5 text-[9px] font-black text-white/90 uppercase tracking-widest border-r border-slate-500 w-1/2">ID</th>
                                                                <th className="px-3 py-1.5 text-[9px] font-black text-white/90 uppercase tracking-widest">Name</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {paginatedData.map((s, idx) => (
                                                                <tr 
                                                                    key={s['Student ID'] || idx} 
                                                                    onClick={() => handleFollowupStudentClick(s['Student ID'])}
                                                                    className={`transition-all text-[11px] h-[30px] cursor-pointer group ${selectedStudent?.['Student ID'] === s['Student ID'] ? 'bg-indigo-50' : 'hover:bg-indigo-50/50'}`}
                                                                >
                                                                    <td className="px-3 py-1 font-black text-indigo-700 font-mono tracking-tighter border-r border-slate-50">{s['Student ID']}</td>
                                                                    <td className="px-3 py-1 font-bold text-slate-700 truncate" title={s['Student Name']}>{s['Student Name']}</td>
                                                                </tr>
                                                            ))}
                                                            {activeFilteredStudents.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={2} className="py-20 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-40">No Students Found</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="bg-slate-50 px-2 py-1 border-t border-gray-100 flex justify-center items-center space-x-1 shrink-0 h-[34px]">
                                                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                                    <span className="text-[10px] font-black text-slate-600 px-2">{currentPage}/{totalPages || 1}</span>
                                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>

                                            {/* COLUMN 3: STUDENT PROFILE / PROGRAM PANEL (30%) */}
                                            <div className="basis-[30%] w-[30%] shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col relative">
                                                {selectedStudent ? (
                                                    <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-2 duration-300 bg-white z-10">
                                                        <div className="px-3 py-2 border-b border-gray-100 bg-slate-50 flex items-center justify-between shrink-0 h-[40px]">
                                                            <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest flex items-center">
                                                                <User className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                                                Student Profile
                                                            </h3>
                                                            <button onClick={handleCloseStudent} className="p-1 hover:bg-white rounded-full text-slate-400 transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <StudentDetailView 
                                                                student={selectedStudent} 
                                                                program={selectedProgram} 
                                                                diuEmployeeData={diuEmployeeData} 
                                                                teacherData={teacherData} 
                                                                employeeOptions={employeeOptions} 
                                                                onSaveStudent={handleSaveStudent} 
                                                                onClose={handleCloseStudent} 
                                                                registrationLookup={registrationLookup} 
                                                                studentSemester={(selectedStudent as any)._semester} 
                                                                initialRemarksOpen={shouldAutoOpenRemarks}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
                                                        <div className="px-3 py-2 border-b border-gray-100 bg-slate-50 flex items-center shrink-0 h-[40px]">
                                                            <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest flex items-center">
                                                                <School className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                                                                Program Coordination
                                                            </h3>
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <ProgramRightPanel 
                                                                program={selectedProgram}
                                                                facultyLeadership={facultyLeadershipData.find(f => f['Faculty Short Name'] === selectedProgram['Faculty Short Name'])}
                                                                facultyLeadershipData={facultyLeadershipData}
                                                                diuEmployeeData={diuEmployeeData}
                                                                teacherData={teacherData}
                                                                employeeOptions={employeeOptions}
                                                                employeeFieldOptions={employeeFieldOptions}
                                                                onSaveFacultyLeadership={async () => {}}
                                                                onSaveProgramLeadership={async () => {}}
                                                                onSaveProgramData={async () => {}}
                                                                onSaveEmployee={handleUpdatePersonnel}
                                                                registrationLookup={registrationLookup}
                                                                isModular={true}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
                            <MessageSquareQuote className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-medium">Select a program via Filter to manage follow-ups</p>
                        </div>
                    )}
                </div>
            </div>
            
            <FilterPanel 
                isOpen={isFilterPanelOpen} onClose={() => setIsFilterPanelOpen(false)} programData={programData} semesterFilter="All" setSemesterFilter={() => {}} uniqueSemesters={[]} selectedFaculties={selectedFaculty === 'All' ? new Set() : new Set([selectedFaculty])} setSelectedFaculties={(f) => setSelectedFaculty(Array.from(f)[0] || 'All')} selectedProgramTypes={new Set()} setSelectedProgramTypes={() => {}} selectedSemesterTypes={new Set()} setSelectedSemesterTypes={() => {}} selectedPrograms={new Set()} setSelectedPrograms={() => {}} attributeOptions={{ teachers: [], courseTypes: [], types: [], credits: [], capacities: [], studentCounts: [], classTakenCounts: [] }} selectedTeachers={new Set()} setSelectedTeachers={() => {}} selectedCourseTypes={new Set()} setSelectedCourseTypes={() => {}} selectedTypes={new Set()} setSelectedTypes={() => {}} selectedCredits={new Set()} setSelectedCredits={() => {}} selectedCapacities={new Set()} setSelectedCapacities={() => {}} studentMin="" setStudentMin={() => {}} studentMax="" setStudentMax={() => {}} selectedStudentCounts={new Set()} setSelectedStudentCounts={() => {}} classTakenMin="" setClassTakenMin={() => {}} classTakenMax="" setClassTakenMax={() => {}} selectedClassTakens={new Set()} setSelectedClassTakens={(() => {})} onClearAll={(() => {})} hideProgramTab={false} viewMode="dropout" admittedSemestersOptions={admittedSemestersOptions} selectedAdmittedSemesters={selectedAdmittedSemesters} onAdmittedSemesterChange={setSelectedAdmittedSemesters} registeredSemestersOptions={registeredSemesters} registrationFilters={registrationFilters} onRegistrationFilterChange={setRegistrationFilters} selectedType={selectedType} setSelectedType={setSelectedType} selectedSemesterMode={selectedSemesterMode} setSelectedSemesterMode={setSelectedSemesterMode} onSelectProgram={(p) => { setSelectedProgram(p); }} selectedProgram={selectedProgram} />
        </div>
    );
};
