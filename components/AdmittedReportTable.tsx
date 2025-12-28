import React, { useMemo, useState, useEffect } from 'react';
import { StudentDataRow, ProgramDataRow } from '../types';
import { LayoutGrid, List as ListIcon, Check, Copy, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserCheck, UserX, UserMinus, PowerOff, Clock, Calculator, ShieldCheck, GraduationCap, Target, AlertCircle } from 'lucide-react';
import { UnregisteredStudentsModal } from './UnregisteredStudentsModal';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { isValEmpty } from '../views/EmployeeView';

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
    onUnregClick?: (data: { semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string; listType: 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' }) => void;
    externalTargetRegSemester?: string;
    onTargetRegSemesterChange?: (val: string) => void;
}

const FACULTY_COLORS: Record<string, string> = {
    'FBE': 'bg-red-500',
    'FE': 'bg-yellow-500',
    'FHLS': 'bg-green-500',
    'FHSS': 'bg-blue-500',
    'FSIT': 'bg-orange-500',
    'Other': 'bg-gray-400'
};

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
    onTargetRegSemesterChange
}) => {
    const [localTargetRegSemester, setLocalTargetRegSemester] = useState<string>('');
    const targetRegSemester = externalTargetRegSemester !== undefined ? externalTargetRegSemester : localTargetRegSemester;
    const setTargetRegSemester = onTargetRegSemesterChange || setLocalTargetRegSemester;

    const [viewType, setViewType] = useState<'detailed' | 'summary'>('detailed');
    const [listModalState, setListModalState] = useState<{ isOpen: boolean; semester: string; programId: string; programName: string; students: StudentDataRow[]; listType: 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' } | null>(null);
    const [activeFaculty, setActiveFaculty] = useState<string>('');

    useEffect(() => {
        if (!targetRegSemester && registeredSemesters.length > 0) setTargetRegSemester(registeredSemesters[0]);
    }, [registeredSemesters, targetRegSemester, setTargetRegSemester]);

    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

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

    const { sortedAdmittedSemesters, allPrograms, facultyGroups, sortedFaculties } = useMemo(() => {
        const effectiveTarget = targetRegSemester || registeredSemesters[0];
        if (!effectiveTarget) return { sortedAdmittedSemesters: [], allPrograms: [], facultyGroups: {}, sortedFaculties: [] };

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

        const progStats: Record<string, Record<string, { admitted: number, unregistered: number, pDrop: number, tDrop: number, crCom: number, defense: number, regPending: number }>> = {};
        const progTotals: Record<string, { admitted: number, unregistered: number, pDrop: number, tDrop: number, crCom: number, defense: number, regPending: number }> = {};
        const progNames = new Set<string>();

        sortedSemesters.forEach((sem: string) => {
            const students = studentCache.get(sem) || [];
            students.forEach((student) => {
                const id = String(student['Student ID']).trim();
                const normalizePid = normalize(student.PID);
                progNames.add(normalizePid);
                const isRegistered = registrationLookup.get(id)?.has(effectiveTarget) || false;
                const isUnregistered = !isRegistered;
                const dropClass = student['Dropout Classification'] || '';
                const isPDrop = dropClass.includes('Permanent');
                const isTDrop = dropClass.includes('Temporary');
                
                // Logic for Credit Completed (Requirement Met)
                const credReq = parseFloat(student['Credit Requirement'] || '0');
                const credCom = parseFloat(student['Credit Completed'] || '0');
                const isCrCom = !isNaN(credReq) && !isNaN(credCom) && credReq > 0 && (credCom >= credReq);

                // Logic for Defense Registration
                const isDefense = !isValEmpty(student['Defense Registration']);

                // Reg Pending = Unregistered AND Not Permanent Drop AND Not Credit Completed
                const isRegPending = isUnregistered && !isPDrop && !isCrCom;

                if (!progStats[normalizePid]) progStats[normalizePid] = {};
                if (!progStats[normalizePid][sem]) progStats[normalizePid][sem] = { admitted: 0, unregistered: 0, pDrop: 0, tDrop: 0, crCom: 0, defense: 0, regPending: 0 };
                progStats[normalizePid][sem].admitted++;
                if (isUnregistered) progStats[normalizePid][sem].unregistered++;
                if (isPDrop) progStats[normalizePid][sem].pDrop++;
                if (isTDrop) progStats[normalizePid][sem].tDrop++;
                if (isCrCom) progStats[normalizePid][sem].crCom++;
                if (isDefense) progStats[normalizePid][sem].defense++;
                if (isRegPending) progStats[normalizePid][sem].regPending++;

                if (!progTotals[normalizePid]) progTotals[normalizePid] = { admitted: 0, unregistered: 0, pDrop: 0, tDrop: 0, crCom: 0, defense: 0, regPending: 0 };
                progTotals[normalizePid].admitted++;
                if (isUnregistered) progTotals[normalizePid].unregistered++;
                if (isPDrop) progTotals[normalizePid].pDrop++;
                if (isTDrop) progTotals[normalizePid].tDrop++;
                if (isCrCom) progTotals[normalizePid].crCom++;
                if (isDefense) progTotals[normalizePid].defense++;
                if (isRegPending) progTotals[normalizePid].regPending++;
            });
        });

        const allProgs = Array.from(progNames).sort().reduce((acc: any[], pid: string) => {
            const name = programMap.get(pid);
            if (name) {
                let matches = true;
                if (selectedPrograms.size > 0 && !selectedPrograms.has(pid)) matches = false;
                if (matches && (selectedFaculties.size > 0 || selectedProgramTypes.size > 0 || selectedSemesterTypes.size > 0)) {
                    const pInfo = programDetailsMap.get(pid);
                    if (!pInfo) matches = false;
                    else {
                        if (selectedFaculties.size > 0 && !selectedFaculties.has(pInfo['Faculty Short Name'])) matches = false;
                        if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(pInfo['Program Type'])) matches = false;
                        if (selectedSemesterTypes.size > 0 && !selectedSemesterTypes.has(pInfo['Semester Type'])) matches = false;
                    }
                }
                if (matches) {
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
                        totalRegPending: progTotals[pid]?.regPending || 0
                    });
                }
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
        return { sortedAdmittedSemesters: sortedSemesters, allPrograms: allProgs, facultyGroups: groups, sortedFaculties: sortedFacs };
    }, [selectedAdmittedSemesters, studentCache, targetRegSemester, registeredSemesters, registrationLookup, programMap, programDetailsMap, selectedPrograms, selectedFaculties, selectedProgramTypes, selectedSemesterTypes]);

    const isTransposed = allPrograms.length === 1;

    const paginationDataInput = useMemo(() => {
        if (isTransposed) return sortedAdmittedSemesters;
        return allPrograms;
    }, [isTransposed, sortedAdmittedSemesters, allPrograms]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(paginationDataInput);

    const getStudentsByType = (sem: string, pid: string, type: 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending') => {
        const targetPidNorm = normalize(pid);
        const target = targetRegSemester || registeredSemesters[0];
        
        const filterFn = (s: StudentDataRow) => {
            if (normalize(s.PID) !== targetPidNorm) return false;
            const id = String(s['Student ID']).trim();
            if (type === 'registered') return registrationLookup.get(id)?.has(target);
            if (type === 'unregistered') return !registrationLookup.get(id)?.has(target);
            const dropClass = s['Dropout Classification'] || '';
            if (type === 'pdrop') return dropClass.includes('Permanent');
            if (type === 'tdrop') return dropClass.includes('Temporary');
            
            const credReq = parseFloat(s['Credit Requirement'] || '0');
            const credCom = parseFloat(s['Credit Completed'] || '0');
            const hasCrCom = !isNaN(credReq) && !isNaN(credCom) && credReq > 0 && (credCom >= credReq);

            if (type === 'crcom') return hasCrCom;
            if (type === 'defense') return !isValEmpty(s['Defense Registration']);
            if (type === 'regPending') {
                return !registrationLookup.get(id)?.has(target) && !dropClass.includes('Permanent') && !hasCrCom;
            }
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

    const handleListClick = (semester: string, programId: string, programName: string, listType: 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending') => {
        const students = getStudentsByType(semester, programId, listType);
        if (onUnregClick) {
            onUnregClick({ semester, programId, programName, students, targetSemester: targetRegSemester, listType });
        } else {
            setListModalState({ isOpen: true, semester, programId, programName, students, listType });
        }
    };

    const renderFacultyCard = (fac: string, mobile: boolean = false) => {
        const progs = facultyGroups[fac];
        if(!progs) return null;
        const totalAdm = progs.reduce((acc, p) => acc + p.totalAdmitted, 0);
        const totalReg = progs.reduce((acc, p) => acc + p.totalRegistered, 0);
        const totalUnreg = progs.reduce((acc, p) => acc + p.totalUnregistered, 0);
        const totalP = progs.reduce((acc, p) => acc + p.totalPDrop, 0);
        const totalT = progs.reduce((acc, p) => acc + p.totalTDrop, 0);
        const totalCC = progs.reduce((acc, p) => acc + p.totalCrCom, 0);
        const totalDef = progs.reduce((acc, p) => acc + p.totalDefense, 0);
        const totalPnd = progs.reduce((acc, p) => acc + p.totalRegPending, 0);
        const headerColor = FACULTY_COLORS[fac] || 'bg-gray-400';

        return (
            <div className={`bg-white rounded border shadow-sm flex flex-col overflow-hidden ${mobile ? 'w-full h-auto mb-4' : 'min-w-[480px] max-w-[520px] shrink-0'}`}>
                {!mobile && <div className="py-1.5 px-2 text-center border-b font-bold text-xs text-gray-700 bg-gray-50">{fac}</div>}
                <div className={`flex justify-between px-2 py-1 ${headerColor} text-white text-[9px] font-bold`}>
                    <span className="w-[18%]">Program</span>
                    <span className="w-[10%] text-center" title="Enrolled Students">Enroll</span>
                    <span className="w-[10%] text-center" title="Registered Students">Reg</span>
                    <span className="w-[10%] text-center" title="Unregistered Students">Unreg</span>
                    <span className="w-[8%] text-center" title="Permanent Dropout">P-Dr</span>
                    <span className="w-[8%] text-center" title="Temporary Dropout">T-Dr</span>
                    <span className="w-[12%] text-center whitespace-nowrap" title="Credit Completed Students">Cr. Com</span>
                    <span className="w-[12%] text-center whitespace-nowrap" title="Defense Registration">Def. Reg</span>
                    <span className="w-[12%] text-right whitespace-nowrap" title="Reg. Pending (Unreg - PDrop - CrCom)">Pnd. Reg</span>
                </div>
                <div className={`divide-y divide-gray-100 overflow-y-auto thin-scrollbar ${mobile ? 'max-h-[400px]' : 'max-h-[300px]'}`}>
                    {progs.map((p: any) => (
                        <div key={p.pid} className="flex justify-between px-2 py-1 text-[10px] hover:bg-gray-50 items-center">
                            <span className="w-[18%] text-gray-700 truncate font-medium" title={`${p.pid} ${p.name}`}><span className="font-mono font-bold mr-1 text-gray-500">{p.pid}</span>{p.name}</span>
                            <span className="w-[10%] text-center font-bold text-gray-900 cursor-pointer hover:underline" onClick={() => p.totalAdmitted > 0 && handleListClick('ALL', p.pid, p.name, 'registered')}>{p.totalAdmitted}</span>
                            <span className="w-[10%] text-center text-green-600 font-bold cursor-pointer hover:underline" onClick={() => p.totalRegistered > 0 && handleListClick('ALL', p.pid, p.name, 'registered')}>{p.totalRegistered}</span>
                            <span className="w-[10%] text-center text-red-500 font-bold cursor-pointer hover:underline" onClick={() => p.totalUnregistered > 0 && handleListClick('ALL', p.pid, p.name, 'unregistered')}>{p.totalUnregistered}</span>
                            <span className="w-[8%] text-center text-rose-700 font-black cursor-pointer hover:underline" onClick={() => p.totalPDrop > 0 && handleListClick('ALL', p.pid, p.name, 'pdrop')}>{p.totalPDrop}</span>
                            <span className="w-[8%] text-center text-orange-600 font-bold cursor-pointer hover:underline" onClick={() => p.totalTDrop > 0 && handleListClick('ALL', p.pid, p.name, 'tdrop')}>{p.totalTDrop}</span>
                            <span className="w-[12%] text-center text-emerald-700 font-black cursor-pointer hover:underline" onClick={() => p.totalCrCom > 0 && handleListClick('ALL', p.pid, p.name, 'crcom')}>{p.totalCrCom}</span>
                            <span className="w-[12%] text-center text-teal-700 font-black cursor-pointer hover:underline" onClick={() => p.totalDefense > 0 && handleListClick('ALL', p.pid, p.name, 'defense')}>{p.totalDefense}</span>
                            <span className="w-[12%] text-right text-amber-700 font-black cursor-pointer hover:underline" onClick={() => p.totalRegPending > 0 && handleListClick('ALL', p.pid, p.name, 'regPending')}>{p.totalRegPending}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 flex justify-between text-[10px] font-bold text-gray-800">
                    <span className="w-[18%]">Total</span>
                    <span className="w-[10%] text-center">{totalAdm}</span>
                    <span className="w-[10%] text-center text-green-700">{totalReg}</span>
                    <span className="w-[10%] text-center text-red-600">{totalUnreg}</span>
                    <span className="w-[8%] text-center text-rose-800">{totalP}</span>
                    <span className="w-[8%] text-center text-orange-700">{totalT}</span>
                    <span className="w-[12%] text-center text-emerald-900">{totalCC}</span>
                    <span className="w-[12%] text-center text-teal-900">{totalDef}</span>
                    <span className="w-[12%] text-right text-amber-900">{totalPnd}</span>
                </div>
            </div>
        );
    };

    const renderChart = (facultiesToShow: string[]) => {
        const chartData: any[] = [];
        facultiesToShow.forEach(fac => {
            const progs = facultyGroups[fac];
            if (progs) chartData.push(...progs.map(p => ({ ...p, faculty: fac })));
        });
        if (chartData.length === 0) return <div className="w-full text-center text-gray-400 self-center">No data available</div>;
        const maxCount = Math.max(...chartData.map(p => p.totalAdmitted), 1);

        return (
            <div className="absolute inset-0 flex items-end justify-between space-x-1 px-2 pb-2 pt-12 overflow-x-auto thin-scrollbar">
                {chartData.map((p, idx) => {
                    const heightPercent = Math.max((p.totalAdmitted / maxCount) * 70, 2);
                    const barColor = FACULTY_COLORS[p.faculty] || 'bg-gray-400';
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full hover:bg-gray-50/50 rounded-lg transition-colors min-w-[20px]">
                            <span className="text-[9px] font-bold text-gray-500 mb-0.5">{p.totalAdmitted}</span>
                            <div className="absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 flex flex-col items-center mb-5" style={{ bottom: `${heightPercent}%` }}>
                                <span className="font-bold">{p.pid}</span>
                                <span className="text-[9px] opacity-90">Enroll: {p.totalAdmitted}</span>
                                <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1"></div>
                            </div>
                            <div className={`w-full rounded-t-sm ${barColor} transition-all hover:opacity-80 relative`} style={{ height: `${heightPercent}%`, minHeight: '4px' }}></div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white rounded shadow-sm relative">
            <div className="px-3 py-1.5 border-b border-gray-200 bg-slate-50 flex items-center justify-between shrink-0 gap-3 overflow-hidden h-[40px]">
                <div className="text-[10px] font-bold text-gray-800 flex items-center shrink-0 uppercase tracking-wider">
                    <BarChart3 className="w-3 h-3 mr-1.5 text-blue-600" />
                    {viewType === 'summary' ? 'Summary' : isTransposed ? `${allPrograms[0].pid} Semester Analysis` : 'Semester Analysis'}
                </div>
                <div className="flex items-center space-x-3 overflow-hidden justify-end flex-1" onMouseDown={(e) => e.stopPropagation()}>
                    {!isTransposed && (
                        <div className="hidden md:flex items-center space-x-1 overflow-x-auto thin-scrollbar">
                            <span className="text-[9px] font-bold text-gray-400 uppercase mr-1 whitespace-nowrap">Faculty:</span>
                            <button onClick={() => setSelectedFaculties(new Set())} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.size === 0 ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>All</button>
                            {uniqueFaculties.map(fac => (
                                <button key={fac} onClick={() => { const newSet = new Set(selectedFaculties); if (newSet.has(fac)) newSet.delete(fac); else newSet.add(fac); setSelectedFaculties(newSet); }} className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.has(fac) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}>{fac}</button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center bg-white border border-gray-200 rounded p-0.5 shadow-sm hidden md:flex">
                        <button onClick={() => setViewType('detailed')} className={`p-1 rounded transition-colors ${viewType === 'detailed' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="Detailed"><ListIcon className="w-3 h-3" /></button>
                        <button onClick={() => setViewType('summary')} className={`p-1 rounded transition-colors ${viewType === 'summary' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="Summary"><LayoutGrid className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                        <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap hidden md:inline">Compare:</span>
                        <select 
                            value={targetRegSemester} 
                            onChange={(e) => setTargetRegSemester(e.target.value)} 
                            className="text-[10px] border-gray-300 rounded shadow-sm focus:border-blue-500 py-0.5 pl-1.5 pr-5 bg-white cursor-pointer"
                        >
                            {registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-white flex flex-col">
                {viewType === 'detailed' ? (
                    <>
                        <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                            {isTransposed ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-700 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white sticky left-0 z-30 bg-slate-700 w-48 uppercase tracking-wider">Semester</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider" title="Enrolled Students">Enroll</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider" title="Registered Students">Reg</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider" title="Unregistered Students">Unreg</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap" title="Permanent Dropout">P-Drop</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap" title="Temporary Dropout">T-Drop</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap" title="Credit Completed Students (Met Requirements)">Cr. Com</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap" title="Defense Registration">Def. Reg</th>
                                            <th className="px-3 py-1.5 text-[10px] font-bold text-white text-center uppercase tracking-wider whitespace-nowrap" title="Registration Pending (Unreg - PDrop - CrCom)">Reg. Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedData.map((sem: string) => {
                                            const prog = allPrograms[0];
                                            const data = prog.data[sem];
                                            const adm = data?.admitted || 0;
                                            const unreg = data?.unregistered || 0;
                                            const pDrop = data?.pDrop || 0;
                                            const tDrop = data?.tDrop || 0;
                                            const crCom = data?.crCom || 0;
                                            const defense = data?.defense || 0;
                                            const regPending = data?.regPending || 0;
                                            const reg = adm - unreg;

                                            return (
                                                <tr key={sem} className="group hover:bg-blue-50/40 transition-colors h-[28px]">
                                                    <td className="px-3 py-1 font-bold text-gray-700 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors text-[11px]">
                                                        {sem}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-medium text-gray-800 border-r border-gray-50">
                                                        {adm > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-slate-400"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'registered')}
                                                            >
                                                                {adm}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-bold text-green-600 border-r border-gray-50">
                                                        {reg > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-green-500"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'registered')}
                                                            >
                                                                {reg}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-black text-red-500 border-r border-gray-50">
                                                        {unreg > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-red-500"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'unregistered')}
                                                            >
                                                                {unreg}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-black text-rose-700 border-r border-gray-50">
                                                        {pDrop > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-rose-500"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'pdrop')}
                                                            >
                                                                {pDrop}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-black text-orange-600 border-r border-gray-50">
                                                        {tDrop > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-orange-400"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'tdrop')}
                                                            >
                                                                {tDrop}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-black text-emerald-700 border-r border-gray-50">
                                                        {crCom > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-emerald-400"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'crcom')}
                                                            >
                                                                {crCom}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-black text-teal-700 border-r border-gray-50">
                                                        {defense > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-teal-400"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'defense')}
                                                            >
                                                                {defense}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-3 py-1 text-center text-[11px] font-black text-amber-700">
                                                        {regPending > 0 ? (
                                                            <span 
                                                                className="cursor-pointer hover:underline decoration-amber-400"
                                                                onClick={() => handleListClick(sem, prog.pid, prog.name, 'regPending')}
                                                            >
                                                                {regPending}
                                                            </span>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {paginatedData.length === 0 && (
                                            <tr><td colSpan={9} className="py-8 text-center text-gray-400 italic text-[11px]">No semesters found for analysis.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-700 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-2 py-1.5 text-[10px] font-bold text-white sticky left-0 z-30 bg-slate-700 min-w-[150px] w-auto whitespace-nowrap uppercase tracking-wider">Program</th>
                                            {sortedAdmittedSemesters.map(sem => (
                                                <th key={sem} className="px-1 py-1 text-[9px] font-bold text-white text-center min-w-[240px]">
                                                    <div className="flex items-center justify-center space-x-1 mb-1"><span>{sem}</span></div>
                                                    <div className="grid grid-cols-8 gap-1 border-t border-slate-600 pt-1 uppercase text-white/70">
                                                        <span title="Admitted Student">Adm</span><span title="Registered Student">Reg</span><span title="Unregistered Student">Unr</span><span className="whitespace-nowrap" title="Permanent Dropout">PDr</span><span className="whitespace-nowrap" title="Temporary Dropout">TDr</span><span className="whitespace-nowrap" title="Credit Completed Students">CC</span><span className="whitespace-nowrap" title="Defense Registration">Def</span><span className="whitespace-nowrap" title="Reg. Pending">Pnd</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-1 py-1 text-[9px] font-bold text-white text-center min-w-[240px] uppercase">
                                                <div className="mb-1">Total</div>
                                                <div className="grid grid-cols-8 gap-1 border-t border-slate-600 pt-1 text-white/70">
                                                    <span title="Total Admitted">Adm</span><span title="Total Registered">Reg</span><span title="Total Unregistered">Unr</span><span title="Total Permanent Dropout">PDr</span><span title="Total Temporary Dropout">TDr</span><span title="Total Credit Completed Students">CC</span><span title="Total Defense Registration">Def</span><span title="Total Reg. Pending">Pnd</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedData.map((prog: any) => (
                                            <tr key={prog.pid} className="group hover:bg-blue-50/40 transition-colors text-[10px] h-[28px]">
                                                <td className="px-2 py-1 font-bold text-gray-600 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap w-auto">
                                                    <span className="inline-block w-8 text-right mr-2 text-gray-400 group-hover:text-blue-50 font-mono transition-colors">{prog.pid}</span>
                                                    <span className="text-gray-700 group-hover:text-blue-900 transition-colors" title={prog.name}>{prog.name}</span>
                                                </td>
                                                {sortedAdmittedSemesters.map(sem => {
                                                    const data = prog.data[sem];
                                                    const adm = data?.admitted || 0;
                                                    const unreg = data?.unregistered || 0;
                                                    const pDrop = data?.pDrop || 0;
                                                    const tDrop = data?.tDrop || 0;
                                                    const crCom = data?.crCom || 0;
                                                    const defense = data?.defense || 0;
                                                    const regPending = data?.regPending || 0;
                                                    const reg = adm - unreg;
                                                    return (
                                                        <td key={sem} className="px-1 py-1 border-r border-gray-100 text-center">
                                                            <div className="grid grid-cols-8 gap-1">
                                                                <span className={`${adm > 0 ? 'text-gray-700 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => adm > 0 && handleListClick(sem, prog.pid, prog.name, 'registered')}>{adm}</span>
                                                                <span className={`${reg > 0 ? 'text-green-600 font-bold cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => reg > 0 && handleListClick(sem, prog.pid, prog.name, 'registered')}>{reg}</span>
                                                                <span className={`font-bold ${unreg > 0 ? 'text-red-500 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => unreg > 0 && handleListClick(sem, prog.pid, prog.name, 'unregistered')}>{unreg}</span>
                                                                <span className={`font-black ${pDrop > 0 ? 'text-rose-700 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => pDrop > 0 && handleListClick(sem, prog.pid, prog.name, 'pdrop')}>{pDrop}</span>
                                                                <span className={`font-bold ${tDrop > 0 ? 'text-orange-600 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => tDrop > 0 && handleListClick(sem, prog.pid, prog.name, 'tdrop')}>{tDrop}</span>
                                                                <span className={`font-black ${crCom > 0 ? 'text-emerald-700 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => crCom > 0 && handleListClick(sem, prog.pid, prog.name, 'crcom')}>{crCom}</span>
                                                                <span className={`font-black ${defense > 0 ? 'text-teal-700 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => defense > 0 && handleListClick(sem, prog.pid, prog.name, 'defense')}>{defense}</span>
                                                                <span className={`font-black ${regPending > 0 ? 'text-amber-700 cursor-pointer hover:underline' : 'text-gray-300'}`} onClick={() => regPending > 0 && handleListClick(sem, prog.pid, prog.name, 'regPending')}>{regPending}</span>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-1 py-1 font-bold text-center bg-slate-50 border-l border-gray-200">
                                                    <div className="grid grid-cols-8 gap-1">
                                                        <span className="text-blue-800 cursor-pointer hover:underline" onClick={() => prog.totalAdmitted > 0 && handleListClick('ALL', prog.pid, prog.name, 'registered')}>{prog.totalAdmitted}</span>
                                                        <span className="text-green-700 cursor-pointer hover:underline" onClick={() => prog.totalRegistered > 0 && handleListClick('ALL', prog.pid, prog.name, 'registered')}>{prog.totalRegistered}</span>
                                                        <span className="text-red-700 cursor-pointer hover:underline" onClick={() => prog.totalUnregistered > 0 && handleListClick('ALL', prog.pid, prog.name, 'unregistered')}>{prog.totalUnregistered}</span>
                                                        <span className="text-rose-800 cursor-pointer hover:underline" onClick={() => prog.totalPDrop > 0 && handleListClick('ALL', prog.pid, prog.name, 'pdrop')}>{prog.totalPDrop}</span>
                                                        <span className="text-orange-700 cursor-pointer hover:underline" onClick={() => prog.totalTDrop > 0 && handleListClick('ALL', prog.pid, prog.name, 'tdrop')}>{prog.totalTDrop}</span>
                                                        <span className="text-emerald-900 cursor-pointer hover:underline" onClick={() => prog.totalCrCom > 0 && handleListClick('ALL', prog.pid, prog.name, 'crcom')}>{prog.totalCrCom}</span>
                                                        <span className="text-teal-900 cursor-pointer hover:underline" onClick={() => prog.totalDefense > 0 && handleListClick('ALL', prog.pid, prog.name, 'defense')}>{prog.totalDefense}</span>
                                                        <span className="text-amber-900 cursor-pointer hover:underline" onClick={() => prog.totalRegPending > 0 && handleListClick('ALL', prog.pid, prog.name, 'regPending')}>{prog.totalRegPending}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {paginatedData.length === 0 && (
                                            <tr><td colSpan={sortedAdmittedSemesters.length + 2} className="py-8 text-center text-gray-400 italic text-[11px]">No programs found for analysis.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="px-3 py-1.5 bg-slate-50 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-500 shrink-0 select-none">
                            <div className="flex items-center space-x-2">
                                <span className="font-bold">{currentPage * rowsPerPage - rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, paginationDataInput.length)}</span>
                                <span>of</span>
                                <span className="font-bold">{paginationDataInput.length}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsLeft className="w-3 h-3" /></button>
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
                                <span className="min-w-[20px] text-center font-black">{currentPage}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
                                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsRight className="w-3 h-3" /></button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="md:hidden flex flex-col flex-1 overflow-hidden">
                            <div className="flex overflow-x-auto p-2 space-x-2 bg-white border-b border-gray-200 shrink-0 no-scrollbar">
                                {sortedFaculties.map(fac => (
                                    <button key={fac} onClick={() => setActiveFaculty(fac)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all shadow-sm ${activeFaculty === fac ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{fac}</button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-gray-50">
                                {activeFaculty && renderFacultyCard(activeFaculty, true)}
                                {activeFaculty && (
                                    <div className="bg-white p-2 rounded border border-gray-200 shadow-sm relative h-[300px]">
                                        <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase flex items-center"><BarChart3 className="w-3 h-3 mr-1"/> {activeFaculty} Distribution</h4>
                                        <div className="w-full relative h-[250px]">{renderChart([activeFaculty])}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col flex-1 overflow-y-auto p-2 space-y-4 thin-scrollbar">
                            <div className="flex flex-nowrap overflow-x-auto gap-3 items-start shrink-0">
                                {sortedFaculties.map(fac => renderFacultyCard(fac))}
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200 shadow-sm mt-4 flex-1 min-h-[300px] flex flex-col">
                                <h4 className="text-xs font-bold text-gray-700 mb-2 pl-2 shrink-0">Student Directory Distribution</h4>
                                <div className="w-full relative flex-1 mt-2">{renderChart(sortedFaculties)}</div>
                                <div className="flex justify-center flex-wrap gap-4 mt-2 border-t border-gray-100 pt-2 shrink-0">
                                    {sortedFaculties.map(fac => (<div key={fac} className="flex items-center space-x-1.5"><div className={`w-3 h-3 rounded-sm ${FACULTY_COLORS[fac]}`}></div><span className="text-[10px] font-bold text-gray-600">{fac}</span></div>))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {listModalState?.isOpen && (
                <UnregisteredStudentsModal 
                    isOpen={listModalState.isOpen} 
                    onClose={() => setListModalState(null)} 
                    semester={listModalState.semester} 
                    programName={listModalState.programName} 
                    programId={listModalState.programId} 
                    targetSemester={targetRegSemester} 
                    students={listModalState.students}
                    programMap={programMap}
                    registrationLookup={registrationLookup}
                    listType={listModalState.listType}
                />
            )}
        </div>
    );
};