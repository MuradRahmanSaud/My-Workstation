import React, { useMemo, useState, useEffect } from 'react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow } from '../types';
import { LayoutGrid, List as ListIcon, Check, Copy, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserCheck, UserX, UserMinus, PowerOff, Clock, Calculator, ShieldCheck, GraduationCap, Target, AlertCircle, MessageSquare, Download, Users, X, RotateCcw, User as UserIcon, Search, FilterX, TrendingUp, Banknote } from 'lucide-react';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { isValEmpty } from '../views/EmployeeView';
import { StudentDetailView } from './StudentDetailView';
import { normalizeId } from '../services/sheetService';

// Fix: Add missing StudentDetailList component to render student rows in the summary view list
const StudentDetailList = ({ students, onRowClick, selectedId }: { students: StudentDataRow[], onRowClick: (s: StudentDataRow) => void, selectedId: string | null, listType: any }) => {
    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<StudentDataRow>(students, { defaultRows: 15 });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto thin-scrollbar" ref={containerRef}>
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-slate-700 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                        <tr>
                            <th className="px-2 py-1.5 text-[9px] font-bold text-white w-8 text-center uppercase tracking-wider">Sl</th>
                            <th className="px-2 py-1.5 text-[9px] font-bold text-white uppercase tracking-wider">Student ID</th>
                            <th className="px-2 py-1.5 text-[9px] font-bold text-white uppercase tracking-wider">Student Name</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.map((student, idx) => {
                            const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                            const isSelected = selectedId === student['Student ID'];
                            
                            return (
                                <tr 
                                    key={student['Student ID']} 
                                    onClick={() => onRowClick(student)}
                                    className={`transition-all text-[11px] h-[32px] cursor-pointer relative z-0 ${
                                        isSelected 
                                        ? 'bg-blue-100 ring-1 ring-blue-300 ring-inset shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)] z-10' 
                                        : 'hover:bg-blue-50/60'
                                    }`}
                                >
                                    <td className={`px-2 py-1 text-center font-medium ${isSelected ? 'text-blue-700' : 'text-gray-400'}`}>{globalIdx}</td>
                                    <td className={`px-2 py-1 font-bold font-mono ${isSelected ? 'text-blue-800' : 'text-blue-600'}`}>{student['Student ID']}</td>
                                    <td className={`px-2 py-1 font-medium truncate max-w-[150px] ${isSelected ? 'text-blue-900' : 'text-gray-700'}`} title={student['Student Name']}>{student['Student Name']}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-3 py-1 bg-slate-50 border-t border-gray-200 text-[9px] text-gray-500 flex justify-between items-center shrink-0 select-none h-[32px]">
                <div className="flex items-center space-x-1">
                    <span className="font-bold">{students.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, students.length)}</span>
                    <span>of</span>
                    <span className="font-bold">{students.length}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="min-w-[20px] text-center font-black text-blue-600 bg-white border border-slate-200 rounded py-0">{currentPage}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </div>
    );
};

interface AdmittedReportTableProps {
    selectedAdmittedSemesters: Set<string>;
    studentCache: Map<string, StudentDataRow[]>;
    registrationLookup: Map<string, Set<string>>;
    registeredSemesters: string[];
    programMap: Map<string, string>;
    programData: ProgramDataRow[];
    selectedPrograms: Set<string>;
    selectedFaculties: Set<string>;
    setSelectedFaculties: (val: Set<string>) => void;
    selectedProgramTypes: Set<string>;
    selectedSemesterTypes: Set<string>;
    onUnregClick?: (data: { semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string; listType: 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' | 'dues' | 'followup' }) => void;
    externalTargetRegSemester?: string;
    onTargetRegSemesterChange?: (val: string) => void;
    diuEmployeeData?: DiuEmployeeRow[];
    teacherData?: TeacherDataRow[];
    onSaveStudent?: (semester: string, student: StudentDataRow) => Promise<void>;
    hideSummaryToggle?: boolean;
}

const FACULTY_COLORS: Record<string, string> = {
    'FBE': 'bg-red-500',
    'FE': 'bg-yellow-500',
    'FHLS': 'bg-green-500',
    'FHSS': 'bg-blue-500',
    'FSIT': 'bg-orange-500',
    'Other': 'bg-gray-400'
};

const BAR_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#6366f1',
    '#84cc16', '#eab308', '#d946ef', '#0891b2', '#f97316'
];

const FACULTY_NAMES: Record<string, string> = {
    'FBE': 'Faculty of Business and Entrepreneurship',
    'FE': 'Faculty of Engineering',
    'FHLS': 'Faculty of Health and Life Sciences',
    'FHSS': 'Faculty of Humanities and Social Science',
    'FSIT': 'Faculty of Science and Information Technology',
    'Other': 'Other Faculties'
};

const FIELD_SEP = ' ;; ';
const RECORD_SEP = ' || ';

const CHART_METRICS = [
    { id: 'totalAdmitted', label: 'Enroll', color: 'bg-blue-600', activeBorder: 'border-blue-700', listType: 'all', inactiveClass: 'bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-100' },
    { id: 'totalRegistered', label: 'Reg', color: 'bg-green-600', activeBorder: 'border-green-700', listType: 'registered', inactiveClass: 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' },
    { id: 'totalRegPending', label: 'Unreg', color: 'bg-amber-600', activeBorder: 'border-amber-700', listType: 'regPending', inactiveClass: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' },
    { id: 'totalPDrop', label: 'P-Drop', color: 'bg-rose-700', activeBorder: 'border-rose-800', listType: 'pdrop', inactiveClass: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' },
    { id: 'totalTDrop', label: 'T-Drop', color: 'bg-orange-600', activeBorder: 'border-orange-700', listType: 'tdrop', inactiveClass: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' },
    { id: 'totalCrCom', label: 'Cr. Com', color: 'bg-emerald-600', activeBorder: 'border-emerald-700', listType: 'crcom', inactiveClass: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
    { id: 'totalDefense', label: 'Def. Reg', color: 'bg-teal-600', activeBorder: 'border-teal-700', listType: 'defense', inactiveClass: 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100' },
    { id: 'totalDues', label: 'Dues', color: 'bg-amber-700', activeBorder: 'border-amber-800', listType: 'dues', inactiveClass: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' }
];

export const AdmittedReportTable: React.FC<AdmittedReportTableProps> = ({
    selectedAdmittedSemesters,
    studentCache,
    registrationLookup,
    registeredSemesters,
    programMap,
    programData,
    selectedPrograms,
    selectedFaculties,
    setSelectedFaculties,
    selectedProgramTypes,
    selectedSemesterTypes,
    onUnregClick,
    externalTargetRegSemester,
    onTargetRegSemesterChange,
    diuEmployeeData = [],
    teacherData = [],
    onSaveStudent,
    hideSummaryToggle = false
}) => {
    const [localTargetRegSemester, setLocalTargetRegSemester] = useState<string>('');
    const targetRegSemester = externalTargetRegSemester !== undefined ? externalTargetRegSemester : localTargetRegSemester;
    const setTargetRegSemester = onTargetRegSemesterChange || setLocalTargetRegSemester;

    const [viewType, setViewType] = useState<'detailed' | 'summary'>(hideSummaryToggle ? 'detailed' : 'detailed');
    
    const [activeChartFaculty, setActiveChartFaculty] = useState<string | null>(null);
    const [activeChartMetric, setActiveChartMetric] = useState<string>('totalAdmitted');

    const [inlineSelection, setInlineSelection] = useState<{
        title: string;
        students: StudentDataRow[];
        listType: string;
    } | null>(null);

    const [listSearchTerm, setListSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    useEffect(() => {
        if (hideSummaryToggle && viewType === 'summary') {
            setViewType('detailed');
        }
    }, [hideSummaryToggle, viewType]);

    useEffect(() => {
        if (!targetRegSemester && registeredSemesters.length > 0) setTargetRegSemester(registeredSemesters[0]);
    }, [registeredSemesters, targetRegSemester, setTargetRegSemester]);

    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Helper to normalize semester strings for comparison (e.g. "Spring '24" -> "spring 2024")
    const normalizeSemesterString = (sem: string) => {
        if (!sem) return '';
        const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
        if (!match) return sem.trim().toLowerCase();
        const season = match[1].toLowerCase();
        let year = match[2];
        if (year.length === 2) year = '20' + year;
        return `${season} ${year}`;
    };

    const programDetailsMap = useMemo(() => {
        const map = new Map<string, ProgramDataRow>();
        programData.forEach(p => { if(p.PID) map.set(normalize(p.PID), p); });
        return map;
    }, [programData]);

    const uniqueFaculties = useMemo(() => {
        const facs = new Set<string>();
        programData.forEach(p => { if (p['Faculty Short Name']) facs.add(p['Faculty Short Name']); });
        return Array.from(facs).sort();
    }, [programData]);

    // Internal Helper: Check if student has dues matching the target semester
    const checkDuesForSemester = (duesStr: string | undefined, targetSem: string) => {
        if (!duesStr || isValEmpty(duesStr)) return false;
        
        // Legacy support: if it doesn't contain separators, treat as global dues
        if (!duesStr.includes(FIELD_SEP)) return true;

        const normalizedTarget = normalizeSemesterString(targetSem);
        const records = duesStr.split(RECORD_SEP).map(r => r.trim()).filter(Boolean);
        
        return records.some(r => {
            const fields = r.split(FIELD_SEP).map(f => f.trim());
            // fields[3] is TargetSemester (e.g., "Spring 2024")
            const recordSemesterNormalized = normalizeSemesterString(fields[3]);
            const isDone = fields[6] === 'DONE';
            
            return recordSemesterNormalized === normalizedTarget && !isDone;
        });
    };

    const { sortedAdmittedSemesters, allPrograms, facultyGroups, sortedFaculties, allFilteredStudents } = useMemo(() => {
        const effectiveTarget = targetRegSemester || registeredSemesters[0];
        if (!effectiveTarget) return { sortedAdmittedSemesters: [], allPrograms: [], facultyGroups: {}, sortedFaculties: [], allFilteredStudents: [] };

        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSemester = (sem: string) => {
             const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
             if (!match) return { year: 0, season: -1, original: sem };
             let year = parseInt(match[2], 10); if (year < 100) year += 2000;
             const season = seasonWeight[match[1].toLowerCase()] ?? -1;
             return { year, season, original: sem };
        };
        const targetParsed = parseSemester(effectiveTarget);
        
        let sortedSemesters = Array.from(selectedAdmittedSemesters)
            .map(parseSemester)
            .filter(s => s.year < targetParsed.year || (s.year === targetParsed.year && s.season <= targetParsed.season))
            .sort((a, b) => a.year !== b.year ? b.year - a.year : b.season - a.season)
            .map(s => s.original);

        const progStats: Record<string, Record<string, { admitted: number, unregistered: number, pDrop: number, tDrop: number, crCom: number, defense: number, regPending: number, dues: number }>> = {};
        const progTotals: Record<string, { admitted: number, unregistered: number, pDrop: number, tDrop: number, crCom: number, defense: number, regPending: number, dues: number }> = {};
        const progNames = new Set<string>();
        const studentsInContext: StudentDataRow[] = [];

        sortedSemesters.forEach((sem: string) => {
            const students = studentCache.get(sem) || [];
            students.forEach((student) => {
                const id = String(student['Student ID']).trim();
                const normalizePid = normalize(student.PID);
                
                if (selectedPrograms.size > 0 && !selectedPrograms.has(normalizePid)) return;
                
                if (selectedFaculties.size > 0 || selectedProgramTypes.size > 0 || selectedSemesterTypes.size > 0) {
                    const pInfo = programDetailsMap.get(normalizePid);
                    if (!pInfo) return;
                    if (selectedFaculties.size > 0 && !selectedFaculties.has(pInfo['Faculty Short Name'])) return;
                    if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(pInfo['Program Type'])) return;
                    if (selectedSemesterTypes.size > 0 && !selectedSemesterTypes.has(pInfo['Semester Type'])) return;
                }

                progNames.add(normalizePid);
                const isRegistered = registrationLookup.get(id)?.has(effectiveTarget) || false;
                const isUnregistered = !isRegistered;
                const dropClass = student['Dropout Classification'] || '';
                const isPDrop = dropClass.includes('Permanent');
                const isTDrop = dropClass.includes('Temporary');
                
                const credReqValue = parseFloat(student['Credit Requirement'] || '0');
                const credComValue = parseFloat(student['Credit Completed'] || '0');
                const isCrCom = !isNaN(credReqValue) && !isNaN(credComValue) && credReqValue > 0 && (credComValue >= credReqValue);

                const isDefense = !isValEmpty(student['Defense Registration']);
                const isRegPending = isUnregistered && !isPDrop && !isCrCom;
                
                // FIXED: Use contextual dues check matching effectiveTarget with normalization
                const hasDues = checkDuesForSemester(student.Dues, effectiveTarget);

                if (!progStats[normalizePid]) progStats[normalizePid] = {};
                if (!progStats[normalizePid][sem]) {
                    progStats[normalizePid][sem] = { admitted: 0, unregistered: 0, pDrop: 0, tDrop: 0, crCom: 0, defense: 0, regPending: 0, dues: 0 };
                }
                
                progStats[normalizePid][sem].admitted++;
                if (isUnregistered) progStats[normalizePid][sem].unregistered++;
                if (isPDrop) progStats[normalizePid][sem].pDrop++;
                if (isTDrop) progStats[normalizePid][sem].tDrop++;
                if (isCrCom) progStats[normalizePid][sem].crCom++;
                if (isDefense) progStats[normalizePid][sem].defense++;
                if (isRegPending) progStats[normalizePid][sem].regPending++;
                if (hasDues) progStats[normalizePid][sem].dues++;

                if (!progTotals[normalizePid]) progTotals[normalizePid] = { admitted: 0, unregistered: 0, pDrop: 0, tDrop: 0, crCom: 0, defense: 0, regPending: 0, dues: 0 };
                progTotals[normalizePid].admitted++;
                if (isUnregistered) progTotals[normalizePid].unregistered++;
                if (isPDrop) progTotals[normalizePid].pDrop++;
                if (isTDrop) progTotals[normalizePid].tDrop++;
                if (isCrCom) progTotals[normalizePid].crCom++;
                if (isDefense) progTotals[normalizePid].defense++;
                if (isRegPending) progTotals[normalizePid].regPending++;
                if (hasDues) progTotals[normalizePid].dues++;

                studentsInContext.push({ ...student, _semester: sem });
            });
        });

        const allProgs = Array.from(progNames).sort().reduce((acc: any[], pid: string) => {
            const name = programMap.get(pid);
            if (name) {
                acc.push({
                    pid: pid.toUpperCase(),
                    name: name,
                    data: progStats[pid] || {},
                    totalAdmitted: progTotals[pid]?.admitted || 0,
                    totalUnregistered: progTotals[pid]?.unregistered || 0,
                    totalRegistered: (progTotals[pid]?.admitted || 0) - (progTotals[pid]?.unregistered || 0),
                    totalPDrop: progTotals[pid]?.pDrop || 0,
                    totalTDrop: progTotals[pid]?.tDrop || 0,
                    totalCrCom: progTotals[pid]?.crCom || 0,
                    totalDefense: progTotals[pid]?.defense || 0,
                    totalRegPending: progTotals[pid]?.regPending || 0,
                    totalDues: progTotals[pid]?.dues || 0
                });
            }
            return acc;
        }, []);

        const groups: Record<string, any[]> = {};
        allProgs.forEach(prog => {
            const pInfo = programDetailsMap.get(prog.pid.toLowerCase());
            const faculty = pInfo ? (pInfo['Faculty Short Name'] || 'Other') : 'Other';
            if (!groups[faculty]) groups[faculty] = [];
            groups[faculty].push({ ...prog, faculty });
        });
        const sortedFacs = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT', 'Other'].filter(f => groups[f] && groups[f].length > 0);
        return { sortedAdmittedSemesters: sortedSemesters, allPrograms: allProgs, facultyGroups: groups, sortedFaculties: sortedFacs, allFilteredStudents: studentsInContext };
    }, [selectedAdmittedSemesters, studentCache, targetRegSemester, registeredSemesters, registrationLookup, programMap, programDetailsMap, selectedPrograms, selectedFaculties, selectedProgramTypes, selectedSemesterTypes]);

    const selectedStudent = useMemo(() => {
        if (!selectedStudentId) return null;
        return allFilteredStudents.find(s => s['Student ID'] === selectedStudentId) || null;
    }, [selectedStudentId, allFilteredStudents]);

    const programInfoAtSelection = useMemo(() => {
        if (!selectedStudent) return null;
        return programDetailsMap.get(normalize(selectedStudent.PID)) || null;
    }, [selectedStudent, programDetailsMap]);

    const employeeOptions = useMemo(() => {
        const map = new Map<string, string>();
        (diuEmployeeData || []).forEach(e => { 
            const id = e['Employee ID']?.trim(); 
            if (!id) return; 
            map.set(normalizeId(id), `${e['Employee Name']} - ${[e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/')} (${id})`); 
        });
        (teacherData || []).forEach(t => { 
            const id = t['Employee ID']?.trim(); 
            if (!id) return; 
            const normId = normalizeId(id); 
            if (!map.has(normId)) map.set(normId, `${t['Employee Name']} - ${t.Designation} (${id})`); 
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }, [diuEmployeeData, teacherData]);

    const isTransposed = allPrograms.length === 1;

    const getStudentsByType = (sem: string, pid: string, type: 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' | 'dues') => {
        const targetPidNorm = normalize(pid);
        const target = targetRegSemester || registeredSemesters[0];
        
        const filterFn = (s: StudentDataRow) => {
            if (sem !== 'ALL' && normalize(s.PID) !== targetPidNorm) return false;
            if (sem === 'ALL' && pid !== 'ALL' && normalize(s.PID) !== targetPidNorm) return false;
            
            const id = String(s['Student ID']).trim();
            if (type === 'all') return true; 
            if (type === 'registered') return registrationLookup.get(id)?.has(target);
            if (type === 'unregistered') return !registrationLookup.get(id)?.has(target);
            const dropClass = s['Dropout Classification'] || '';
            if (type === 'pdrop') return dropClass.includes('Permanent');
            if (type === 'tdrop') return dropClass.includes('Temporary');
            
            const crReq = parseFloat(s['Credit Requirement'] || '0');
            const crCom = parseFloat(s['Credit Completed'] || '0');
            const hasCrCom = !isNaN(crReq) && !isNaN(crCom) && crReq > 0 && (crCom >= crReq);

            if (type === 'crcom') return hasCrCom;
            if (type === 'defense') return !isValEmpty(s['Defense Registration']);
            
            // FIXED: Contextual dues filter for clicking count with normalization
            if (type === 'dues') return checkDuesForSemester(s.Dues, target);
            
            const isRegPendingStatus = !registrationLookup.get(id)?.has(target) && !dropClass.includes('Permanent') && !hasCrCom;
            if (type === 'regPending') return isRegPendingStatus;
            
            return false;
        };

        if (sem !== 'ALL') {
            const students = studentCache.get(sem) || [];
            return students.filter(filterFn).map(s => ({ ...s, _semester: sem })); 
        }
        
        const allStudents: StudentDataRow[] = [];
        sortedAdmittedSemesters.forEach(sName => {
            const students = studentCache.get(sName) || [];
            students.forEach(s => {
                if (filterFn(s)) {
                    allStudents.push({ ...s, _semester: sName });
                }
            });
        });
        return allStudents;
    };

    useEffect(() => {
        if (viewType === 'summary' && !inlineSelection && allFilteredStudents.length > 0) {
            const enrolledStudents = getStudentsByType('ALL', 'ALL', 'all');
            setInlineSelection({
                title: 'All Enrolled Students',
                students: enrolledStudents,
                listType: 'all'
            });
            if (enrolledStudents.length > 0) {
                setSelectedStudentId(enrolledStudents[0]['Student ID']);
            }
        }
    }, [allFilteredStudents, viewType, inlineSelection, targetRegSemester]);

    useEffect(() => {
        if (viewType === 'summary' && inlineSelection && inlineSelection.students.length > 0 && !selectedStudentId) {
            setSelectedStudentId(inlineSelection.students[0]['Student ID']);
        }
    }, [inlineSelection, viewType, selectedStudentId]);

    const paginationDataInput = useMemo(() => {
        if (viewType === 'summary') return []; 
        if (isTransposed) return sortedAdmittedSemesters;
        return allPrograms;
    }, [viewType, isTransposed, sortedAdmittedSemesters, allPrograms]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(paginationDataInput);

    const handleSaveStudentInternal = async (semester: string, updatedStudent: StudentDataRow) => {
        if (inlineSelection) {
            const updatedStudents = inlineSelection.students.map(s => 
                s['Student ID'] === updatedStudent['Student ID'] ? { ...s, ...updatedStudent } : s
            );
            setInlineSelection({ ...inlineSelection, students: updatedStudents });
        }
        if (onSaveStudent) {
            await onSaveStudent(semester, updatedStudent);
        }
    };

    const handleListClick = (semester: string, programId: string, programName: string, listType: 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' | 'dues') => {
        const students = getStudentsByType(semester, programId, listType);
        if (viewType === 'summary') {
            setInlineSelection({
                title: `${programName === 'ALL' ? 'Selected Programs' : programName} - ${listType === 'all' ? 'ENROLLED' : listType.toUpperCase()}`,
                students,
                listType
            });
            setListSearchTerm(''); 
            if (students.length > 0) {
                setSelectedStudentId(students[0]['Student ID']);
            }
        } else {
            onUnregClick?.({
                semester,
                programId,
                programName: programName === 'ALL' ? (allPrograms[0]?.name || 'Program') : programName,
                students,
                targetSemester: targetRegSemester,
                listType
            });
        }
    };

    const renderFacultyCard = (fac: string, mobile: boolean = false) => {
        const programs = facultyGroups[fac];
        if(!programs) return null;
        const totalAdm = programs.reduce((acc, p) => acc + p.totalAdmitted, 0);
        const totalReg = programs.reduce((acc, p) => acc + p.totalRegistered, 0);
        const totalP = programs.reduce((acc, p) => acc + p.totalPDrop, 0);
        const totalT = programs.reduce((acc, p) => acc + p.totalTDrop, 0);
        const totalCC = programs.reduce((acc, p) => acc + p.totalCrCom, 0);
        const totalDef = programs.reduce((acc, p) => acc + p.totalDefense, 0);
        const totalPnd = programs.reduce((acc, p) => acc + p.totalRegPending, 0);
        const totalDues = programs.reduce((acc, p) => acc + p.totalDues, 0);
        const headerColor = FACULTY_COLORS[fac] || 'bg-gray-400';
        const facultyFullName = FACULTY_NAMES[fac] || fac;
        const isChartActive = activeChartFaculty === fac;

        return (
            <div className={`bg-white rounded border shadow-sm flex flex-col overflow-hidden relative ${mobile ? 'w-full h-auto mb-4' : 'min-w-[250px] md:min-w-0 snap-center'}`}>
                <div className="py-2 md:py-1.5 px-3 md:px-2 flex items-center justify-between border-b bg-gray-50 shrink-0">
                    <span className="font-bold text-sm md:text-xs text-gray-700 truncate mr-2">{facultyFullName}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); isChartActive ? setActiveChartFaculty(null) : setActiveChartFaculty(fac); }}
                        className={`p-1 rounded transition-colors ${isChartActive ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-blue-100 text-blue-600'}`}
                    >
                        {isChartActive ? <X className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                    </button>
                </div>
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <div className={`flex flex-col flex-1 ${isChartActive ? 'invisible pointer-events-none' : 'visible'}`}>
                        <div className={`flex justify-between px-3 md:px-2 py-2 md:py-1 ${headerColor} text-white text-xs md:text-[11px] font-bold`}>
                            <span className="w-[18%]">Program</span>
                            <span className="w-[10%] text-center" title="Enrolled Students">Enroll</span>
                            <span className="w-[10%] text-center" title="Registered Students">Reg</span>
                            <span className="w-[12%] text-center whitespace-nowrap" title="Unregistered">Unreg</span>
                            <span className="w-[10%] text-center" title="Permanent Dropout">P-Drop</span>
                            <span className="w-[10%] text-center" title="Temporary Dropout">T-Drop</span>
                            <span className="w-[10%] text-center whitespace-nowrap" title="Credit Completed Students">Cr. Com</span>
                            <span className="w-[10%] text-center whitespace-nowrap" title="Defense Registration">Def. Reg</span>
                            <span className="w-[10%] text-right whitespace-nowrap" title="Students with Dues">Dues</span>
                        </div>
                        <div className={`divide-y divide-gray-100 overflow-y-auto thin-scrollbar ${mobile ? 'max-h-[400px]' : 'max-h-none flex-1'}`}>
                            {programs.map((p: any) => (
                                <div key={p.pid} className="flex justify-between px-2 py-1 text-[10px] hover:bg-blue-50/40 items-center h-[28px]">
                                    <span className="w-[18%] text-gray-700 truncate font-medium"><span className="font-mono font-bold mr-1 text-gray-400">{p.pid}</span>{p.name}</span>
                                    <span className="w-[10%] text-center font-bold text-gray-900 cursor-pointer hover:underline hover:text-blue-600 transition-colors" onClick={() => p.totalAdmitted > 0 && handleListClick('ALL', p.pid, p.name, 'all')}>{p.totalAdmitted}</span>
                                    <span className="w-[10%] text-center text-green-600 font-bold cursor-pointer hover:underline transition-colors" onClick={() => p.totalRegistered > 0 && handleListClick('ALL', p.pid, p.name, 'registered')}>{p.totalRegistered}</span>
                                    <span className="w-[12%] text-center text-amber-700 font-black cursor-pointer hover:underline transition-colors" onClick={() => p.totalRegPending > 0 && handleListClick('ALL', p.pid, p.name, 'regPending')}>{p.totalRegPending}</span>
                                    <span className="w-[10%] text-center text-rose-700 font-black cursor-pointer hover:underline transition-colors" onClick={() => p.totalPDrop > 0 && handleListClick('ALL', p.pid, p.name, 'pdrop')}>{p.totalPDrop}</span>
                                    <span className="w-[10%] text-center text-orange-600 font-bold cursor-pointer hover:underline transition-colors" onClick={() => p.totalTDrop > 0 && handleListClick('ALL', p.pid, p.name, 'tdrop')}>{p.totalTDrop}</span>
                                    <span className="w-[10%] text-center text-emerald-700 font-black cursor-pointer hover:underline transition-colors" onClick={() => p.totalCrCom > 0 && handleListClick('ALL', p.pid, p.name, 'crcom')}>{p.totalCrCom}</span>
                                    <span className="w-[10%] text-center text-teal-700 font-black cursor-pointer hover:underline transition-colors" onClick={() => p.totalDefense > 0 && handleListClick('ALL', p.pid, p.name, 'defense')}>{p.totalDefense}</span>
                                    <span className="w-[10%] text-right text-amber-900 font-black cursor-pointer hover:underline transition-colors" onClick={() => p.totalDues > 0 && handleListClick('ALL', p.pid, p.name, 'dues')}>{p.totalDues}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 flex justify-between text-[10px] font-bold text-gray-800 shrink-0">
                            <span className="w-[18%]">Subtotal</span>
                            <span className="w-[10%] text-center text-blue-800 cursor-pointer hover:underline transition-colors" onClick={() => totalAdm > 0 && handleListClick('ALL', 'ALL', fac, 'all')}>{totalAdm}</span>
                            <span className="w-[10%] text-center text-green-700 cursor-pointer hover:underline transition-colors" onClick={() => totalReg > 0 && handleListClick('ALL', 'ALL', fac, 'registered')}>{totalReg}</span>
                            <span className="text-[10px] text-center w-[12%] text-amber-900 cursor-pointer hover:underline transition-colors" onClick={() => totalPnd > 0 && handleListClick('ALL', 'ALL', fac, 'regPending')}>{totalPnd}</span>
                            <span className="text-[10px] text-center w-[10%] text-rose-800 cursor-pointer hover:underline transition-colors" onClick={() => totalP > 0 && handleListClick('ALL', 'ALL', fac, 'pdrop')}>{totalP}</span>
                            <span className="text-[10px] text-center w-[10%] text-orange-700 cursor-pointer hover:underline transition-colors" onClick={() => totalT > 0 && handleListClick('ALL', 'ALL', fac, 'tdrop')}>{totalT}</span>
                            <span className="text-[10px] text-center w-[10%] text-emerald-900 cursor-pointer hover:underline transition-colors" onClick={() => totalCC > 0 && handleListClick('ALL', 'ALL', fac, 'crcom')}>{totalCC}</span>
                            <span className="text-[10px] text-center w-[10%] text-teal-900 cursor-pointer hover:underline transition-colors" onClick={() => totalDef > 0 && handleListClick('ALL', 'ALL', fac, 'defense')}>{totalDef}</span>
                            <span className="w-[10%] text-right text-amber-900 cursor-pointer hover:underline transition-colors" onClick={() => totalDues > 0 && handleListClick('ALL', 'ALL', fac, 'dues')}>{totalDues}</span>
                        </div>
                    </div>
                    {isChartActive && (
                        <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in fade-in zoom-in-95 duration-200 border-t border-slate-100">
                             <div className="flex-1 p-2 flex flex-col min-h-0">
                                <div className="flex-1 flex items-end justify-between space-x-1 border-b border-slate-100 pb-1 px-1 relative">
                                    {programs.map((p: any, idx: number) => {
                                        const maxVal = Math.max(...programs.map(p => (p as any)[activeChartMetric] || 0), 1);
                                        const val = p[activeChartMetric] || 0;
                                        const height = (val / maxVal) * 82;
                                        const barColor = BAR_COLORS[idx % BAR_COLORS.length];
                                        const metricConfig = CHART_METRICS.find(m => m.id === activeChartMetric);
                                        const currentListType = (metricConfig?.listType as any) || 'all';
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                {val > 0 && <span className="text-[8px] font-black text-slate-700 mb-0.5 animate-in fade-in duration-500">{val}</span>}
                                                <div onClick={() => val > 0 && handleListClick('ALL', p.pid, p.name, currentListType)} className="w-full max-w-[24px] rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm relative cursor-pointer" style={{ height: `${height}%`, backgroundColor: barColor, minHeight: val > 0 ? '2px' : '0' }}>
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded border shadow-md z-30 pointer-events-none whitespace-nowrap flex flex-col items-center min-w-[50px]"><span className="text-blue-600 border-b border-blue-50 w-full text-center pb-0.5 mb-0.5">{p.name}</span><span className="text-[10px] text-slate-800">{val}</span></div>
                                                </div>
                                                <div className="mt-1 w-full text-center shrink-0"><span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter block truncate w-full" title={p.name}>{p.pid}</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="shrink-0 overflow-x-auto no-scrollbar py-2 border-t border-slate-50 mt-auto">
                                    <div className="flex items-center space-x-1 px-1 w-fit mx-auto">
                                        {CHART_METRICS.map(m => {
                                            const isActive = activeChartMetric === m.id;
                                            return (
                                                <button key={m.id} onClick={() => setActiveChartMetric(m.id)} className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border shrink-0 ${isActive ? `${m.color} text-white ${m.activeBorder} shadow-sm` : m.inactiveClass}`}>{m.label}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const filteredInlineStudents = useMemo(() => {
        if (!inlineSelection) return [];
        if (!listSearchTerm.trim()) return inlineSelection.students;
        const lower = listSearchTerm.toLowerCase();
        return inlineSelection.students.filter(s => s['Student Name'].toLowerCase().includes(lower) || s['Student ID'].toLowerCase().includes(lower) || (s.Mobile && s.Mobile.toLowerCase().includes(lower)));
    }, [inlineSelection, listSearchTerm]);

    return (
        <div className="flex flex-col h-full bg-white rounded shadow-sm relative">
            <div className="px-3 py-1.5 border-b border-gray-200 bg-slate-50 flex items-center justify-between shrink-0 gap-3 overflow-hidden h-[40px]">
                <div className="text-[10px] font-bold text-gray-800 flex items-center shrink-0 uppercase tracking-wider"><BarChart3 className="w-3 h-3 mr-1.5 text-blue-600" />{viewType === 'summary' ? 'Faculty Analysis' : isTransposed ? `${allPrograms[0]?.pid} Analysis` : 'Analysis'}</div>
                {viewType === 'summary' && !isTransposed && (
                    <div className="hidden md:flex items-center space-x-1 overflow-x-auto thin-scrollbar ml-4">
                        <button onClick={() => setSelectedFaculties(new Set())} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.size === 0 ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>All</button>
                        {uniqueFaculties.map(fac => (
                            <button key={fac} onClick={() => { const newSet = new Set(selectedFaculties); if (newSet.has(fac)) newSet.delete(fac); else newSet.add(fac); setSelectedFaculties(newSet); }} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.has(fac) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}>{fac}</button>
                        ))}
                    </div>
                )}
                <div className="flex items-center space-x-3 overflow-hidden justify-end flex-1">
                    {viewType !== 'summary' && !isTransposed && (
                        <div className="hidden md:flex items-center space-x-1 overflow-x-auto thin-scrollbar"><span className="text-[9px] font-bold text-gray-400 uppercase mr-1 whitespace-nowrap">Faculty:</span><button onClick={() => setSelectedFaculties(new Set())} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.size === 0 ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>All</button>{uniqueFaculties.map(fac => (<button key={fac} onClick={() => { const newSet = new Set(selectedFaculties); if (newSet.has(fac)) newSet.delete(fac); else newSet.add(fac); setSelectedFaculties(newSet); }} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.has(fac) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}>{fac}</button>))}</div>
                    )}
                    {!hideSummaryToggle && (
                        <div className="flex items-center bg-white border border-gray-200 rounded p-0.5 shadow-sm hidden md:flex">
                            <button onClick={() => setViewType('detailed')} className={`p-1 rounded transition-colors ${viewType === 'detailed' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><ListIcon className="w-3 h-3" /></button>
                            <button onClick={() => setViewType('summary')} className={`p-1 rounded transition-colors ${viewType === 'summary' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-3 h-3" /></button>
                        </div>
                    )}
                    <div className="flex items-center space-x-1 shrink-0"><span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap hidden md:inline">Compare:</span><select value={targetRegSemester} onChange={(e) => setTargetRegSemester(e.target.value)} className="text-[10px] border-gray-300 rounded shadow-sm focus:border-blue-500 py-0.5 pl-1.5 pr-5 bg-white cursor-pointer">{registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden relative bg-white flex flex-col">
                {viewType === 'detailed' ? (
                    <>
                        <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                            {isTransposed ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-700 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white sticky left-0 z-30 bg-slate-700 w-40 uppercase tracking-wider">Semester</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider">Enroll</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider">Reg</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap">Unreg</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap">P-Drop</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap">T-Drop</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap">Cr. Com</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap">Def. Reg</th>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap">Dues</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedData.map((sem: string) => {
                                            const prog = allPrograms[0];
                                            const data = prog.data[sem];
                                            const adm = data?.admitted || 0, unreg = data?.unregistered || 0, pDrop = data?.pDrop || 0, tDrop = data?.tDrop || 0, crCom = data?.crCom || 0, defense = data?.defense || 0, regPending = data?.regPending || 0, dues = data?.dues || 0;
                                            const reg = adm - unreg;
                                            return (
                                                <tr key={sem} className="group transition-colors h-[28px]">
                                                    <td className="px-3 py-1 font-bold text-gray-700 border-r border-gray-100 sticky left-0 bg-white transition-colors text-[11px]">{sem}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-medium text-gray-800 border-r border-gray-50">{adm > 0 ? <span className="cursor-pointer hover:underline hover:text-blue-600 transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'all')}>{adm}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-bold text-green-600 border-r border-gray-50">{reg > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'registered')}>{reg}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-black text-amber-700 border-r border-gray-50">{regPending > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'regPending')}>{regPending}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-black text-rose-700 border-r border-gray-50">{pDrop > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'pdrop')}>{pDrop}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-black text-orange-600 border-r border-gray-50">{tDrop > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'tdrop')}>{tDrop}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-black text-emerald-700 border-r border-gray-50">{crCom > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'crcom')}>{crCom}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-black text-teal-700 border-r border-gray-50">{defense > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'defense')}>{defense}</span> : <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-2 py-1 text-center text-[11px] font-black text-amber-900">{dues > 0 ? <span className="cursor-pointer hover:underline transition-colors" onClick={() => handleListClick(sem, prog.pid, prog.name, 'dues')}>{dues}</span> : <span className="text-gray-300">-</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-700 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                                        <tr>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white sticky left-0 z-30 bg-slate-700 min-w-[150px] w-auto whitespace-nowrap uppercase tracking-wider">Program</th>
                                            {sortedAdmittedSemesters.map(sem => (
                                                <th key={sem} className="px-1 py-1 text-[9px] font-bold text-white text-center min-w-[240px]">
                                                    <div className="mb-1">{sem}</div>
                                                    <div className="grid grid-cols-8 gap-1 border-t border-slate-600 pt-1 uppercase text-white/70">
                                                        <span>Adm</span><span>Reg</span><span>Unr</span><span>PDr</span><span>TDr</span><span>CC</span><span>Def</span><span>Due</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-1 py-1 text-[9px] font-bold text-white text-center min-w-[240px] uppercase"><div className="mb-1">Total</div><div className="grid grid-cols-8 gap-1 border-t border-slate-600 pt-1 text-white/70"><span>Adm</span><span>Reg</span><span>Unr</span><span>PDr</span><span>TDr</span><span>CC</span><span>Def</span><span>Due</span></div></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedData.map((prog: any) => (
                                            <tr key={prog.pid} className="text-[10px] h-[28px]">
                                                <td className="px-2 py-1 font-bold text-gray-600 border-r border-gray-100 sticky left-0 bg-white transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap w-auto"><span className="inline-block w-8 text-right mr-2 text-gray-400 font-mono">{prog.pid}</span><span className="text-gray-700" title={prog.name}>{prog.name}</span></td>
                                                {sortedAdmittedSemesters.map(sem => {
                                                    const data = prog.data[sem];
                                                    const adm = data?.admitted || 0, unreg = data?.unregistered || 0, pDrop = data?.pDrop || 0, tDrop = data?.tDrop || 0, crComValue = data?.crCom || 0, defense = data?.defense || 0, regPending = data?.regPending || 0, dues = data?.dues || 0;
                                                    const reg = adm - unreg;
                                                    return (
                                                        <td key={sem} className="px-1 py-1 border-r border-gray-100 text-center">
                                                            <div className="grid grid-cols-8 gap-1">
                                                                <span className={`${adm > 0 ? 'text-gray-700 cursor-pointer hover:underline hover:text-blue-600 transition-colors' : 'text-gray-300'}`} onClick={() => adm > 0 && handleListClick(sem, prog.pid, prog.name, 'all')}>{adm}</span>
                                                                <span className={`${reg > 0 ? 'text-green-600 font-bold cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => reg > 0 && handleListClick(sem, prog.pid, prog.name, 'registered')}>{reg}</span>
                                                                <span className={`${regPending > 0 ? 'text-amber-700 font-black cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => regPending > 0 && handleListClick(sem, prog.pid, prog.name, 'regPending')}>{regPending}</span>
                                                                <span className={`${pDrop > 0 ? 'text-rose-700 font-black cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => pDrop > 0 && handleListClick(sem, prog.pid, prog.name, 'pdrop')}>{pDrop}</span>
                                                                <span className={`${tDrop > 0 ? 'text-orange-600 font-bold cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => tDrop > 0 && handleListClick(sem, prog.pid, prog.name, 'tdrop')}>{tDrop}</span>
                                                                <span className={`${crComValue > 0 ? 'text-emerald-700 font-black cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => crComValue > 0 && handleListClick(sem, prog.pid, prog.name, 'crcom')}>{crComValue}</span>
                                                                <span className={`${defense > 0 ? 'text-teal-700 font-black cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => defense > 0 && handleListClick(sem, prog.pid, prog.name, 'defense')}>{defense}</span>
                                                                <span className={`${dues > 0 ? 'text-amber-900 font-black cursor-pointer hover:underline transition-colors' : 'text-gray-300'}`} onClick={() => dues > 0 && handleListClick(sem, prog.pid, prog.name, 'dues')}>{dues}</span>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-1 py-1 font-bold text-center bg-slate-50 border-l border-gray-200">
                                                    <div className="grid grid-cols-8 gap-1">
                                                        <span className="text-blue-800 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalAdmitted > 0 && handleListClick('ALL', prog.pid, prog.name, 'all')}>{prog.totalAdmitted}</span>
                                                        <span className="text-green-700 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalRegistered > 0 && handleListClick('ALL', prog.pid, prog.name, 'registered')}>{prog.totalRegistered}</span>
                                                        <span className="text-amber-900 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalRegPending > 0 && handleListClick('ALL', prog.pid, prog.name, 'regPending')}>{prog.totalRegPending}</span>
                                                        <span className="text-rose-800 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalPDrop > 0 && handleListClick('ALL', prog.pid, prog.name, 'pdrop')}>{prog.totalPDrop}</span>
                                                        <span className="text-orange-700 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalTDrop > 0 && handleListClick('ALL', prog.pid, prog.name, 'tdrop')}>{prog.totalTDrop}</span>
                                                        <span className="text-emerald-900 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalCrCom > 0 && handleListClick('ALL', prog.pid, prog.name, 'crcom')}>{prog.totalCrCom}</span>
                                                        <span className="text-teal-900 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalDefense > 0 && handleListClick('ALL', prog.pid, prog.name, 'defense')}>{prog.totalDefense}</span>
                                                        <span className="text-amber-900 cursor-pointer hover:underline transition-colors" onClick={() => prog.totalDues > 0 && handleListClick('ALL', prog.pid, prog.name, 'dues')}>{prog.totalDues}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="px-3 py-1 bg-slate-50 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-500 shrink-0 select-none h-[32px]">
                            <div className="flex items-center space-x-2"><span className="font-bold">{currentPage * rowsPerPage - rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, paginationDataInput.length)}</span><span>of</span><span className="font-bold">{paginationDataInput.length}</span></div>
                            <div className="flex items-center space-x-1"><button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button><span className="min-w-[20px] text-center font-black">{currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button><button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button></div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="hidden md:flex flex-row flex-1 overflow-hidden">
                            <div className="basis-[45%] w-[45%] border-r border-gray-200 overflow-y-auto p-3 space-y-3 thin-scrollbar bg-slate-50/30 shrink-0">{sortedFaculties.map(fac => renderFacultyCard(fac))}</div>
                            <div className="basis-[25%] w-[25%] border-r border-gray-200 flex flex-col overflow-hidden bg-white shrink-0">
                                {inlineSelection ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="px-3 py-2 border-b border-gray-100 flex items-center bg-white shrink-0 min-h-[48px] h-auto gap-3"><div className="shrink-0 min-w-0 max-w-[100px]"><h4 className="text-[9px] font-black text-blue-600 uppercase tracking-tight leading-tight break-words">{inlineSelection.title}</h4></div><div className="flex-1 flex justify-center"><div className="relative w-full max-w-[160px] group"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search list..." value={listSearchTerm} onChange={(e) => setListSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-md text-[11px] outline-none transition-all font-medium" /></div></div><div className="flex items-center space-x-1 shrink-0"><button onClick={() => { setListSearchTerm(''); setInlineSelection({ title: 'All Enrolled Students', students: getStudentsByType('ALL', 'ALL', 'all'), listType: 'all' }); }} className="p-1 rounded bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors shrink-0"><FilterX className="w-3.5 h-3.5" /></button><div className="flex flex-col items-end shrink-0 ml-1"><span className="text-[9px] font-black text-slate-800 leading-none">{filteredInlineStudents.length}</span><span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter leading-none mt-0.5">Records</span></div></div></div>
                                        <div className="flex-1 overflow-hidden"><StudentDetailList students={filteredInlineStudents} onRowClick={(student) => setSelectedStudentId(student['Student ID'])} selectedId={selectedStudentId} listType={inlineSelection.listType as any} /></div>
                                    </div>
                                ) : <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300"><Users className="w-8 h-8 opacity-20 mb-2" /><p className="text-[9px] font-black uppercase text-center">Select Data</p></div>}
                            </div>
                            <div className="basis-[30%] w-[30%] flex flex-col overflow-hidden bg-slate-50 shadow-inner">
                                {selectedStudent && programInfoAtSelection ? (
                                    <div className="h-full animate-in slide-in-from-right-2 duration-300"><StudentDetailView student={selectedStudent} program={programInfoAtSelection} diuEmployeeData={diuEmployeeData} teacherData={teacherData} employeeOptions={employeeOptions} onSaveStudent={handleSaveStudentInternal} onClose={() => setSelectedStudentId(null)} registrationLookup={registrationLookup} studentSemester={(selectedStudent as any)._semester} /></div>
                                ) : <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300"><div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm"><UserIcon className="w-8 h-8 opacity-20 text-blue-300" /></div><p className="text-[11px] font-black uppercase tracking-widest text-center text-slate-400 px-4">Click on a student to view profile</p></div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
