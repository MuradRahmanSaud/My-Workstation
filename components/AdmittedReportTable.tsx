
import React, { useState, useEffect, useMemo } from 'react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow } from '../types';
import { LayoutGrid, List as ListIcon, Check, Copy, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, UserCheck, UserX, UserMinus, PowerOff, Clock, Calculator, ShieldCheck, GraduationCap, Target, AlertCircle, MessageSquare, Download, Users, X, RotateCcw, User as UserIcon, Search, FilterX, TrendingUp, Banknote, FileBarChart, Table, CalendarDays } from 'lucide-react';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { isValEmpty } from '../views/EmployeeView';
import { normalizeId, normalizeSemesterString } from '../services/sheetService';

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
    onUnregClick?: (data: { semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string; listType: 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' | 'dues' | 'followup' | 'followupTarget' }) => void;
    externalTargetRegSemester?: string;
    onTargetRegSemesterChange?: (val: string) => void;
    diuEmployeeData?: DiuEmployeeRow[];
    teacherData?: TeacherDataRow[];
    onSaveStudent?: (semester: string, student: StudentDataRow) => Promise<void>;
    hideSummaryToggle?: boolean;
    hideSidebar?: boolean;
}

const FACULTY_COLORS: Record<string, string> = {
    'FBE': 'bg-red-500',
    'FE': 'bg-yellow-500',
    'FHLS': 'bg-green-500',
    'FHSS': 'bg-blue-500',
    'FSIT': 'bg-orange-500',
    'Other': 'bg-gray-400'
};

const FIELD_SEP = ' ;; ';
const RECORD_SEP = ' || ';

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
    hideSummaryToggle = false,
    hideSidebar = false
}) => {
    const [localTargetRegSemester, setLocalTargetRegSemester] = useState<string>('');
    const targetRegSemester = externalTargetRegSemester !== undefined ? externalTargetRegSemester : localTargetRegSemester;
    const setTargetRegSemester = onTargetRegSemesterChange || setLocalTargetRegSemester;

    const [activeTab, setActiveTab] = useState<string>('analysis');

    useEffect(() => {
        if (!targetRegSemester && registeredSemesters.length > 0) setTargetRegSemester(registeredSemesters[0]);
    }, [registeredSemesters, targetRegSemester, setTargetRegSemester]);

    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Airtight registration check logic
    const checkIsRegistered = (studentId: string, targetSem: string) => {
        const id = normalizeId(studentId);
        const registeredFor = registrationLookup.get(id);
        if (!registeredFor || registeredFor.size === 0) return false;
        
        const normalizedTarget = normalizeSemesterString(targetSem);
        return registeredFor.has(normalizedTarget);
    };

    const programDetailsMap = useMemo(() => {
        const map = new Map<string, ProgramDataRow>();
        programData.forEach(p => { if(p.PID) map.set(normalize(p.PID), p); });
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

    const { sortedAdmittedSemesters, allPrograms } = useMemo(() => {
        const effectiveTarget = targetRegSemester || (registeredSemesters.length > 0 ? registeredSemesters[0] : '');
        if (!effectiveTarget) return { sortedAdmittedSemesters: [], allPrograms: [] };

        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSemester = (sem: string) => {
             const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
             if (!match) return { year: 0, season: -1, original: sem };
             let year = parseInt(match[2], 10); if (year < 100) year += 2000;
             const season = seasonWeight[match[1].toLowerCase()] ?? -1;
             return { year, season, original: sem };
        };
        
        let sortedSems = Array.from(selectedAdmittedSemesters)
            .map(parseSemester)
            .sort((a, b) => a.year !== b.year ? b.year - a.year : b.season - a.season)
            .map(s => s.original);

        const progStats: Record<string, Record<string, any>> = {};
        const progNames = new Set<string>();

        sortedSems.forEach((admissionSem: string) => {
            const students = studentCache.get(admissionSem) || [];
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

                // Use the Airtight logic to check if this student from admissionSem is in Registered DB for effectiveTarget
                const isRegistered = checkIsRegistered(id, effectiveTarget);
                
                const dropClass = student['Dropout Classification'] || '';
                const isPDrop = dropClass.includes('Permanent');
                const isTDrop = dropClass.includes('Temporary');
                const credReqValue = parseFloat(student['Credit Requirement'] || '0');
                const credComValue = parseFloat(student['Credit Completed'] || '0');
                const isCrCom = !isNaN(credReqValue) && !isNaN(credComValue) && credReqValue > 0 && (credComValue >= credReqValue);

                if (!progStats[normalizePid]) progStats[normalizePid] = {};
                if (!progStats[normalizePid][admissionSem]) {
                    progStats[normalizePid][admissionSem] = { admitted: 0, registered: 0, unregistered: 0, pdrop: 0, tdrop: 0, crCom: 0, defense: 0, regPending: 0, dues: 0 };
                }
                
                const stats = progStats[normalizePid][admissionSem];
                stats.admitted++;
                
                if (isRegistered) {
                    stats.registered++;
                } else {
                    stats.unregistered++;
                    if (!isPDrop && !isCrCom) stats.regPending++;
                }

                if (isPDrop) stats.pdrop++;
                if (isTDrop) stats.tdrop++;
                if (isCrCom) stats.crCom++;
                if (!isValEmpty(student['Defense Registration'])) stats.defense++;
                if (checkDuesForSemester(student.Dues, effectiveTarget)) stats.dues++;
            });
        });

        const allProgs = Array.from(progNames).sort().map((pid: string) => {
            const semesterData = progStats[pid] || {};
            return {
                pid: pid.toUpperCase(),
                name: programMap.get(pid) || pid,
                data: semesterData
            };
        });

        return { sortedAdmittedSemesters: sortedSems, allPrograms: allProgs };
    }, [selectedAdmittedSemesters, studentCache, targetRegSemester, registeredSemesters, registrationLookup, programMap, programDetailsMap, selectedPrograms, selectedFaculties, selectedProgramTypes, selectedSemesterTypes]);

    const paginationDataInput = useMemo(() => {
        if (hideSidebar) {
            return sortedAdmittedSemesters.map(sem => {
                const stats = { admitted: 0, registered: 0, unregistered: 0, pdrop: 0, tdrop: 0, crCom: 0, defense: 0, regPending: 0, dues: 0 };
                allPrograms.forEach(prog => {
                    const d = prog.data[sem];
                    if (d) {
                        stats.admitted += d.admitted || 0;
                        stats.registered += d.registered || 0;
                        stats.unregistered += d.unregistered || 0;
                        stats.pdrop += d.pdrop || 0;
                        stats.tdrop += d.tdrop || 0;
                        stats.crCom += d.crCom || 0;
                        stats.defense += d.defense || 0;
                        stats.regPending += d.regPending || 0;
                        stats.dues += d.dues || 0;
                    }
                });
                return { semester: sem, ...stats };
            });
        }
        return allPrograms;
    }, [hideSidebar, sortedAdmittedSemesters, allPrograms]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(paginationDataInput);

    const handleListClick = (semester: string, programId: string, programName: string, listType: any) => {
        const getStudents = () => {
            const targetPidNorm = normalize(programId);
            const target = targetRegSemester || (registeredSemesters.length > 0 ? registeredSemesters[0] : '');
            const filterFn = (s: StudentDataRow) => {
                if (semester !== 'ALL' && programId !== 'ALL' && normalize(s.PID) !== targetPidNorm) return false;
                const id = String(s['Student ID']).trim();
                const isRegistered = checkIsRegistered(id, target);

                if (listType === 'all') return true; 
                if (listType === 'registered') return isRegistered;
                if (listType === 'regPending') return !isRegistered;
                if (listType === 'unregistered') return !isRegistered;
                if (listType === 'pdrop') return (s['Dropout Classification'] || '').includes('Permanent');
                if (listType === 'tdrop') return (s['Dropout Classification'] || '').includes('Temporary');
                if (listType === 'crcom') {
                    const req = parseFloat(s['Credit Requirement'] || '0');
                    const com = parseFloat(s['Credit Completed'] || '0');
                    return !isNaN(req) && !isNaN(com) && req > 0 && (com >= req);
                }
                if (listType === 'dues') return checkDuesForSemester(s.Dues, target);
                return false;
            };
            const results: StudentDataRow[] = [];
            (semester !== 'ALL' ? [semester] : sortedAdmittedSemesters).forEach(sName => {
                (studentCache.get(sName) || []).forEach(s => {
                    if (filterFn(s)) results.push({ ...s, _semester: sName });
                });
            });
            return results;
        };
        onUnregClick?.({ semester, programId, programName, students: getStudents(), targetSemester: targetRegSemester, listType });
    };

    const targetProgramId = useMemo(() => {
        return selectedPrograms.size > 0 ? Array.from(selectedPrograms)[0] : 'ALL';
    }, [selectedPrograms]);

    const targetProgramName = useMemo(() => {
        return programMap.get(targetProgramId) || targetProgramId;
    }, [targetProgramId, programMap]);

    const renderChart = (semPrograms: any[]) => {
        if (semPrograms.length === 0) return <div className="py-20 text-center text-gray-300 uppercase text-[10px] font-black tracking-widest">No Data for Chart</div>;
        
        const fixedColumnHeight = 75; 

        return (
            <div className="absolute inset-0 flex items-end justify-between space-x-1 px-4 pb-4 pt-16 overflow-x-auto no-scrollbar">
                {semPrograms.map((p, idx) => {
                    const regPercentage = p.totalAdmitted > 0 ? (p.totalRegistered / p.totalAdmitted) * 100 : 0;
                    const diffPercentage = Math.round(regPercentage - 100);

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full min-w-[25px]">
                            {/* Deficit Percentage Label on Top */}
                            <div className={`absolute text-[9px] font-black tracking-tighter mb-0.5 select-none transition-all group-hover:scale-110 ${diffPercentage === 0 ? 'text-emerald-600' : 'text-rose-600'}`} style={{ bottom: `${fixedColumnHeight}%` }}>
                                {diffPercentage}%
                            </div>

                            {/* Refined Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full bg-slate-900 text-white text-[9px] font-black px-3 py-2 rounded shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 flex flex-col items-center mb-1 translate-y-0 border border-white/10 ring-4 ring-black/5">
                                <span className="text-blue-400 font-black mb-1.5 uppercase tracking-wider">{p.name} ({p.pid})</span>
                                <div className="flex items-center space-x-2 text-[10px] font-bold">
                                    <span className="text-blue-200">Enr: {p.totalAdmitted}</span>
                                    <span className="text-white/30 font-light">|</span>
                                    <span className="text-emerald-400">Reg: {p.totalRegistered}</span>
                                    <span className="text-white/30 font-light">|</span>
                                    <span className="text-rose-400">Unr: {p.totalUnregistered}</span>
                                </div>
                                <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1"></div>
                            </div>

                            {/* Progress Stacked Bar */}
                            <div className="w-full relative flex flex-col justify-end overflow-hidden rounded-t shadow-sm border border-slate-200" style={{ height: `${fixedColumnHeight}%`, minHeight: '4px' }}>
                                <div className="absolute inset-0 bg-blue-100/50"></div>
                                <div 
                                    className={`relative w-full transition-all duration-700 ease-out bg-emerald-500 border-t border-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`} 
                                    style={{ height: `${Math.min(regPercentage, 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 mt-1 truncate w-full text-center uppercase tracking-tighter" title={p.pid}>{p.pid}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderRegistrationReport = (enrollSemester: string) => {
        const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
        const semPrograms = allPrograms.map(p => {
            const semData = p.data[enrollSemester] || { admitted: 0, registered: 0, unregistered: 0 };
            const pInfo = programDetailsMap.get(p.pid.toLowerCase());
            return {
                ...p,
                totalAdmitted: semData.admitted,
                totalRegistered: semData.registered,
                totalUnregistered: semData.unregistered,
                faculty: pInfo ? (pInfo['Faculty Short Name'] || 'Other') : 'Other'
            };
        }).filter(p => p.totalAdmitted > 0 && p.faculty !== 'Other')
        .sort((a, b) => {
            const orderA = facultyOrder.indexOf(a.faculty);
            const orderB = facultyOrder.indexOf(b.faculty);
            if (orderA !== orderB) return orderA - orderB;
            return a.pid.localeCompare(b.pid);
        });

        const semFacultyGroups: Record<string, any[]> = {};
        semPrograms.forEach(prog => {
            const faculty = prog.faculty;
            if (!semFacultyGroups[faculty]) semFacultyGroups[faculty] = [];
            semFacultyGroups[faculty].push(prog);
        });

        const activeFacs = facultyOrder.filter(f => semFacultyGroups[f] && semFacultyGroups[f].length > 0);

        return (
            <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 h-[48px]">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center">
                        <FileBarChart className="w-4 h-4 mr-2 text-rose-600" />
                        Enrollment Analytics: {enrollSemester}
                    </h3>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-tighter">
                        Checked Vs: {targetRegSemester}
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
                    <div className="flex flex-wrap md:flex-nowrap gap-2 items-start w-full shrink-0">
                        {activeFacs.map(fac => {
                            const progs = semFacultyGroups[fac];
                            const headerColor = FACULTY_COLORS[fac] || 'bg-gray-400';
                            const subtotalAdmitted = progs.reduce((acc, p) => acc + p.totalAdmitted, 0);
                            const subtotalRegistered = progs.reduce((acc, p) => acc + p.totalRegistered, 0);
                            const subtotalUnregistered = progs.reduce((acc, p) => acc + p.totalUnregistered, 0);
                            return (
                                <div key={fac} className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 min-w-[180px] overflow-hidden">
                                    <div className="px-3 py-1 border-b font-black text-[9px] text-gray-700 bg-gray-50 text-center uppercase tracking-widest truncate">{fac}</div>
                                    <div className={`flex justify-between px-2 py-1 ${headerColor} text-white text-[8px] font-bold uppercase tracking-tight`}><span className="w-[45%]">Program</span><span className="w-[18%] text-center">Adm</span><span className="w-[18%] text-center">Reg</span><span className="w-[19%] text-right">Unr</span></div>
                                    <div className="divide-y divide-gray-50">
                                        {progs.map(p => (
                                            <div key={p.pid} className="flex justify-between px-2 py-0.5 text-[10px] hover:bg-slate-50 items-center">
                                                <span className="w-[45%] text-gray-700 truncate font-medium" title={p.name}>{p.name}</span>
                                                <span className="w-[18%] text-center font-black text-slate-800 cursor-pointer hover:text-blue-600" onClick={() => handleListClick(enrollSemester, p.pid, p.name, 'all')}>{p.totalAdmitted}</span>
                                                <span className="w-[18%] text-center font-black text-green-600 cursor-pointer hover:underline" onClick={() => handleListClick(enrollSemester, p.pid, p.name, 'registered')}>{p.totalRegistered}</span>
                                                <span className="w-[19%] text-right font-black text-red-600 cursor-pointer hover:underline" onClick={() => handleListClick(enrollSemester, p.pid, p.name, 'unregistered')}>{p.totalUnregistered}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-slate-100 border-t border-gray-200 px-2 py-1 flex justify-between text-[10px] font-black text-gray-800 uppercase mt-auto">
                                        <span className="w-[45%]">Total</span>
                                        <span className="w-[18%] text-center text-blue-700">{subtotalAdmitted}</span>
                                        <span className="w-[18%] text-center text-green-700">{subtotalRegistered}</span>
                                        <span className="w-[19%] text-right text-red-700">{subtotalUnregistered}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm p-3 relative flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-2 border-b border-gray-50 pb-1.5 shrink-0">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <TrendingUp className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                Growth Analysis: Adm vs Reg
                            </h4>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Target</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-600"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Registered</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            {renderChart(semPrograms)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-white rounded shadow-sm overflow-hidden font-sans border border-gray-200">
            {!hideSidebar && (
                <div className="w-[180px] bg-slate-50 border-r border-gray-200 flex flex-col shrink-0">
                    <div className="p-3 border-b border-gray-200 bg-white shrink-0"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reports Console</h3></div>
                    <div className="flex-1 overflow-y-auto thin-scrollbar p-1.5 space-y-1">
                        <button onClick={() => setActiveTab('analysis')} className={`w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-2.5 ${activeTab === 'analysis' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'}`}><Table className="w-3.5 h-3.5" /><span>Full Analysis</span></button>
                        <div className="mx-1.5 p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2 animate-in slide-in-from-top-1 duration-200">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-0.5">Registered Semester</label>
                            <div className="relative">
                                <select value={targetRegSemester} onChange={(e) => setTargetRegSemester(e.target.value)} className="w-full text-[10px] font-black border-none rounded-lg bg-slate-50 focus:ring-1 focus:ring-blue-500 py-1.5 pl-2 pr-6 cursor-pointer appearance-none text-blue-700 uppercase">{registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="my-3 h-px bg-slate-200 mx-2"></div>
                        <div className="px-3 pb-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">By Enrollment</div>
                        {sortedAdmittedSemesters.map(sem => (
                            <button key={sem} onClick={() => setActiveTab(sem)} className={`w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-2.5 ${activeTab === sem ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'}`}><CalendarDays className="w-3.5 h-3.5 opacity-60" /><span className="truncate">{sem}</span></button>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {activeTab === 'analysis' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-200 bg-slate-50 flex items-center justify-between shrink-0 h-[46px]">
                            <div className="text-[11px] font-black text-gray-800 flex items-center uppercase tracking-widest">
                                <LayoutGrid className="w-4 h-4 mr-2 text-blue-600" />
                                Detailed Program Analytics
                            </div>
                            {hideSidebar && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Registered Sem:</span>
                                    <div className="relative">
                                        <select 
                                            value={targetRegSemester} 
                                            onChange={(e) => setTargetRegSemester(e.target.value)} 
                                            className="text-[10px] font-black border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 py-1.5 pl-2 pr-6 cursor-pointer appearance-none text-blue-700 uppercase shadow-sm"
                                        >
                                            {registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 sticky top-0 z-30 shadow-md border-b border-slate-700">
                                    {hideSidebar ? (
                                        <tr><th className="px-3 py-2.5 text-[10px] font-black text-white sticky left-0 z-40 bg-slate-800 min-w-[120px] uppercase tracking-widest border-r border-slate-700">Semester</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">Adm</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">Reg</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">Unr</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">PDr</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">TDr</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">CC</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">Def</th><th className="px-2 py-2.5 text-[10px] font-black text-white text-center uppercase tracking-widest">Due</th></tr>
                                    ) : (
                                        <tr><th className="px-3 py-2.5 text-[10px] font-black text-white sticky left-0 z-40 bg-slate-800 min-w-[160px] w-auto whitespace-nowrap uppercase tracking-widest border-r border-slate-700">Program</th>{sortedAdmittedSemesters.map(sem => (<th key={sem} className="px-2 py-2 text-[9px] font-black text-white text-center min-w-[280px] border-r border-slate-700"><div className="mb-1.5 text-blue-300">{sem}</div><div className="grid grid-cols-8 gap-1 border-t border-slate-700 pt-1.5 uppercase text-[8px] tracking-tighter text-white/50"><span>Adm</span><span>Reg</span><span>Unr</span><span>PDr</span><span>TDr</span><span>CC</span><span>Def</span><span>Due</span></div></th>))}<th className="px-3 py-2.5 text-[10px] font-black text-white text-center min-w-[300px] uppercase tracking-widest bg-slate-900 sticky right-0 z-40"><div className="mb-1.5 text-amber-400">Cumulative Summary</div><div className="grid grid-cols-8 gap-1 border-t border-slate-700 pt-1.5 text-[8px] tracking-tighter text-white/50"><span>Adm</span><span>Reg</span><span>Unr</span><span>PDr</span><span>TDr</span><span>CC</span><span>Def</span><span>Due</span></div></th></tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {hideSidebar ? (
                                        paginatedData.map((row: any) => (
                                            <tr key={row.semester} className="text-[11px] h-[34px] hover:bg-slate-50 transition-colors group"><td className="px-3 py-1 font-black text-slate-800 border-r border-gray-100 sticky left-0 bg-white transition-all shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">{row.semester}</td><td className="px-2 py-1 text-center font-bold text-slate-900 cursor-pointer hover:text-blue-600" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'all')}>{row.admitted}</td><td className="px-2 py-1 text-center font-bold text-green-600 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'registered')}>{row.registered}</td><td className="px-2 py-1 text-center font-bold text-red-600 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'unregistered')}>{row.unregistered}</td><td className="px-2 py-1 text-center font-bold text-rose-700 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'pdrop')}>{row.pdrop}</td><td className="px-2 py-1 text-center font-bold text-orange-600 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'tdrop')}>{row.tdrop}</td><td className="px-2 py-1 text-center font-bold text-emerald-700 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'crcom')}>{row.crCom}</td><td className="px-2 py-1 text-center font-bold text-teal-700 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'defense')}>{row.defense}</td><td className="px-2 py-1 text-center font-bold text-amber-900 cursor-pointer hover:underline" onClick={() => handleListClick(row.semester, targetProgramId, targetProgramName, 'dues')}>{row.dues}</td></tr>
                                        ))
                                    ) : (
                                        paginatedData.map((prog: any) => {
                                            const cumulative = sortedAdmittedSemesters.reduce((acc, sem) => {
                                                const d = prog.data[sem];
                                                if (d) { acc.adm += d.admitted || 0; acc.reg += d.registered || 0; acc.unreg += d.unregistered || 0; acc.pdrop += d.pdrop || 0; acc.tdrop += d.tdrop || 0; acc.crCom += d.crCom || 0; acc.defense += d.defense || 0; acc.regPending += d.regPending || 0; acc.dues += d.dues || 0; }
                                                return acc;
                                            }, { adm: 0, reg: 0, unreg: 0, pdrop: 0, tdrop: 0, crCom: 0, defense: 0, regPending: 0, dues: 0 });
                                            return (
                                                <tr key={prog.pid} className="text-[11px] h-[34px] hover:bg-slate-50 transition-colors group"><td className="px-3 py-1 font-black text-slate-800 border-r border-gray-100 sticky left-0 bg-white transition-all shadow-[2px_0_10px_-4px_rgba(0,0,0,0.1)] whitespace-nowrap w-auto group-hover:bg-slate-50"><span className="inline-block w-8 text-right mr-2 text-slate-400 font-mono tracking-tighter">{prog.pid}</span><span className="truncate max-w-[150px] inline-block align-middle" title={prog.name}>{prog.name}</span></td>{sortedAdmittedSemesters.map(sem => { const data = prog.data[sem]; const adm = data?.admitted || 0, reg = data?.registered || 0, unreg = data?.unregistered || 0, pdropValue = data?.pdrop || 0, tdropValue = data?.tdrop || 0, crComValue = data?.crCom || 0, defenseValue = data?.defense || 0, regPendingValue = data?.regPending || 0, duesValue = data?.dues || 0; return (<td key={sem} className="px-2 py-1 border-r border-gray-50 text-center font-medium"><div className="grid grid-cols-8 gap-1.5 tabular-nums"><span className={`${adm > 0 ? 'text-slate-900 cursor-pointer hover:text-blue-600 transition-all' : 'text-slate-200'}`} onClick={() => adm > 0 && handleListClick(sem, prog.pid, prog.name, 'all')}>{adm}</span><span className={`${reg > 0 ? 'text-green-600 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => reg > 0 && handleListClick(sem, prog.pid, prog.name, 'registered')}>{reg}</span><span className={`${regPendingValue > 0 ? 'text-amber-700 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => regPendingValue > 0 && handleListClick(sem, prog.pid, prog.name, 'regPending')}>{regPendingValue}</span><span className={`${pdropValue > 0 ? 'text-rose-700 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => pdropValue > 0 && handleListClick(sem, prog.pid, prog.name, 'pdrop')}>{pdropValue}</span><span className={`${tdropValue > 0 ? 'text-orange-600 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => tdropValue > 0 && handleListClick(sem, prog.pid, prog.name, 'tdrop')}>{tdropValue}</span><span className={`${crComValue > 0 ? 'text-emerald-700 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => crComValue > 0 && handleListClick(sem, prog.pid, prog.name, 'crcom')}>{crComValue}</span><span className={`${defenseValue > 0 ? 'text-teal-700 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => defenseValue > 0 && handleListClick(sem, prog.pid, prog.name, 'defense')}>{defenseValue}</span><span className={`${duesValue > 0 ? 'text-amber-900 font-black cursor-pointer hover:underline' : 'text-slate-200'}`} onClick={() => duesValue > 0 && handleListClick(sem, prog.pid, prog.name, 'dues')}>{duesValue}</span></div></td>); })}<td className="px-3 py-1 font-black text-center bg-slate-100 border-l border-slate-200 sticky right-0 z-10 shadow-[-2px_0_10px_-4px_rgba(0,0,0,0.1)]"><div className="grid grid-cols-8 gap-1.5 tabular-nums text-[10px]"><span className="text-slate-900">{cumulative.adm}</span><span className="text-green-700 font-black">{cumulative.reg}</span><span className="text-amber-700 font-black">{cumulative.regPending}</span><span className="text-rose-700 font-black">{cumulative.pdrop}</span><span className="text-orange-600 font-black">{cumulative.tdrop}</span><span className="text-emerald-700 font-black">{cumulative.crCom}</span><span className="text-teal-700 font-black">{cumulative.defense}</span><span className="text-amber-900 font-black">{cumulative.dues}</span></div></td></tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2 bg-white border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-black uppercase shrink-0 h-[42px] select-none"><div className="flex items-center space-x-2"><span>Showing {currentPage * rowsPerPage - rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, paginationDataInput.length)}</span><span className="text-slate-300">|</span><span>Total {paginationDataInput.length} {hideSidebar ? 'Semesters' : 'Programs'}</span></div><div className="flex items-center space-x-2"><button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all"><ChevronsLeft className="w-3.5 h-3.5" /></button><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button><span className="px-4 py-1 bg-blue-600 text-white rounded-lg shadow-md font-black">{currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button><button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all"><ChevronsRight className="w-3.5 h-3.5" /></button></div></div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">{renderRegistrationReport(activeTab)}</div>
                )}
            </div>
        </div>
    );
};
