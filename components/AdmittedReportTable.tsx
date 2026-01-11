
import React, { useState, useEffect, useMemo } from 'react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow } from '../types';
import { LayoutGrid, List as ListIcon, Check, Copy, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, UserCheck, UserX, UserMinus, PowerOff, Clock, Calculator, ShieldCheck, GraduationCap, Target, AlertCircle, MessageSquare, Download, Users, X, RotateCcw, User as UserIcon, Search, FilterX, TrendingUp, Banknote, FileBarChart, Table, CalendarDays, Settings, CheckSquare, Square, PieChart, FileSpreadsheet, Filter } from 'lucide-react';
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
    externalTargetRegSemester?: string;
    onTargetRegSemesterChange?: (val: string) => void;
    diuEmployeeData?: DiuEmployeeRow[];
    teacherData?: TeacherDataRow[];
    onSaveStudent?: (semester: string, student: StudentDataRow) => Promise<void>;
    hideSummaryToggle?: boolean;
    hideSidebar?: boolean;
    // New callback for interactive clicks
    onStatClick?: (semester: string, type: 'all' | 'registered' | 'unregistered') => void;
    activeDrillDown?: { semester: string, type: string } | null;
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
    externalTargetRegSemester,
    onTargetRegSemesterChange,
    diuEmployeeData = [],
    teacherData = [],
    onSaveStudent,
    hideSummaryToggle = false,
    hideSidebar = false,
    onStatClick,
    activeDrillDown
}) => {
    const [localTargetRegSemester, setLocalTargetRegSemester] = useState<string>('');
    const targetRegSemester = externalTargetRegSemester !== undefined ? externalTargetRegSemester : localTargetRegSemester;
    const setTargetRegSemester = onTargetRegSemesterChange || setLocalTargetRegSemester;

    const [activeEnrollmentSemester, setActiveEnrollmentSemester] = useState<string>('');
    const [viewMode, setViewMode] = useState<'full' | 'registration'>('full');
    
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [selectedExportCols, setSelectedExportCols] = useState<Set<string>>(new Set(['PID', 'Program', 'Student ID', 'Student Name', 'Mobile', 'Status']));
    const [exportStatusFilter, setExportStatusFilter] = useState<Set<string>>(new Set());
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        if (!targetRegSemester && registeredSemesters.length > 0) setTargetRegSemester(registeredSemesters[0]);
    }, [registeredSemesters, targetRegSemester, setTargetRegSemester]);

    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

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
                const isRegistered = checkIsRegistered(id, effectiveTarget);
                if (!progStats[normalizePid]) progStats[normalizePid] = {};
                if (!progStats[normalizePid][admissionSem]) progStats[normalizePid][admissionSem] = { admitted: 0, registered: 0, unregistered: 0 };
                const stats = progStats[normalizePid][admissionSem];
                stats.admitted++;
                if (isRegistered) stats.registered++; else stats.unregistered++;
            });
        });

        const allProgs = Array.from(progNames).sort().map((pid: string) => {
            const semesterData = progStats[pid] || {};
            return { pid: pid.toUpperCase(), name: programMap.get(pid) || pid, data: semesterData };
        });
        return { sortedAdmittedSemesters: sortedSems, allPrograms: allProgs };
    }, [selectedAdmittedSemesters, studentCache, targetRegSemester, registeredSemesters, registrationLookup, programMap, programDetailsMap, selectedPrograms, selectedFaculties, selectedProgramTypes, selectedSemesterTypes]);

    const paginationDataInput = useMemo(() => {
        if (hideSidebar) {
            return sortedAdmittedSemesters.map(sem => {
                const stats = { admitted: 0, registered: 0, unregistered: 0 };
                allPrograms.forEach(prog => {
                    const d = prog.data ? prog.data[sem] : null;
                    if (d) { stats.admitted += d.admitted || 0; stats.registered += d.registered || 0; stats.unregistered += d.unregistered || 0; }
                });
                return { semester: sem, ...stats };
            });
        }
        return allPrograms;
    }, [hideSidebar, sortedAdmittedSemesters, allPrograms]);

    const totals = useMemo(() => {
        if (!hideSidebar) return null;
        const statsData = paginationDataInput as { semester: string; admitted: number; registered: number; unregistered: number; }[];
        return statsData.reduce((acc, curr) => {
            acc.admitted += (curr.admitted || 0);
            acc.registered += (curr.registered || 0);
            acc.unregistered += (curr.unregistered || 0);
            return acc;
        }, { admitted: 0, registered: 0, unregistered: 0 });
    }, [hideSidebar, paginationDataInput]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(paginationDataInput);

    const handleExportStudentData = () => {
        if (!activeEnrollmentSemester) return;
        
        const students = studentCache.get(activeEnrollmentSemester) || [];
        const filteredList = students.filter(s => {
            const pidNorm = normalize(s.PID);
            const isReg = checkIsRegistered(s['Student ID'], targetRegSemester);
            
            if (selectedPrograms.size > 0 && !selectedPrograms.has(pidNorm)) return false;
            if (selectedFaculties.size > 0 || selectedProgramTypes.size > 0 || selectedSemesterTypes.size > 0) {
                const pInfo = programDetailsMap.get(pidNorm);
                if (!pInfo) return false;
                if (selectedFaculties.size > 0 && !selectedFaculties.has(pInfo['Faculty Short Name'])) return false;
                if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(pInfo['Program Type'])) return false;
                if (selectedSemesterTypes.size > 0 && !selectedSemesterTypes.has(pInfo['Semester Type'])) return false;
            }

            if (viewMode === 'registration') {
                if (isReg && !exportStatusFilter.has('registered')) return false;
                if (!isReg && !exportStatusFilter.has('unregistered')) return false;
            }

            return true;
        });

        if (filteredList.length === 0) {
            alert("No data matches the selected filters.");
            return;
        }

        const programGroups = new Map<string, StudentDataRow[]>();
        filteredList.forEach(s => {
            const pid = s.PID || 'Unknown';
            if (!programGroups.has(pid)) programGroups.set(pid, []);
            programGroups.get(pid)!.push(s);
        });

        const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
        const sortedPids = Array.from(programGroups.keys()).sort((a, b) => {
            const pInfoA = programDetailsMap.get(normalize(a));
            const pInfoB = programDetailsMap.get(normalize(b));
            const facA = pInfoA ? pInfoA['Faculty Short Name'] : 'Other';
            const facB = pInfoB ? pInfoB['Faculty Short Name'] : 'Other';
            const facIdxA = facultyOrder.indexOf(facA);
            const facIdxB = facultyOrder.indexOf(facB);
            if (facIdxA !== facIdxB) return (facIdxA === -1 ? 99 : facIdxA) - (facIdxB === -1 ? 99 : facIdxB);
            return a.localeCompare(b);
        });

        const workbook = (window as any).XLSX.utils.book_new();

        sortedPids.forEach(pid => {
            const pStudents = programGroups.get(pid)!;
            const pInfo = programDetailsMap.get(normalize(pid));
            const shortName = pInfo ? pInfo['Program Short Name'] : '';
            
            const exportRows = pStudents.map(s => {
                const row: any = {};
                const isReg = checkIsRegistered(s['Student ID'], targetRegSemester);
                selectedExportCols.forEach(col => {
                    if (col === 'Status') row[col] = isReg ? 'Registered' : 'Unregistered';
                    else if (col === 'PID') row[col] = s.PID;
                    else if (col === 'Program') row[col] = shortName;
                    else row[col] = (s as any)[col] || '';
                });
                return row;
            });

            const worksheet = (window as any).XLSX.utils.json_to_sheet(exportRows);
            const colWidths = Array.from(selectedExportCols).map(colKey => {
                const headerLen = colKey.length;
                const maxCellLen = exportRows.reduce((max, row) => {
                    const val = String(row[colKey] || '');
                    return Math.max(max, val.length);
                }, headerLen);
                return { wch: maxCellLen + 2 };
            });
            worksheet['!cols'] = colWidths;
            const sheetName = `${pid} ${shortName}`.trim().substring(0, 31);
            (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });

        (window as any).XLSX.writeFile(workbook, `Registration_Report_${activeEnrollmentSemester}_${targetRegSemester}.xlsx`);
    };

    const handleCopyRegistrationReport = async (enrollSemester: string) => {
        const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
        const semPrograms = allPrograms.map(p => {
            const semData = (p.data && p.data[enrollSemester]) || { admitted: 0, registered: 0, unregistered: 0 };
            const pInfo = programDetailsMap.get(p.pid.toLowerCase());
            return { 
                ...p, 
                totalAdmitted: semData.admitted, 
                totalRegistered: semData.registered, 
                totalUnregistered: semData.unregistered, 
                faculty: pInfo ? (pInfo['Faculty Short Name'] || 'Other') : 'Other' 
            };
        }).filter(p => p.totalAdmitted > 0).sort((a,b) => facultyOrder.indexOf(a.faculty) - facultyOrder.indexOf(b.faculty) || a.pid.localeCompare(b.pid));

        const semFacultyGroups: Record<string, any[]> = {};
        semPrograms.forEach(prog => { if (!semFacultyGroups[prog.faculty]) semFacultyGroups[prog.faculty] = []; semFacultyGroups[prog.faculty].push(prog); });
        const activeFacs = facultyOrder.filter(f => semFacultyGroups[f] && semFacultyGroups[f].length > 0);

        const grandAdmitted = semPrograms.reduce((acc, p) => acc + p.totalAdmitted, 0);
        const grandRegistered = semPrograms.reduce((acc, p) => acc + p.totalRegistered, 0);
        const grandUnregistered = semPrograms.reduce((acc, p) => acc + p.totalUnregistered, 0);

        let html = `<div style="font-family: 'Inter', -apple-system, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 16px; border-radius: 10px;">`;
        html += `<table style="margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; border-collapse: collapse; width: auto; table-layout: auto;">`;
        html += `<tr>`;
        html += `<td style="padding-right: 24px; vertical-align: bottom; white-space: nowrap;">`;
        html += `<div style="font-size: 18px; font-weight: 900; color: #2563eb; text-transform: uppercase; line-height: 1.1; white-space: nowrap;">${targetRegSemester}</div>`;
        html += `<div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; white-space: nowrap;">Registration Semester</div>`;
        html += `</td>`;
        html += `<td style="padding-left: 24px; padding-right: 24px; border-left: 1px solid #e2e8f0; vertical-align: bottom; white-space: nowrap;">`;
        html += `<div style="font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.1; white-space: nowrap;">${enrollSemester}</div>`;
        html += `<div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; white-space: nowrap;">Enroll Semester</div>`;
        html += `</td>`;
        html += `<td style="padding-left: 24px; padding-right: 24px; border-left: 1px solid #e2e8f0; vertical-align: bottom; text-align: center; white-space: nowrap;">`;
        html += `<div style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1.1; white-space: nowrap;">${grandAdmitted}</div>`;
        html += `<div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; white-space: nowrap;">Total Enroll</div>`;
        html += `</td>`;
        html += `<td style="padding-left: 24px; padding-right: 24px; border-left: 1px solid #e2e8f0; vertical-align: bottom; text-align: center; white-space: nowrap;">`;
        html += `<div style="font-size: 18px; font-weight: 900; color: #16a34a; line-height: 1.1; white-space: nowrap;">${grandRegistered}</div>`;
        html += `<div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; white-space: nowrap;">Total Registration</div>`;
        html += `</td>`;
        html += `<td style="padding-left: 24px; border-left: 1px solid #e2e8f0; vertical-align: bottom; text-align: center; white-space: nowrap;">`;
        html += `<div style="font-size: 18px; font-weight: 900; color: #dc2626; line-height: 1.1; white-space: nowrap;">${grandUnregistered}</div>`;
        html += `<div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; white-space: nowrap;">Total Unregistered</div>`;
        html += `</td>`;
        html += `</tr>`;
        html += `</table>`;
        html += `<div style="display: block; width: 100%;">`;

        activeFacs.forEach((fac) => {
            const progs = semFacultyGroups[fac];
            const subtotalAdmitted = progs.reduce((acc, p) => acc + p.totalAdmitted, 0);
            const subtotalRegistered = progs.reduce((acc, p) => acc + p.totalRegistered, 0);
            const subtotalUnregistered = progs.reduce((acc, p) => acc + p.totalUnregistered, 0);
            html += `<div style="display: inline-table; width: auto; min-width: 250px; margin: 0 12px 20px 0; vertical-align: top; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">`;
            html += `<table style="width: 100%; border-collapse: collapse; table-layout: auto;">`;
            html += `<thead>`;
            html += `<tr style="background-color: #334155; color: #ffffff;"><th colspan="4" style="padding: 6px 10px; font-size: 12px; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">${fac}</th></tr>`;
            html += `<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">`;
            html += `<th style="padding: 6px 10px; text-align: left; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: auto; white-space: nowrap;">Program</th>`;
            html += `<th style="padding: 6px 6px; text-align: center; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 45px;">Enroll</th>`;
            html += `<th style="padding: 6px 6px; text-align: center; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 45px;">Regi</th>`;
            html += `<th style="padding: 6px 6px; text-align: center; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 45px;">Unregi</th>`;
            html += `</tr>`;
            html += `</thead>`;
            html += `<tbody>`;
            progs.forEach((p, pIdx) => {
                const rowBg = pIdx % 2 === 0 ? '#ffffff' : '#fcfcfd';
                html += `<tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">`;
                html += `<td style="padding: 4px 10px; font-size: 12px; font-weight: 600; color: #334155; white-space: nowrap; width: auto;">${p.name}</td>`;
                html += `<td style="padding: 4px 6px; text-align: center; font-size: 12px; font-weight: 800; color: #0f172a; border-left: 1px solid #f1f5f9;">${p.totalAdmitted}</td>`;
                html += `<td style="padding: 4px 6px; text-align: center; font-size: 12px; font-weight: 800; color: #16a34a; border-left: 1px solid #f1f5f9;">${p.totalRegistered}</td>`;
                html += `<td style="padding: 4px 6px; text-align: center; font-size: 12px; font-weight: 800; color: #dc2626; border-left: 1px solid #f1f5f9;">${p.totalUnregistered}</td>`;
                html += `</tr>`;
            });
            html += `<tr style="background-color: #f1f5f9; font-weight: 900; border-top: 1px solid #e2e8f0;">`;
            html += `<td style="padding: 6px 10px; font-size: 11px; color: #475569; text-transform: uppercase; white-space: nowrap;">Total</td>`;
            html += `<td style="padding: 6px 6px; text-align: center; font-size: 12px; color: #1e40af; border-left: 1px solid #e2e8f0;">${subtotalAdmitted}</td>`;
            html += `<td style="padding: 6px 6px; text-align: center; font-size: 12px; color: #15803d; border-left: 1px solid #e2e8f0;">${subtotalRegistered}</td>`;
            html += `<td style="padding: 6px 6px; text-align: center; font-size: 12px; color: #b91c1c; border-left: 1px solid #e2e8f0;">${subtotalUnregistered}</td>`;
            html += `</tr>`;
            html += `</tbody>`;
            html += `</table>`;
            html += `</div>`;
        });
        html += `</div></div>`;

        try {
            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([`Analytics: ${enrollSemester}`], { type: 'text/plain' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) { console.error("Copy failed", err); }
    };

    const renderRegistrationReport = (enrollSemester: string) => {
        const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
        const semPrograms = allPrograms.map(p => {
            const semData = (p.data && p.data[enrollSemester]) || { admitted: 0, registered: 0, unregistered: 0 };
            const pInfo = programDetailsMap.get(p.pid.toLowerCase());
            return { ...p, totalAdmitted: semData.admitted, totalRegistered: semData.registered, totalUnregistered: semData.unregistered, faculty: pInfo ? (pInfo['Faculty Short Name'] || 'Other') : 'Other' };
        }).filter(p => p.totalAdmitted > 0 && p.faculty !== 'Other').sort((a,b) => facultyOrder.indexOf(a.faculty) - facultyOrder.indexOf(b.faculty) || a.pid.localeCompare(b.pid));

        const semFacultyGroups: Record<string, any[]> = {};
        semPrograms.forEach(prog => { if (!semFacultyGroups[prog.faculty]) semFacultyGroups[prog.faculty] = []; semFacultyGroups[prog.faculty].push(prog); });
        const activeFacs = facultyOrder.filter(f => semFacultyGroups[f] && semFacultyGroups[f].length > 0);

        if (!enrollSemester) return (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <CalendarDays className="w-12 h-12 mb-2 opacity-10" />
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">Select a semester from sidebar</p>
            </div>
        );

        return (
            <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
                <div className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
                    <div className="flex flex-wrap md:flex-nowrap gap-2 items-start w-full shrink-0 overflow-x-auto pb-2 no-scrollbar">
                        {activeFacs.map(fac => {
                            const progs = semFacultyGroups[fac];
                            const headerColor = FACULTY_COLORS[fac] || 'bg-gray-400';
                            const subtotalAdmitted = progs.reduce((acc, p) => acc + p.totalAdmitted, 0);
                            const subtotalRegistered = progs.reduce((acc, p) => acc + p.totalRegistered, 0);
                            const subtotalUnregistered = progs.reduce((acc, p) => acc + p.totalUnregistered, 0);
                            return (
                                <div key={fac} className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 min-w-[180px] overflow-hidden">
                                    <div className="px-3 py-1.5 border-b font-black text-[11px] text-gray-700 bg-gray-50 text-center uppercase tracking-widest truncate">{fac}</div>
                                    <div className={`flex justify-between px-2 py-1.5 ${headerColor} text-white text-[10px] font-bold uppercase tracking-tight`}><span className="w-[45%]">Program</span><span className="w-[18%] text-center">Adm</span><span className="w-[18%] text-center">Reg</span><span className="w-[19%] text-right">Unr</span></div>
                                    <div className="divide-y divide-gray-50">
                                        {progs.map(p => (
                                            <div key={p.pid} className="flex justify-between px-2 py-1 text-[11px] hover:bg-slate-50 items-center">
                                                <span className="w-[45%] text-gray-700 truncate font-medium" title={p.name}>{p.name}</span>
                                                <span className={`w-[18%] text-center font-black text-slate-800`}>
                                                    {p.totalAdmitted}
                                                </span>
                                                <span className={`w-[18%] text-center font-black text-green-600`}>
                                                    {p.totalRegistered}
                                                </span>
                                                <span className={`w-[19%] text-right font-black text-red-600`}>
                                                    {p.totalUnregistered}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-slate-100 border-t border-gray-200 px-2 py-1.5 flex justify-between text-[11px] font-black text-gray-800 uppercase mt-auto">
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
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-2 text-blue-500" />Growth Analysis: Adm vs Reg ({enrollSemester})</h4>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200"></div><span className="text-[9px] font-black text-slate-400 uppercase">Target</span></div>
                                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-600"></div><span className="text-[9px] font-black text-slate-400 uppercase">Registered</span></div>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            {allPrograms.length > 0 ? (
                                <div className="absolute inset-0 flex items-end justify-between space-x-1 px-4 pb-4 pt-16 overflow-x-auto no-scrollbar">
                                    {semPrograms.map((p, idx) => {
                                        const regPercentage = p.totalAdmitted > 0 ? (p.totalRegistered / p.totalAdmitted) * 100 : 0;
                                        const unregPercentage = p.totalAdmitted > 0 ? Math.round((p.totalUnregistered / p.totalAdmitted) * 100) : 0;
                                        
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full min-w-[25px]">
                                                {/* Percentage Label Above Bar - Lowered */}
                                                {p.totalAdmitted > 0 && (
                                                    <span className={`absolute -top-1 text-[8px] font-black tracking-tighter ${unregPercentage > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {unregPercentage > 0 ? `-${unregPercentage}%` : '100%'}
                                                    </span>
                                                )}

                                                {/* Bar Container */}
                                                <div className="w-full relative flex flex-col justify-end overflow-hidden rounded-t shadow-sm border border-slate-200" style={{ height: `75%`, minHeight: '4px' }}>
                                                    <div className="absolute inset-0 bg-blue-100/50"></div>
                                                    <div className={`relative w-full transition-all duration-700 ease-out bg-emerald-500 border-t border-emerald-600`} style={{ height: `${Math.min(regPercentage, 100)}%` }}></div>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-400 mt-1 truncate w-full text-center uppercase tracking-tighter" title={p.pid}>{p.pid}</span>

                                                {/* Tooltip - Lowered (mb-1 instead of mb-2) */}
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform group-hover:scale-100 scale-90 whitespace-nowrap border border-slate-700">
                                                    <div className="text-[10px] font-black border-b border-slate-700 pb-1 mb-1 text-center">{p.pid} {p.name}</div>
                                                    <div className="text-[9px] font-bold text-center">
                                                        <span className="text-slate-100">{p.totalAdmitted}</span>
                                                        <span className="mx-1.5 text-slate-500 opacity-50">|</span>
                                                        <span className="text-emerald-400">{p.totalRegistered}</span>
                                                        <span className="mx-1.5 text-slate-500 opacity-50">|</span>
                                                        <span className="text-rose-400">{p.totalUnregistered}</span>
                                                    </div>
                                                    <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-slate-700"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-white rounded shadow-sm overflow-hidden font-sans border border-gray-200">
            {!hideSidebar && (
                <div className="w-[190px] bg-slate-50 border-r border-gray-200 flex flex-col shrink-0 relative overflow-hidden">
                    <div className={`absolute inset-0 z-50 bg-white flex flex-col transition-transform duration-300 transform ${isExportOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                        <div className="px-3 py-3 border-b bg-gray-50 flex items-center justify-between shrink-0">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center"><FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export Data</h3>
                            <button onClick={() => setIsExportOpen(false)} className="p-1 hover:bg-white rounded-full text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-4 thin-scrollbar">
                            {viewMode === 'registration' && (
                                <section>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Status Filter</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                                        <button 
                                            onClick={() => {
                                                const newSet = new Set(exportStatusFilter);
                                                if (newSet.has('registered')) { if (newSet.size > 1) newSet.delete('registered'); } else newSet.add('registered');
                                                setExportStatusFilter(newSet);
                                            }}
                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-all flex items-center justify-center ${exportStatusFilter.has('registered') ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {exportStatusFilter.has('registered') && <Check className="w-2.5 h-2.5 mr-1" />}
                                            Regi
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const newSet = new Set(exportStatusFilter);
                                                if (newSet.has('unregistered')) { if (newSet.size > 1) newSet.delete('unregistered'); } else newSet.add('unregistered');
                                                setExportStatusFilter(newSet);
                                            }}
                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-all flex items-center justify-center ${exportStatusFilter.has('unregistered') ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {exportStatusFilter.has('unregistered') && <Check className="w-2.5 h-2.5 mr-1" />}
                                            Unregi
                                        </button>
                                    </div>
                                </section>
                            )}

                            <section>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Select Columns</label>
                                <div className="space-y-1.5">
                                    {['PID', 'Program', 'Student ID', 'Student Name', 'Status', 'Mobile', 'Email'].map(col => (
                                        <div key={col} onClick={() => { const s = new Set(selectedExportCols); if (s.has(col)) s.delete(col); else s.add(col); setSelectedExportCols(s); }} className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${selectedExportCols.has(col) ? 'bg-blue-50 border-blue-100 shadow-sm' : 'border-transparent hover:bg-gray-100'}`}>
                                            <div className={`mr-2.5 ${selectedExportCols.has(col) ? 'text-blue-600' : 'text-slate-300'}`}>{selectedExportCols.has(col) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}</div>
                                            <span className={`text-[10px] font-bold truncate ${selectedExportCols.has(col) ? 'text-blue-700' : 'text-slate-500'}`}>{col}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <div className="p-3 border-t bg-gray-50 shrink-0">
                            <button 
                                onClick={handleExportStudentData}
                                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Data</span>
                            </button>
                        </div>
                    </div>
                    <div className="p-2 border-b border-gray-200 bg-white shrink-0"><h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reports Console</h3></div>
                    <div className="flex-1 overflow-y-auto thin-scrollbar p-1.5 space-y-1">
                        <div className="mx-1.5 p-2 bg-white rounded-lg border border-slate-200 shadow-sm space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                            <label className="block text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] px-0.5">Registered Semester</label>
                            <div className="relative">
                                <select value={targetRegSemester} onChange={(e) => setTargetRegSemester(e.target.value)} className="w-full text-[9px] font-black border-none rounded-md bg-slate-50 focus:ring-1 focus:ring-blue-500 py-1 pl-1.5 pr-5 cursor-pointer appearance-none text-blue-700 uppercase">{registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="my-2 h-px bg-slate-200 mx-1.5"></div>
                        <div className="px-2 pb-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">By Enrollment</div>
                        {sortedAdmittedSemesters.map(sem => (
                            <button key={sem} onClick={() => { setActiveEnrollmentSemester(sem); setViewMode('registration'); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-2 ${activeEnrollmentSemester === sem ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'}`}><CalendarDays className="w-3 h-3 opacity-60" /><span className="truncate">{sem}</span></button>
                        ))}
                    </div>

                    <div className="p-2 border-t bg-white flex flex-row gap-2 shrink-0">
                        <button 
                            disabled={!activeEnrollmentSemester}
                            onClick={() => activeEnrollmentSemester && handleCopyRegistrationReport(activeEnrollmentSemester)} 
                            className="flex-1 flex items-center justify-center space-x-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button 
                            onClick={() => setIsExportOpen(!isExportOpen)} 
                            className={`flex-1 flex items-center justify-center space-x-2 py-2 border rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${isExportOpen ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'}`}
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{isExportOpen ? 'Hide' : 'Export'}</span>
                        </button>
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="px-3 py-1.5 border-b border-slate-600 bg-slate-700 flex items-center justify-between shrink-0 h-[34px]">
                    {!hideSidebar ? (
                        <div className="text-[10px] font-black text-white flex items-center uppercase tracking-widest">
                            <FileBarChart className="w-3.5 h-3.5 mr-2 text-blue-300" />
                            Enrollment Analytics {activeEnrollmentSemester && `: ${activeEnrollmentSemester}`}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="text-[10px] font-black text-white flex items-center uppercase tracking-widest">
                                <TrendingUp className="w-3.5 h-3.5 mr-2 text-blue-300" />
                                Target Session Summary
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                                <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Target:</label>
                                <div className="relative">
                                    <select 
                                        value={targetRegSemester} 
                                        onChange={(e) => setTargetRegSemester(e.target.value)} 
                                        className="text-[10px] font-black border border-slate-600 rounded-md focus:ring-1 focus:ring-blue-400 py-0.5 pl-1.5 pr-5 cursor-pointer appearance-none text-blue-100 uppercase bg-slate-800 shadow-sm"
                                    >
                                        {registeredSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!hideSidebar && (
                    <div className="px-3 border-b border-gray-200 bg-white flex items-center shrink-0 h-[36px]">
                        <div className="flex space-x-1">
                            <button onClick={() => { setViewMode('full'); setActiveEnrollmentSemester(''); }} className={`flex items-center px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${viewMode === 'full' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-3 h-3 mr-2" />Full Analysis</button>
                            <button 
                                disabled={!activeEnrollmentSemester}
                                onClick={() => setViewMode('registration')} 
                                className={`flex items-center px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${!activeEnrollmentSemester ? 'opacity-40 cursor-not-allowed border-transparent text-gray-300' : viewMode === 'registration' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                title={!activeEnrollmentSemester ? 'Select a semester from the sidebar to enable Registration Analysis' : ''}
                            >
                                <TrendingUp className="w-3 h-3 mr-2" />Registration Analysis
                            </button>
                        </div>
                    </div>
                )}

                {viewMode === 'full' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-700 sticky top-0 z-30 shadow-md border-b border-slate-600">
                                    {hideSidebar ? (
                                        <tr>
                                            <th className="px-4 py-1.5 text-[9px] font-black text-white/90 uppercase tracking-widest border-r border-slate-600">Semester</th>
                                            <th className="px-4 py-1.5 text-[9px] font-black text-white/90 uppercase tracking-widest border-r border-slate-600 text-center">Enroll</th>
                                            <th className="px-4 py-1.5 text-[9px] font-black text-white/90 uppercase tracking-widest border-r border-slate-600 text-center text-emerald-400">Reg</th>
                                            <th className="px-4 py-1.5 text-[9px] font-black text-white/90 uppercase tracking-widest text-center text-rose-400">Unreg</th>
                                        </tr>
                                    ) : (
                                        <tr><th className="px-3 py-2 text-[10px] font-black text-white sticky left-0 z-40 bg-slate-800 min-w-[160px] uppercase tracking-widest border-r border-slate-700">Program</th>{sortedAdmittedSemesters.map(sem => (<th key={sem} className="px-2 py-2 text-[9px] font-black text-white text-center min-w-[160px] border-r border-slate-700"><div className="mb-1 text-blue-300">{sem}</div><div className="grid grid-cols-3 gap-1 border-t border-slate-700 pt-1 uppercase text-[8px] tracking-tighter text-white/50"><span>Adm</span><span>Reg</span><span>Unr</span></div></th>))}<th className="px-3 py-2 text-[10px] font-black text-white text-center min-w-[180px] uppercase tracking-widest bg-slate-900 sticky right-0 z-40"><div className="mb-1 text-amber-400">Total</div><div className="grid grid-cols-3 gap-1 border-t border-slate-700 pt-1 text-[8px] tracking-tighter text-white/50"><span>Adm</span><span>Reg</span><span>Unr</span></div></th></tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedData.map((prog: any) => {
                                        if (hideSidebar) {
                                            const isRowFiltered = activeDrillDown?.semester === prog.semester;
                                            return (
                                                <tr key={prog.semester} className={`text-[11px] h-[30px] transition-colors ${isRowFiltered ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-4 py-1 font-black text-slate-800 border-r border-gray-100">{prog.semester}</td>
                                                    
                                                    {/* Interactive Counts */}
                                                    <td 
                                                        onClick={() => onStatClick?.(prog.semester, 'all')}
                                                        className={`px-4 py-1 text-center border-r border-gray-100 font-bold cursor-pointer transition-colors ${activeDrillDown?.semester === prog.semester && activeDrillDown?.type === 'all' ? 'text-blue-700 bg-blue-100/50 ring-inset ring-2 ring-blue-400' : 'text-slate-700 hover:bg-blue-50/80'}`}
                                                    >
                                                        {prog.admitted}
                                                    </td>
                                                    
                                                    <td 
                                                        onClick={() => onStatClick?.(prog.semester, 'registered')}
                                                        className={`px-4 py-1 text-center border-r border-gray-100 font-black cursor-pointer transition-colors ${activeDrillDown?.semester === prog.semester && activeDrillDown?.type === 'registered' ? 'text-white bg-emerald-600' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                    >
                                                        {prog.registered}
                                                    </td>
                                                    
                                                    <td 
                                                        onClick={() => onStatClick?.(prog.semester, 'unregistered')}
                                                        className={`px-4 py-1 text-center font-black cursor-pointer transition-colors ${activeDrillDown?.semester === prog.semester && activeDrillDown?.type === 'unregistered' ? 'text-white bg-rose-600' : 'text-rose-600 hover:bg-rose-50'}`}
                                                    >
                                                        {prog.unregistered}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const cumulative = sortedAdmittedSemesters.reduce((acc, sem) => {
                                            const d = prog.data ? prog.data[sem] : (prog.semester === sem ? prog : null);
                                            if (d) { acc.adm += d.admitted || 0; acc.reg += d.registered || 0; acc.unreg += d.unregistered || 0; }
                                            return acc;
                                        }, { adm: 0, reg: 0, unreg: 0 });
                                        return (
                                            <tr key={prog.pid || prog.semester} className="text-[11px] h-[32px] hover:bg-slate-50 transition-colors group"><td className="px-3 py-1 font-black text-slate-800 border-r border-gray-100 sticky left-0 bg-white transition-all group-hover:bg-slate-50"><span className="inline-block w-8 text-right mr-2 text-slate-400 font-mono">{prog.pid || 'SEM'}</span><span className="truncate max-w-[150px] inline-block align-middle" title={prog.name || prog.semester}>{prog.name || prog.semester}</span></td>{sortedAdmittedSemesters.map(sem => { const data = prog.data ? prog.data[sem] : (prog.semester === sem ? prog : null); const adm = data?.admitted || 0, reg = data?.registered || 0, unreg = data?.unregistered || 0; return (<td key={sem} className="px-2 py-1 border-r border-gray-50 text-center font-medium"><div className="grid grid-cols-3 gap-1 tabular-nums"><span className={`${adm > 0 ? 'text-slate-900' : 'text-slate-200'}`}>{adm}</span><span className={`${reg > 0 ? 'text-green-600 font-black' : 'text-slate-200'}`}>{reg}</span><span className={`${unreg > 0 ? 'text-red-700 font-black' : 'text-slate-200'}`}>{unreg}</span></div></td>); })}<td className="px-3 py-1 font-black text-center bg-slate-100 border-l border-slate-200 sticky right-0 z-10"><div className="grid grid-cols-3 gap-1 tabular-nums text-[10px]"><span className="text-slate-900">{cumulative.adm}</span><span className="text-green-700 font-black">{cumulative.reg}</span><span className="text-red-700 font-black">{cumulative.unreg}</span></div></td></tr>
                                        );
                                    })}
                                </tbody>
                                {hideSidebar && totals && (
                                    <tfoot className="bg-slate-100 sticky bottom-0 z-30 font-black border-t-2 border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                                        <tr className="h-[38px] text-[11px] text-gray-800">
                                            <td className="px-4 py-2 uppercase tracking-widest border-r border-slate-200">Grand Total</td>
                                            <td className="px-4 py-2 text-center border-r border-slate-200 text-blue-700">{totals.admitted}</td>
                                            <td className="px-4 py-2 text-center border-r border-slate-200 text-emerald-700">{totals.registered}</td>
                                            <td className="px-4 py-2 text-center text-rose-700">{totals.unregistered}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="px-3 py-1 bg-white border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-black uppercase shrink-0 h-[34px]"><div className="flex items-center space-x-2"><span>Showing {currentPage * rowsPerPage - rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, paginationDataInput.length)}</span><span className="text-slate-300">|</span><span>Total {paginationDataInput.length} {hideSidebar ? 'Semesters' : 'Programs'}</span></div><div className="flex items-center space-x-1"><button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button><span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-black">{currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button><button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button></div></div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">{renderRegistrationReport(activeEnrollmentSemester)}</div>
                )}
            </div>
        </div>
    );
};
