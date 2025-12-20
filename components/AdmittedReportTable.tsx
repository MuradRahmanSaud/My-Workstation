
import React, { useMemo, useState, useEffect } from 'react';
import { StudentDataRow, ProgramDataRow } from '../types';
import { LayoutGrid, List as ListIcon, Check, Copy, BarChart3 } from 'lucide-react';
import { UnregisteredStudentsModal } from './UnregisteredStudentsModal';

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
    onUnregClick?: (data: { semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string }) => void;
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
    onUnregClick
}) => {
    const [targetRegSemester, setTargetRegSemester] = useState<string>('');
    const [viewType, setViewType] = useState<'detailed' | 'summary'>('detailed');
    const [unregModalState, setUnregModalState] = useState<{ isOpen: boolean; semester: string; programId: string; programName: string; students: StudentDataRow[] } | null>(null);
    const [activeFaculty, setActiveFaculty] = useState<string>('');

    useEffect(() => {
        if (!targetRegSemester && registeredSemesters.length > 0) setTargetRegSemester(registeredSemesters[0]);
    }, [registeredSemesters, targetRegSemester]);

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

        const progStats: Record<string, Record<string, { admitted: number, unregistered: number }>> = {};
        const progTotals: Record<string, { admitted: number, unregistered: number }> = {};
        const progNames = new Set<string>();

        sortedSemesters.forEach((sem: string) => {
            const students = studentCache.get(sem) || [];
            students.forEach((student) => {
                const id = String(student['Student ID']).trim();
                const normalizePid = normalize(student.PID);
                progNames.add(normalizePid);
                const isRegistered = registrationLookup.get(id)?.has(effectiveTarget) || false;
                const isUnregistered = !isRegistered;

                if (!progStats[normalizePid]) progStats[normalizePid] = {};
                if (!progStats[normalizePid][sem]) progStats[normalizePid][sem] = { admitted: 0, unregistered: 0 };
                progStats[normalizePid][sem].admitted++;
                if (isUnregistered) progStats[normalizePid][sem].unregistered++;

                if (!progTotals[normalizePid]) progTotals[normalizePid] = { admitted: 0, unregistered: 0 };
                progTotals[normalizePid].admitted++;
                if (isUnregistered) progTotals[normalizePid].unregistered++;
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
                        totalRegistered: (progTotals[pid]?.admitted || 0) - (progTotals[pid]?.unregistered || 0)
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

    const getUnregisteredStudents = (sem: string, pid: string) => {
        const targetPidNorm = normalize(pid);
        const target = targetRegSemester || registeredSemesters[0];
        if (sem !== 'ALL') {
            const students = studentCache.get(sem) || [];
            return students.filter(s => normalize(s.PID) === targetPidNorm && !registrationLookup.get(String(s['Student ID']).trim())?.has(target));
        }
        const allStudents: StudentDataRow[] = [];
        sortedAdmittedSemesters.forEach(sName => {
            const students = studentCache.get(sName) || [];
            students.forEach(s => {
                if (normalize(s.PID) === targetPidNorm && !registrationLookup.get(String(s['Student ID']).trim())?.has(target)) {
                    allStudents.push(s);
                }
            });
        });
        return allStudents;
    };

    const handleUnregClick = (semester: string, programId: string, programName: string) => {
        const students = getUnregisteredStudents(semester, programId);
        if (onUnregClick) {
            onUnregClick({ semester, programId, programName, students, targetSemester: targetRegSemester });
        } else {
            setUnregModalState({ isOpen: true, semester, programId, programName, students });
        }
    };

    const renderFacultyCard = (fac: string, mobile: boolean = false) => {
        const progs = facultyGroups[fac];
        if(!progs) return null;
        const totalAdm = progs.reduce((acc, p) => acc + p.totalAdmitted, 0);
        const totalReg = progs.reduce((acc, p) => acc + p.totalRegistered, 0);
        const totalUnreg = progs.reduce((acc, p) => acc + p.totalUnregistered, 0);
        const headerColor = FACULTY_COLORS[fac] || 'bg-gray-400';

        return (
            <div className={`bg-white rounded border shadow-sm flex flex-col overflow-hidden ${mobile ? 'w-full h-auto mb-4' : 'min-w-[300px] max-w-[350px] shrink-0'}`}>
                {!mobile && <div className="py-1.5 px-2 text-center border-b font-bold text-xs text-gray-700 bg-gray-50">{fac}</div>}
                <div className={`flex justify-between px-2 py-1 ${headerColor} text-white text-[10px] font-bold`}>
                    <span className="w-[40%]">Program</span>
                    <span className="w-[20%] text-center">Enroll</span>
                    <span className="w-[20%] text-center">Reg</span>
                    <span className="w-[20%] text-right">Unreg</span>
                </div>
                <div className={`divide-y divide-gray-100 overflow-y-auto thin-scrollbar ${mobile ? 'max-h-[400px]' : 'max-h-[300px]'}`}>
                    {progs.map((p: any) => (
                        <div key={p.pid} className="flex justify-between px-2 py-1 text-[11px] hover:bg-gray-50 items-center">
                            <span className="w-[40%] text-gray-700 truncate font-medium" title={`${p.pid} ${p.name}`}><span className="font-mono font-bold mr-1 text-gray-500">{p.pid}</span>{p.name}</span>
                            <span className="w-[20%] text-center font-bold text-gray-900">{p.totalAdmitted}</span>
                            <span className="w-[20%] text-center text-green-600">{p.totalRegistered}</span>
                            <span className="w-[20%] text-right text-red-500 font-bold cursor-pointer" onClick={() => p.totalUnregistered > 0 && handleUnregClick('ALL', p.pid, p.name)}>{p.totalUnregistered}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 flex justify-between text-[11px] font-bold text-gray-800">
                    <span className="w-[40%]">Total</span>
                    <span className="w-[20%] text-center">{totalAdm}</span>
                    <span className="w-[20%] text-center text-green-700">{totalReg}</span>
                    <span className="w-[20%] text-right text-red-600">{totalUnreg}</span>
                </div>
            </div>
        );
    };

    const renderChart = (facultiesToShow: string[]) => {
        const chartData: any[] = [];
        facultiesToShow.forEach(fac => {
            const progs = facultyGroups[fac];
            if (progs) chartData.push(...progs);
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

    const isTransposed = allPrograms.length === 1;

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md border border-gray-200 relative overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0 gap-3 overflow-hidden">
                <div className="text-xs font-bold text-gray-700 flex items-center shrink-0 uppercase tracking-tight">
                    {isTransposed ? `${allPrograms[0].pid} Semester Analysis` : 'Directory Report'}
                </div>
                <div className="flex items-center space-x-3 overflow-hidden justify-end flex-1">
                    {!isTransposed && (
                        <div className="hidden md:flex items-center space-x-1 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1 whitespace-nowrap">Faculty:</span>
                            <button onClick={() => setSelectedFaculties(new Set())} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.size === 0 ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>All</button>
                            {uniqueFaculties.map(fac => (
                                <button key={fac} onClick={() => { const newSet = new Set(selectedFaculties); if (newSet.has(fac)) newSet.delete(fac); else newSet.add(fac); setSelectedFaculties(newSet); }} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all whitespace-nowrap ${selectedFaculties.has(fac) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}>{fac}</button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap hidden md:inline tracking-widest">Compare:</span>
                        <select value={targetRegSemester} onChange={(e) => setTargetRegSemester(e.target.value)} className="text-[10px] border-gray-300 rounded shadow-sm focus:border-blue-500 py-1 pl-2 pr-6 bg-white cursor-pointer font-bold">{registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-white">
                {viewType === 'detailed' ? (
                    <div className="h-full overflow-auto thin-scrollbar">
                        {isTransposed ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-200 w-48 uppercase tracking-widest">Semester</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-200 text-center uppercase tracking-widest">Enrollment</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-200 text-center uppercase tracking-widest">Registered</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">Unregistered</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sortedAdmittedSemesters.map(sem => {
                                        const prog = allPrograms[0];
                                        const data = prog.data[sem];
                                        const adm = data?.admitted || 0;
                                        const unreg = data?.unregistered || 0;
                                        const reg = adm - unreg;
                                        return (
                                            <tr key={sem} className="group hover:bg-slate-50/60 transition-colors h-[28px] text-[11px]">
                                                <td className="px-4 py-1 font-bold text-slate-600 border-r border-slate-100 group-hover:text-blue-600">{sem}</td>
                                                <td className="px-4 py-1 text-center font-medium text-slate-700 border-r border-slate-100">{adm > 0 ? adm : <span className="text-gray-300">-</span>}</td>
                                                <td className="px-4 py-1 text-center font-bold text-green-600 border-r border-slate-100">{reg > 0 ? reg : <span className="text-gray-300">-</span>}</td>
                                                <td className="px-4 py-1 text-center font-bold text-red-500">
                                                    {unreg > 0 ? (
                                                        <span className="cursor-pointer hover:underline decoration-red-400 underline-offset-2" onClick={() => handleUnregClick(sem, prog.pid, prog.name)}>{unreg}</span>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-50 border-t border-slate-200 font-bold h-[28px] text-[11px]">
                                        <td className="px-4 py-1 text-[10px] uppercase text-slate-400 tracking-widest">Grand Total</td>
                                        <td className="px-4 py-1 text-center text-slate-900 border-r border-slate-200">{allPrograms[0].totalAdmitted}</td>
                                        <td className="px-4 py-1 text-center text-green-700 border-r border-slate-200">{allPrograms[0].totalAdmitted - allPrograms[0].totalUnregistered}</td>
                                        <td className="px-4 py-1 text-center text-red-600">{allPrograms[0].totalUnregistered}</td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left border-collapse bg-white">
                                <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="px-2 py-1.5 text-[10px] font-bold text-slate-500 border-r border-slate-200 sticky left-0 z-30 bg-slate-50 min-w-[150px] w-auto whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase tracking-wider">Program</th>
                                        {sortedAdmittedSemesters.map(sem => (
                                            <th key={sem} className="px-1 py-1 text-[9px] font-bold text-slate-500 border-r border-slate-200 text-center min-w-[110px]">
                                                <div className="flex items-center justify-center space-x-1 mb-1"><span className="text-slate-700">{sem}</span></div>
                                                <div className="grid grid-cols-3 gap-1 border-t border-slate-200 pt-1 uppercase"><span className="text-blue-700">Enroll</span><span className="text-green-700">Reg</span><span className="text-red-700">Unreg</span></div>
                                            </th>
                                        ))}
                                        <th className="px-1 py-1 text-[9px] font-bold text-slate-500 border-b border-slate-200 text-center min-w-[110px] uppercase">
                                            <div className="mb-1 text-slate-700">Total</div>
                                            <div className="grid grid-cols-3 gap-1 border-t border-slate-200 pt-1"><span className="text-blue-700">Enroll</span><span className="text-green-700">Reg</span><span className="text-red-700">Unreg</span></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allPrograms.map((prog: any) => (
                                        <tr key={prog.pid} className="group hover:bg-slate-50/60 transition-colors text-[10px] h-[28px]">
                                            <td className="px-2 py-1 font-bold text-gray-600 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-slate-100 group-hover:text-blue-900 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap w-auto">
                                                <span className="inline-block w-8 text-right mr-2 text-gray-400 group-hover:text-blue-500 font-mono transition-colors">{prog.pid}</span>
                                                <span className="text-gray-700 group-hover:text-blue-900 transition-colors" title={prog.name}>{prog.name}</span>
                                            </td>
                                            {sortedAdmittedSemesters.map(sem => {
                                                const data = prog.data[sem]; const adm = data?.admitted || 0; const unreg = data?.unregistered || 0; const reg = adm - unreg;
                                                return (
                                                    <td key={sem} className="px-1 py-1 border-r border-gray-100 text-center">
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <span className={`${adm > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{adm}</span>
                                                            <span className={`${reg > 0 ? 'text-green-600 font-bold' : 'text-gray-300'}`}>{reg}</span>
                                                            <span className={`font-bold ${unreg > 0 ? 'text-red-500 cursor-pointer hover:underline decoration-red-500 decoration-dotted underline-offset-2' : 'text-gray-300'}`} onClick={() => unreg > 0 && handleUnregClick(sem, prog.pid, prog.name)}>{unreg}</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-1 py-1 font-bold text-center bg-slate-50 border-l border-gray-200">
                                                <div className="grid grid-cols-3 gap-1"><span className="text-blue-800">{prog.totalAdmitted}</span><span className="text-green-700">{prog.totalAdmitted - prog.totalUnregistered}</span><span className="text-red-700 cursor-pointer" onClick={() => prog.totalUnregistered > 0 && handleUnregClick('ALL', prog.pid, prog.name)}>{prog.totalUnregistered}</span></div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
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
            {unregModalState?.isOpen && (
                <UnregisteredStudentsModal 
                    isOpen={unregModalState.isOpen} 
                    onClose={() => setUnregModalState(null)} 
                    semester={unregModalState.semester} 
                    programName={unregModalState.programName} 
                    programId={unregModalState.programId} 
                    targetSemester={targetRegSemester} 
                    students={unregModalState.students}
                    programMap={programMap}
                    registrationLookup={registrationLookup}
                />
            )}
        </div>
    );
};
