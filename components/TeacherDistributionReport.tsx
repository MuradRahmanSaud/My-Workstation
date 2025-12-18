
import React, { useMemo, useState, useEffect } from 'react';
import { TeacherSummaryItem } from '../hooks/useTeacherAggregation';
import { ProgramDataRow } from '../types';
import { Download, CheckSquare, Square, Copy, Check, Settings, X, BarChart3 } from 'lucide-react';

interface TeacherDistributionReportProps {
    data: TeacherSummaryItem[];
    programData: ProgramDataRow[];
    showExportPanel?: boolean;
    setShowExportPanel?: (val: boolean) => void;
}

const EXPORT_COLUMNS = [
    { key: 'teacherId', label: 'TEACHER ID' },
    { key: 'teacherName', label: 'TEACHER NAME' },
    { key: 'designation', label: 'DESIGNATION' },
    { key: 'derivedProgram', label: 'PROGRAM' },
    { key: 'derivedFaculty', label: 'FACULTY' },
    { key: 'totalSections', label: 'TOTAL SECTIONS' },
    { key: 'creditLoad', label: 'CREDIT LOAD' },
    { key: 'studentCount', label: 'TOTAL STUDENTS' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'email', label: 'EMAIL' },
];

const FACULTY_COLORS: Record<string, string> = {
    'FBE': 'bg-red-500',
    'FE': 'bg-yellow-500',
    'FHLS': 'bg-green-500',
    'FHSS': 'bg-blue-500',
    'FSIT': 'bg-orange-500',
    'Other': 'bg-gray-400'
};

const ROW_HEIGHT = 27;

export const TeacherDistributionReport: React.FC<TeacherDistributionReportProps> = ({ data, programData, showExportPanel = false, setShowExportPanel }) => {
    const [selectedExportCols, setSelectedExportCols] = useState<Set<string>>(new Set(EXPORT_COLUMNS.map(c => c.key)));
    const [exportFilename, setExportFilename] = useState('Teacher_Distribution_Report');
    const [copyReportSuccess, setCopyReportSuccess] = useState(false);
    const [copyChartSuccess, setCopyChartSuccess] = useState(false);
    
    // Mobile State
    const [activeFaculty, setActiveFaculty] = useState<string>('');

    const programMap = useMemo(() => {
        const map = new Map<string, { faculty: string, program: string }>();
        const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        programData.forEach(p => {
            if (p.PID) map.set(normalize(p.PID), { faculty: p['Faculty Short Name'] || 'Other', program: p['Program Short Name'] || p.PID });
        });
        return map;
    }, [programData]);

    const { facultyGroups, allPrograms, enrichedData } = useMemo(() => {
        const enriched = data.map(teacher => {
            const counts = new Map<string, number>();
            const details = new Map<string, { faculty: string, program: string }>();
            teacher.rows.forEach(row => {
                const pid = String(row.PID || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const info = programMap.get(pid);
                if (info) {
                    const key = `${info.faculty}||${info.program}`;
                    counts.set(key, (counts.get(key) || 0) + 1);
                    details.set(key, info);
                }
            });
            let maxKey = '', maxCount = -1;
            counts.forEach((count, key) => { if (count > maxCount) { maxCount = count; maxKey = key; } });
            let derivedFaculty = 'Other', derivedProgram = 'Unassigned';
            if (maxKey) { const info = details.get(maxKey); if (info) { derivedFaculty = info.faculty; derivedProgram = info.program; } }
            return { ...teacher, derivedFaculty, derivedProgram };
        });

        const groups: Record<string, { program: string, count: number }[]> = {};
        const progCounts: Record<string, Record<string, number>> = {};
        enriched.forEach(t => {
            if (!progCounts[t.derivedFaculty]) progCounts[t.derivedFaculty] = {};
            if (!progCounts[t.derivedFaculty][t.derivedProgram]) progCounts[t.derivedFaculty][t.derivedProgram] = 0;
            progCounts[t.derivedFaculty][t.derivedProgram]++;
        });
        const flatPrograms: any[] = [];
        Object.keys(progCounts).forEach(fac => {
            groups[fac] = [];
            Object.keys(progCounts[fac]).forEach(prog => {
                const count = progCounts[fac][prog];
                groups[fac].push({ program: prog, count });
                flatPrograms.push({ program: prog, faculty: fac, count });
            });
            groups[fac].sort((a, b) => a.program.localeCompare(b.program));
        });
        return { facultyGroups: groups, allPrograms: flatPrograms, enrichedData: enriched };
    }, [data, programMap]);

    const sortedFaculties = useMemo(() => ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'].filter(f => facultyGroups[f]), [facultyGroups]);

    useEffect(() => {
        if (sortedFaculties.length > 0 && !activeFaculty) setActiveFaculty(sortedFaculties[0]);
    }, [sortedFaculties, activeFaculty]);

    const maxRows = useMemo(() => {
        if (sortedFaculties.length === 0) return 0;
        return Math.max(...sortedFaculties.map(fac => facultyGroups[fac]?.length || 0));
    }, [facultyGroups, sortedFaculties]);

    const contentHeight = Math.max(maxRows * ROW_HEIGHT, ROW_HEIGHT);

    const toggleColumn = (key: string) => {
        const newSet = new Set(selectedExportCols);
        if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
        setSelectedExportCols(newSet);
    };

    const handleDownload = () => {
        try {
            const exportData = enrichedData.map(item => {
                const row: any = {};
                EXPORT_COLUMNS.forEach(col => { if (selectedExportCols.has(col.key)) row[col.label] = (item as any)[col.key]; });
                return row;
            });
            const worksheet = (window as any).XLSX.utils.json_to_sheet(exportData);
            const workbook = (window as any).XLSX.utils.book_new();
            (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Teacher Distribution");
            (window as any).XLSX.writeFile(workbook, `${exportFilename || 'Export'}.xlsx`);
        } catch (error) { console.error("Export failed:", error); }
    };

    const handleCopyReport = async () => { /* ... existing ... */ };
    const handleCopyChart = async () => { /* ... existing ... */ };

    const renderFacultyCard = (fac: string, mobile: boolean = false) => {
        const programs = facultyGroups[fac];
        if(!programs) return null;
        const total = programs.reduce((acc, d) => acc + d.count, 0);
        const headerColor = FACULTY_COLORS[fac] || 'bg-gray-400';

        return (
            <div className={`bg-white rounded border shadow-sm flex flex-col overflow-hidden ${mobile ? 'w-full h-auto mb-4' : 'min-w-[300px] md:min-w-0 snap-center'}`}>
                {!mobile && <div className="py-2 md:py-1.5 px-3 md:px-2 text-center border-b font-bold text-sm md:text-xs text-gray-700 bg-gray-50">{fac}</div>}
                <div className={`flex justify-between px-3 md:px-2 py-2 md:py-1 ${headerColor} text-white text-xs md:text-[11px] font-bold`}>
                    <span>Program</span>
                    <span>Teachers</span>
                </div>
                <div className="divide-y divide-gray-100 overflow-y-auto thin-scrollbar" style={{ height: mobile ? 'auto' : `${contentHeight}px`, maxHeight: mobile ? '400px' : 'none' }}>
                    {programs.map(d => (
                        <div key={d.program} className="flex justify-between px-3 md:px-2 py-2 md:py-0.5 text-sm md:text-[12px] hover:bg-gray-50 items-center border-b border-gray-50 last:border-0 md:border-none md:h-[27px]">
                            <span className="text-gray-700 truncate mr-2" title={d.program}>{d.program}</span>
                            <span className="font-bold text-gray-900">{d.count}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-cyan-50 border-t border-cyan-100 px-3 md:px-2 py-2 md:py-1 flex justify-between text-sm md:text-[12px] font-bold text-gray-800">
                    <span>Subtotal</span>
                    <span>{total}</span>
                </div>
            </div>
        );
    };

    const renderChart = (facultiesToShow: string[]) => {
        const chartData: any[] = [];
        facultiesToShow.forEach(fac => {
            const progs = facultyGroups[fac];
            if (progs) chartData.push(...progs.map(d => ({ ...d, faculty: fac })));
        });
        if (chartData.length === 0) return <div className="w-full text-center text-gray-400 self-center">No data available</div>;
        const maxCount = Math.max(...chartData.map(d => d.count), 1);

        return (
            <div className="absolute inset-0 flex items-end justify-between space-x-1 px-2 pb-2 pt-12 overflow-x-auto thin-scrollbar">
                {chartData.map((d, idx) => {
                    const heightPercent = Math.max((d.count / maxCount) * 70, 2);
                    const barColor = FACULTY_COLORS[d.faculty] || 'bg-gray-400';
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative h-full hover:bg-gray-50/50 rounded-lg transition-colors min-w-[20px]">
                            <span className="text-[9px] font-bold text-gray-500 mb-0.5">{d.count}</span>
                            <div className="absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 flex flex-col items-center mb-5" style={{ bottom: `${heightPercent}%` }}>
                                <span className="font-bold">{d.program}</span>
                                <span className="text-[9px] opacity-90">Teachers: {d.count}</span>
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
        <div className="flex h-full bg-gray-50 overflow-hidden relative">
            {/* Export Sidebar */}
            <div className={`${showExportPanel ? 'w-44 md:w-64 border-r' : 'w-0'} bg-white border-gray-200 flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}>
               <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-xs font-bold text-gray-700">Select Columns</h3>
                        <button onClick={() => setShowExportPanel && setShowExportPanel(false)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex space-x-2 mt-2">
                         <button onClick={() => setSelectedExportCols(new Set(EXPORT_COLUMNS.map(c => c.key)))} className="flex-1 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600">All</button>
                         <button onClick={() => setSelectedExportCols(new Set())} className="flex-1 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600">None</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 thin-scrollbar">
                    {EXPORT_COLUMNS.map(col => (
                        <div key={col.key} onClick={() => toggleColumn(col.key)} className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedExportCols.has(col.key) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            <div className={`mr-2 ${selectedExportCols.has(col.key) ? 'text-blue-600' : 'text-gray-400'}`}>
                                {selectedExportCols.has(col.key) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </div>
                            <span className={`text-[10px] font-medium leading-tight ${selectedExportCols.has(col.key) ? 'text-gray-800' : 'text-gray-500'}`}>{col.label}</span>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <input type="text" value={exportFilename} onChange={(e) => setExportFilename(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2 focus:border-blue-500 outline-none" />
                    <button onClick={handleDownload} disabled={data.length === 0} className="w-full flex items-center justify-center py-2 bg-[#0891b2] hover:bg-[#06b6d4] text-white rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="flex justify-between items-center p-2 bg-white border-b border-gray-200 shrink-0">
                    <h3 className="text-sm md:text-lg font-bold text-gray-800 truncate mr-2">Teacher Dist.</h3>
                    <div className="flex items-center space-x-2 shrink-0">
                        <button onClick={handleCopyReport} className="hidden md:flex items-center space-x-1 px-3 py-1 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm">
                            {copyReportSuccess ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copyReportSuccess ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button 
                            onClick={() => setShowExportPanel && setShowExportPanel(!showExportPanel)} 
                            className={`flex items-center space-x-1 px-3 py-1 text-xs font-bold border rounded transition-colors shadow-sm ${showExportPanel ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {/* Mobile View: Horizontal Tabs + Vertical Content */}
                <div className="md:hidden flex flex-col flex-1 overflow-hidden">
                    {/* Horizontal Tabs */}
                    <div className="flex overflow-x-auto p-2 space-x-2 bg-white border-b border-gray-200 shrink-0 no-scrollbar">
                        {sortedFaculties.map(fac => (
                            <button 
                                key={fac} 
                                onClick={() => setActiveFaculty(fac)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all shadow-sm ${activeFaculty === fac ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {fac}
                            </button>
                        ))}
                    </div>
                    {/* Content */}
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

                {/* Desktop View */}
                <div className="hidden md:flex flex-col flex-1 overflow-y-auto p-2 space-y-2 thin-scrollbar">
                    <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 items-start shrink-0">
                        {sortedFaculties.map(fac => renderFacultyCard(fac))}
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200 shadow-sm mt-2 flex flex-col shrink-0 relative">
                        <button onClick={handleCopyChart} className="absolute right-2 top-2 flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors z-10">
                            {copyChartSuccess ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copyChartSuccess ? 'Copied' : 'Copy'}</span>
                        </button>
                        <div className="w-full relative h-[220px] mt-2">{renderChart(sortedFaculties)}</div>
                        <div className="flex justify-center flex-wrap gap-4 mt-2 border-t border-gray-100 pt-2 shrink-0">
                            {sortedFaculties.map(fac => (<div key={fac} className="flex items-center space-x-1.5"><div className={`w-3 h-3 rounded-sm ${FACULTY_COLORS[fac]}`}></div><span className="text-[10px] font-bold text-gray-600">{fac}</span></div>))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
