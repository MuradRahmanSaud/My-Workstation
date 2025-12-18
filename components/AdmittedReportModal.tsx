
import React, { useMemo, useState, useEffect } from 'react';
import { X, BarChart3, AlertCircle } from 'lucide-react';
import { StudentDataRow } from '../types';

interface AdmittedReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedAdmittedSemesters: Set<string>;
    studentCache: Map<string, StudentDataRow[]>;
    registrationLookup: Map<string, Set<string>>;
    registeredSemesters: string[];
    programMap: Map<string, string>;
}

export const AdmittedReportModal: React.FC<AdmittedReportModalProps> = ({
    isOpen,
    onClose,
    selectedAdmittedSemesters,
    studentCache,
    registrationLookup,
    registeredSemesters,
    programMap
}) => {
    const [targetRegSemester, setTargetRegSemester] = useState<string>('');

    // Update target semester when options load
    useEffect(() => {
        if (!targetRegSemester && registeredSemesters.length > 0) {
            setTargetRegSemester(registeredSemesters[0]);
        }
    }, [registeredSemesters, targetRegSemester]);

    // Aggregate Data
    const { semesterStats, programStats, sortedAdmittedSemesters, allPrograms } = useMemo(() => {
        // If no target semester is selected (and we have options), default to the first one for calculation
        // This handles the split second before state updates or if state is empty
        const effectiveTarget = targetRegSemester || registeredSemesters[0];
        
        if (!effectiveTarget) return { semesterStats: [], programStats: [], sortedAdmittedSemesters: [], allPrograms: [] };

        const semStats: Record<string, { admitted: number, unregistered: number }> = {};
        const progStats: Record<string, Record<string, { admitted: number, unregistered: number }>> = {};
        const progTotals: Record<string, { admitted: number, unregistered: number }> = {};
        const progNames = new Set<string>();

        const sortedSemesters: string[] = Array.from<string>(selectedAdmittedSemesters).sort();

        sortedSemesters.forEach((sem: string) => {
            const students: StudentDataRow[] = studentCache.get(sem) || [];
            semStats[sem] = { admitted: 0, unregistered: 0 };

            students.forEach((student: StudentDataRow) => {
                const id = String(student['Student ID']).trim();
                const pid = String(student.PID).trim();
                const normalizePid = pid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                
                // Track Program Name
                progNames.add(normalizePid);

                // Check Registration
                const studentRegSemesters = registrationLookup.get(id);
                const isRegistered = studentRegSemesters ? studentRegSemesters.has(effectiveTarget) : false;
                const isUnregistered = !isRegistered;

                // Update Semester Stats
                semStats[sem].admitted++;
                if (isUnregistered) semStats[sem].unregistered++;

                // Update Program Stats
                if (!progStats[normalizePid]) progStats[normalizePid] = {};
                if (!progStats[normalizePid][sem]) progStats[normalizePid][sem] = { admitted: 0, unregistered: 0 };
                
                progStats[normalizePid][sem].admitted++;
                if (isUnregistered) progStats[normalizePid][sem].unregistered++;

                // Update Program Totals for Sorting/Charting
                if (!progTotals[normalizePid]) progTotals[normalizePid] = { admitted: 0, unregistered: 0 };
                progTotals[normalizePid].admitted++;
                if (isUnregistered) progTotals[normalizePid].unregistered++;
            });
        });

        // Convert to Arrays for rendering
        const semStatsArray = sortedSemesters.map((sem: string) => ({
            semester: sem,
            ...semStats[sem]
        }));

        const allProgs = Array.from(progNames).sort().map((pid: string) => ({
            pid: pid.toUpperCase(),
            name: programMap.get(pid) || pid.toUpperCase(),
            data: progStats[pid] || {},
            totalAdmitted: progTotals[pid]?.admitted || 0,
            totalUnregistered: progTotals[pid]?.unregistered || 0
        }));

        return {
            semesterStats: semStatsArray,
            programStats: allProgs,
            sortedAdmittedSemesters: sortedSemesters,
            allPrograms: allProgs
        };
    }, [selectedAdmittedSemesters, studentCache, targetRegSemester, registeredSemesters, registrationLookup, programMap]);

    if (!isOpen) return null;

    // Helper for simple bar chart
    const renderBar = (value: number, max: number, colorClass: string) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        return (
            <div className="w-full bg-gray-100 rounded-sm h-1.5 overflow-hidden">
                <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
            </div>
        );
    };

    const maxSemAdmitted = Math.max(...semesterStats.map(s => s.admitted), 1);
    const topUnregPrograms = [...allPrograms].sort((a,b) => b.totalUnregistered - a.totalUnregistered).slice(0, 10);
    const maxProgUnreg = Math.max(...topUnregPrograms.map(p => p.totalUnregistered), 1);

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center uppercase tracking-wide">
                        <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                        Admitted Student Report
                    </h3>
                    <div className="flex items-center space-x-2">
                        <select 
                            value={targetRegSemester}
                            onChange={(e) => setTargetRegSemester(e.target.value)}
                            className="text-[10px] border-gray-300 rounded shadow-sm focus:border-blue-500 py-1 pl-2 pr-6"
                            title="Select Target Registration Semester"
                        >
                            {registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
                    
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Semester Wise Chart */}
                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                            <h4 className="text-[11px] font-bold text-gray-700 mb-3 border-b pb-1">Semester Wise Summary (vs {targetRegSemester || '...'})</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar pr-2">
                                {semesterStats.map(stat => (
                                    <div key={stat.semester} className="flex flex-col space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="font-bold text-gray-700">{stat.semester}</span>
                                            <div className="space-x-2">
                                                <span className="text-blue-600 font-medium">Adm: {stat.admitted}</span>
                                                <span className="text-red-500 font-bold">Unreg: {stat.unregistered}</span>
                                            </div>
                                        </div>
                                        <div className="flex space-x-1 h-2">
                                            <div className="flex-1 bg-blue-100 rounded-sm overflow-hidden relative" title={`Admitted: ${stat.admitted}`}>
                                                <div className="h-full bg-blue-500 absolute top-0 left-0" style={{ width: `${(stat.admitted / maxSemAdmitted) * 100}%` }}></div>
                                            </div>
                                            <div className="flex-1 bg-red-50 rounded-sm overflow-hidden relative" title={`Unregistered: ${stat.unregistered}`}>
                                                <div className="h-full bg-red-500 absolute top-0 left-0" style={{ width: `${(stat.unregistered / stat.admitted) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {semesterStats.length === 0 && (
                                     <div className="text-center text-gray-400 py-4 text-[10px]">No Data</div>
                                )}
                            </div>
                        </div>

                        {/* Top Unregistered Programs Chart */}
                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                            <h4 className="text-[11px] font-bold text-gray-700 mb-3 border-b pb-1">Top Programs by Unregistered Count</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar pr-2">
                                {topUnregPrograms.map(prog => (
                                    <div key={prog.pid} className="flex items-center space-x-2 text-[10px]">
                                        <div className="w-16 truncate font-medium text-gray-600" title={prog.name}>{prog.pid}</div>
                                        <div className="flex-1">
                                            {renderBar(prog.totalUnregistered, maxProgUnreg, 'bg-red-500')}
                                        </div>
                                        <div className="w-8 text-right font-bold text-red-600">{prog.totalUnregistered}</div>
                                    </div>
                                ))}
                                {topUnregPrograms.length === 0 && (
                                    <div className="text-center text-gray-400 py-4 text-[10px]">No Data</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded border border-gray-200 shadow-sm flex flex-col overflow-hidden h-[500px]">
                        <h4 className="text-[11px] font-bold text-gray-700 p-2 border-b bg-gray-50 flex justify-between">
                            <span>Detailed Report</span>
                            <span className="text-gray-400 font-normal normal-case">Target: {targetRegSemester || 'None'}</span>
                        </h4>
                        <div className="flex-1 overflow-auto thin-scrollbar relative">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-2 py-2 text-[10px] font-bold text-gray-700 border-r border-b border-gray-200 sticky left-0 z-20 bg-gray-100 w-24">Program</th>
                                        <th className="px-2 py-2 text-[10px] font-bold text-gray-700 border-r border-b border-gray-200 bg-gray-100 w-48">Name</th>
                                        {sortedAdmittedSemesters.map(sem => (
                                            <th key={sem} className="px-1 py-1 text-[9px] font-bold text-gray-600 border-r border-b border-gray-200 text-center min-w-[80px]">
                                                <div className="mb-1 text-gray-800">{sem}</div>
                                                <div className="grid grid-cols-2 gap-1 border-t border-gray-300 pt-1">
                                                    <span className="text-blue-600" title="Admitted">Adm</span>
                                                    <span className="text-red-600" title="Unregistered">Unreg</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 text-[10px] font-bold text-gray-700 border-b border-gray-200 text-center min-w-[80px]">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {allPrograms.map((prog, idx) => (
                                        <tr key={prog.pid} className="hover:bg-gray-50 text-[10px]">
                                            <td className="px-2 py-1 font-bold text-gray-600 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50">{prog.pid}</td>
                                            <td className="px-2 py-1 text-gray-500 border-r border-gray-100 truncate max-w-[150px]" title={prog.name}>{prog.name}</td>
                                            {sortedAdmittedSemesters.map(sem => {
                                                const data = prog.data[sem];
                                                const adm = data?.admitted || 0;
                                                const unreg = data?.unregistered || 0;
                                                return (
                                                    <td key={sem} className="px-1 py-1 border-r border-gray-100 text-center">
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <span className={`${adm > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{adm}</span>
                                                            <span className={`font-bold ${unreg > 0 ? 'text-red-500' : 'text-gray-300'}`}>{unreg}</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-1 font-bold text-center bg-gray-50/50">
                                                <div className="grid grid-cols-2 gap-1">
                                                     <span className="text-blue-700">{prog.totalAdmitted}</span>
                                                     <span className="text-red-600">{prog.totalUnregistered}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {allPrograms.length === 0 && (
                                        <tr>
                                            <td colSpan={sortedAdmittedSemesters.length + 3} className="text-center py-8 text-gray-400">
                                                No admitted data available for selected semesters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
