import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StudentDataRow, DiuEmployeeRow, TeacherDataRow } from '../types';
import { Calendar, MessageSquare, Table as TableIcon, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers, FilterX, Filter, RotateCcw, Check, User, MessageCircle, Info, Search, X, ShieldAlert, PowerOff, Users, School } from 'lucide-react';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
// Fix: Import useSheetData to access program mapping data
import { useSheetData } from '../hooks/useSheetData';
import { normalizeId } from '../services/sheetService';
import { getImageUrl } from '../views/EmployeeView';

interface StatItem {
    totalInteractions: number;
    uniqueStudents: Set<string>;
}

interface FollowupTimelineDashboardProps {
    students: StudentDataRow[];
    onRowClick?: (studentId: string) => void;
    diuEmployeeData: DiuEmployeeRow[];
    teacherData: TeacherDataRow[];
}

export const FollowupTimelineDashboard: React.FC<FollowupTimelineDashboardProps> = ({ 
    students, 
    onRowClick,
    diuEmployeeData,
    teacherData
}) => {
    // Fix: Get programData from context to build the missing programMap
    const { programData } = useSheetData();

    // Fix: Define programMap to resolve error on line 407 and display friendly program names
    const programMap = useMemo(() => {
        const map = new Map<string, string>();
        programData.forEach(p => {
            if (p.PID && p['Program Full Name']) {
                map.set(normalizeId(p.PID), p['Program Full Name']);
            }
        });
        return map;
    }, [programData]);

    // Filter States
    const [contactDateFrom, setContactDateFrom] = useState('');
    const [contactDateTo, setContactDateTo] = useState('');
    const [refollowupDateFrom, setRefollowupDateFrom] = useState('');
    const [refollowupDateTo, setRefollowupDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Statistics Tab State
    const [activeStatTab, setActiveStatTab] = useState<'status' | 'contacted' | 'program'>('status');
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [selectedContactedBy, setSelectedContactedBy] = useState<string | null>(null);
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    
    const [historySearch, setHistorySearch] = useState('');
    const filterRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const resetDates = () => {
        setContactDateFrom('');
        setContactDateTo('');
        setRefollowupDateFrom('');
        setRefollowupDateTo('');
        setSelectedStatus(null);
        setSelectedContactedBy(null);
        setSelectedProgramId(null);
        setHistorySearch('');
    };

    // Close filters when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                filterRef.current && !filterRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setShowFilters(false);
            }
        };
        if (showFilters) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFilters]);

    // Helpers
    const resolveEmployeeInfo = (id: string | undefined) => {
        if (!id || id === 'System') return { name: id || 'System', designation: '', photo: '' };
        const normId = normalizeId(id);
        
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) {
            const desig = [emp['Academic Designation'], emp['Administrative Designation']].filter(Boolean).join(' / ');
            return { name: emp['Employee Name'], designation: desig, photo: getImageUrl(emp.Photo) };
        }

        const teacher = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teacher) {
            return { name: teacher['Employee Name'], designation: teacher.Designation, photo: getImageUrl(teacher.Photo) };
        }

        return { name: id, designation: '', photo: '' };
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('en-US', { 
                month: 'short', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            }).format(date);
        } catch (e) { return dateStr; }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
        } catch (e) { return dateStr; }
    };

    const isDateOverdue = (dateStr: string) => {
        if (!dateStr) return false;
        try {
            const d = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return !isNaN(d.getTime()) && d < today;
        } catch (e) { return false; }
    };

    const isDiscRecordActive = (record: string) => {
        if (!record) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const datePattern = /([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/;
        const parts = record.split(/\bto\b/i);
        const fromDateMatch = parts[0].match(datePattern);
        const toDateMatch = parts.length > 1 ? parts[1].match(datePattern) : null;
        if (fromDateMatch) {
            const fromDate = new Date(fromDateMatch[1]);
            if (isNaN(fromDate.getTime())) return false;
            if (toDateMatch) {
                const toDate = new Date(toDateMatch[1]);
                if (isNaN(toDate.getTime())) return false;
                return today >= fromDate && today <= toDate;
            }
            return today >= fromDate;
        }
        return false;
    };

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    };

    // Analytics processing
    const analytics = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        const contactedStats: Record<string, StatItem> = {};
        const programStats: Record<string, StatItem> = {};
        const latestTimeline: any[] = [];

        students.forEach(s => {
            const raw = s['Discussion Remark'];
            if (!raw || raw.trim() === '') return;

            const allInteractions = raw.split(' || ').filter(Boolean).map(entry => {
                const fields = entry.split(' ;; ');
                return {
                    studentId: s['Student ID'],
                    studentName: s['Student Name'],
                    pid: s.PID,
                    disciplinaryAction: s['Disciplinary Action'],
                    dropoutClassification: s['Dropout Classification'],
                    date: fields[0] || '',
                    status: fields[1] || 'Unknown',
                    contactedBy: fields[2] || 'System',
                    refollowUp: fields[3] || '',
                    remark: fields[4] || ''
                };
            }).filter(e => e.date);

            if (allInteractions.length === 0) return;

            const sortedEntries = [...allInteractions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latestEntry = sortedEntries[0];

            let passesFilters = true;
            if (contactDateFrom && new Date(latestEntry.date) < new Date(contactDateFrom)) passesFilters = false;
            if (contactDateTo && new Date(latestEntry.date) > new Date(contactDateTo)) passesFilters = false;
            if (refollowupDateFrom && (!latestEntry.refollowUp || new Date(latestEntry.refollowUp) < new Date(refollowupDateFrom))) passesFilters = false;
            if (refollowupDateTo && (!latestEntry.refollowUp || new Date(latestEntry.refollowUp) > new Date(refollowupDateTo))) passesFilters = false;

            if (passesFilters) {
                statusCounts[latestEntry.status] = (statusCounts[latestEntry.status] || 0) + 1;
                
                const cb = latestEntry.contactedBy || 'Unknown';
                if (!contactedStats[cb]) {
                    contactedStats[cb] = { totalInteractions: 0, uniqueStudents: new Set() };
                }
                contactedStats[cb].totalInteractions += 1;
                contactedStats[cb].uniqueStudents.add(latestEntry.studentId);

                const pid = s.PID || 'Unknown';
                if (!programStats[pid]) {
                    programStats[pid] = { totalInteractions: 0, uniqueStudents: new Set() };
                }
                programStats[pid].totalInteractions += allInteractions.length;
                programStats[pid].uniqueStudents.add(s['Student ID']);
                
                latestTimeline.push({
                    ...latestEntry,
                    followupCount: allInteractions.length
                });
            }
        });

        const sortedTimeline = latestTimeline.sort((a, b) => {
            const dateA = a.refollowUp ? new Date(a.refollowUp).getTime() : Infinity;
            const dateB = b.refollowUp ? new Date(b.refollowUp).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
        const contactedEntries = Object.entries(contactedStats).sort((a, b) => b[1].totalInteractions - a[1].totalInteractions);
        const programEntries = Object.entries(programStats).sort((a, b) => b[1].totalInteractions - a[1].totalInteractions);

        const displayTimeline = sortedTimeline.filter(item => {
            const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
            const matchesContacted = selectedContactedBy ? item.contactedBy === selectedContactedBy : true;
            const matchesProgram = selectedProgramId ? item.pid === selectedProgramId : true;
            const term = historySearch.toLowerCase().trim();
            const matchesSearch = term ? (
                item.studentId.toLowerCase().includes(term) ||
                item.studentName.toLowerCase().includes(term) ||
                (item.contactedBy && item.contactedBy.toLowerCase().includes(term)) ||
                (item.status && item.status.toLowerCase().includes(term)) ||
                (item.remark && item.remark.toLowerCase().includes(term))
            ) : true;
            return matchesStatus && matchesSearch && matchesContacted && matchesProgram;
        });

        return { statusEntries, contactedEntries, programEntries, sortedTimeline: displayTimeline, totalStudents: latestTimeline.length };
    }, [students, contactDateFrom, contactDateTo, refollowupDateFrom, refollowupDateTo, selectedStatus, selectedContactedBy, selectedProgramId, historySearch]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(analytics.sortedTimeline);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

    const renderPieChart = () => {
        let entries: [string, number][] = [];
        if (activeStatTab === 'status') {
            entries = analytics.statusEntries;
        } else if (activeStatTab === 'contacted') {
            entries = analytics.contactedEntries.map(([label, stats]) => [label, stats.totalInteractions]);
        } else {
            entries = analytics.programEntries.map(([label, stats]) => [label, stats.totalInteractions]);
        }
        
        const total = entries.reduce((sum, [_, count]) => sum + (count as number), 0);
        if (total === 0) return (
            <div className="flex flex-col items-center justify-center h-40 w-40 text-slate-300">
                <FilterX className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">No Data</p>
            </div>
        );

        let cumulativeAngle = 0;
        const radius = 15;
        const centerX = 16;
        const centerY = 16;

        return (
            <svg viewBox="0 0 32 32" className="w-40 h-40 md:w-48 md:h-48 drop-shadow-md overflow-visible">
                {entries.map(([label, count], idx) => {
                    const sliceAngle = ((count as number) / total) * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + sliceAngle;
                    const x1 = centerX + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
                    const y1 = centerY + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
                    const x2 = centerX + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
                    const y2 = centerY + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const d = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    cumulativeAngle += sliceAngle;
                    const isSelected = (activeStatTab === 'status' && selectedStatus === label) || 
                                     (activeStatTab === 'contacted' && selectedContactedBy === label) ||
                                     (activeStatTab === 'program' && selectedProgramId === label);
                    return (
                        <path
                            key={label}
                            d={d}
                            onClick={() => {
                                if (activeStatTab === 'status') setSelectedStatus(isSelected ? null : label);
                                else if (activeStatTab === 'contacted') setSelectedContactedBy(isSelected ? null : label);
                                else setSelectedProgramId(isSelected ? null : label);
                            }}
                            fill={COLORS[idx % COLORS.length]}
                            className="transition-all duration-300 cursor-pointer origin-center hover:scale-105"
                            style={{ opacity: isSelected ? 1 : 0.8 }}
                        >
                            <title>{label}: {count}</title>
                        </path>
                    );
                })}
                <circle cx="16" cy="16" r="5" fill="white" />
            </svg>
        );
    };

    const isFilterActive = contactDateFrom || contactDateTo || refollowupDateFrom || refollowupDateTo;

    return (
        <div className="h-full flex flex-col lg:flex-row gap-3 overflow-hidden bg-transparent font-sans">
            {/* Left Panel: Statistics with Tabs */}
            <div className="w-full lg:w-[320px] shrink-0 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm h-full">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-100 shrink-0">
                    <button 
                        onClick={() => setActiveStatTab('status')}
                        className={`flex-1 py-3 text-[9px] font-black uppercase tracking-tight transition-all ${activeStatTab === 'status' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 bg-white'}`}
                    >
                        Response Type
                    </button>
                    <button 
                        onClick={() => setActiveStatTab('contacted')}
                        className={`flex-1 py-3 text-[9px] font-black uppercase tracking-tight transition-all ${activeStatTab === 'contacted' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 bg-white'}`}
                    >
                        Follow-Up Leaders
                    </button>
                    <button 
                        onClick={() => setActiveStatTab('program')}
                        className={`flex-1 py-3 text-[9px] font-black uppercase tracking-tight transition-all ${activeStatTab === 'program' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 bg-white'}`}
                    >
                        Program Stats
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-6">
                    <section>
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                            <h4 className="text-[12px] font-black text-slate-500 tracking-tight flex items-center">
                                {activeStatTab === 'status' ? <TableIcon className="w-3.5 h-3.5 mr-2 text-blue-500" /> : activeStatTab === 'contacted' ? <Users className="w-3.5 h-3.5 mr-2 text-blue-500" /> : <School className="w-3.5 h-3.5 mr-2 text-blue-500" />} 
                                {activeStatTab === 'status' ? 'Status Counts' : activeStatTab === 'contacted' ? 'Top Performers' : 'By Program'}
                            </h4>
                            {(selectedStatus || selectedContactedBy || selectedProgramId) && (
                                <button 
                                    onClick={() => { setSelectedStatus(null); setSelectedContactedBy(null); setSelectedProgramId(null); }}
                                    className="p-1 hover:bg-red-50 text-red-400 rounded-md transition-colors"
                                    title="Clear List Selection"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {activeStatTab === 'status' ? (
                                analytics.statusEntries.map(([label, count], idx) => {
                                    const isActive = selectedStatus === label;
                                    const sliceColor = COLORS[idx % COLORS.length];
                                    return (
                                        <div 
                                            key={label} 
                                            onClick={() => setSelectedStatus(isActive ? null : label)}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'} border`}
                                        >
                                            <div className="flex items-center min-w-0">
                                                <div className="w-2 h-2 rounded-full mr-3 shrink-0" style={{ backgroundColor: sliceColor }}></div>
                                                <span className="text-[11px] font-bold text-slate-700 truncate">{label}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-slate-900 tabular-nums">{count}</span>
                                        </div>
                                    );
                                })
                            ) : activeStatTab === 'contacted' ? (
                                analytics.contactedEntries.map(([id, stats], idx) => {
                                    const { name, designation, photo } = resolveEmployeeInfo(id);
                                    const isActive = selectedContactedBy === id;
                                    const sliceColor = COLORS[idx % COLORS.length];
                                    return (
                                        <div 
                                            key={id} 
                                            onClick={() => setSelectedContactedBy(isActive ? null : id)}
                                            className={`flex items-start p-2 rounded-lg cursor-pointer transition-all border ${isActive ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-slate-100 shrink-0 mt-0.5 mr-3">
                                                {photo ? <img src={photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="text-[11px] font-black text-slate-800 truncate leading-tight">{name}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">{designation || 'Staff'}</div>
                                                <div className="flex items-center space-x-3 mt-1.5 pt-1.5 border-t border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Students</span>
                                                        <span className="text-[10px] font-black text-blue-600 leading-none">{stats.uniqueStudents.size}</span>
                                                    </div>
                                                    <div className="flex flex-col border-l border-slate-100 pl-3">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Total Interactions</span>
                                                        <span className="text-[10px] font-black text-emerald-600 leading-none">{stats.totalInteractions}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: sliceColor }}></div>
                                        </div>
                                    );
                                })
                            ) : (
                                analytics.programEntries.map(([pid, stats], idx) => {
                                    const isActive = selectedProgramId === pid;
                                    const sliceColor = COLORS[idx % COLORS.length];
                                    const progName = programMap.get(normalizeId(pid)) || pid;
                                    return (
                                        <div 
                                            key={pid} 
                                            onClick={() => setSelectedProgramId(isActive ? null : pid)}
                                            className={`flex items-start p-2 rounded-lg cursor-pointer transition-all border ${isActive ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 shrink-0 mt-0.5 mr-3">
                                                <School className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="text-[11px] font-black text-slate-800 truncate leading-tight uppercase tracking-tight">{progName}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">PID: {pid}</div>
                                                <div className="flex items-center space-x-3 mt-1.5 pt-1.5 border-t border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Students</span>
                                                        <span className="text-[10px] font-black text-blue-600 leading-none">{stats.uniqueStudents.size}</span>
                                                    </div>
                                                    <div className="flex flex-col border-l border-slate-100 pl-3">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Follow-Ups</span>
                                                        <span className="text-[10px] font-black text-pink-600 leading-none">{stats.totalInteractions}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: sliceColor }}></div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="flex flex-col items-center pt-2">
                        <div className="w-full flex items-center mb-4 border-b border-slate-50 pb-2">
                            <h4 className="text-[12px] font-black text-slate-500 tracking-tight flex items-center">
                                <Layers className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                Share Analysis
                            </h4>
                        </div>
                        {renderPieChart()}
                    </section>
                </div>
            </div>

            {/* Right Panel: Follow-up History */}
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 h-[52px]">
                        <h4 className="text-[12px] font-black text-slate-800 tracking-widest flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                            Conversations
                        </h4>
                        
                        <div className="flex items-center space-x-2 flex-1 justify-end">
                            <div className="relative max-w-[280px] w-full flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-1 focus-within:ring-blue-500 group">
                                <button 
                                    ref={buttonRef}
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-2 border-r border-slate-100 rounded-l-lg transition-colors ${isFilterActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <Calendar className="w-4 h-4" />
                                </button>
                                <Search className="w-4 h-4 text-slate-300 ml-2 group-focus-within:text-blue-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search Student Or Remark..." 
                                    value={historySearch} 
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="flex-1 pl-2 pr-3 py-1.5 text-[12px] font-bold bg-transparent outline-none"
                                />

                                {showFilters && (
                                    <div ref={filterRef} className="absolute top-full right-0 mt-2 w-[300px] z-[60] bg-white border border-slate-200 shadow-2xl rounded-xl p-5 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[12px] font-black text-blue-600 tracking-widest">Date Range Filters</h4>
                                            <button onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Interaction Date</label>
                                                <div className="flex items-center space-x-2">
                                                    <input type="date" value={contactDateFrom} onChange={(e) => setContactDateFrom(e.target.value)} className="flex-1 h-8 text-[11px] p-1.5 border border-slate-200 rounded" />
                                                    <input type="date" value={contactDateTo} onChange={(e) => setContactDateTo(e.target.value)} className="flex-1 h-8 text-[11px] p-1.5 border border-slate-200 rounded" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Re-Followup Date</label>
                                                <div className="flex items-center space-x-2">
                                                    <input type="date" value={refollowupDateFrom} onChange={(e) => setRefollowupDateFrom(e.target.value)} className="flex-1 h-8 text-[11px] p-1.5 border border-slate-200 rounded" />
                                                    <input type="date" value={refollowupDateTo} onChange={(e) => setRefollowupDateTo(e.target.value)} className="flex-1 h-8 text-[11px] p-1.5 border border-slate-200 rounded" />
                                                </div>
                                            </div>
                                            <button onClick={resetDates} className="w-full py-2 text-[10px] font-bold text-slate-500 bg-slate-50 rounded hover:bg-slate-100 flex items-center justify-center uppercase"><RotateCcw className="w-3 h-3 mr-2" /> Reset All Filters</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-white border-b border-slate-200 shadow-sm">
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 tracking-widest w-[220px]">Student Identity</th>
                                    <th className="px-5 py-3 text-[11px] font-black text-slate-500 tracking-widest">Last Follow-Up Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.map((r, idx) => {
                                    const overdue = isDateOverdue(r.refollowUp);
                                    const discActionRaw = r.disciplinaryAction || '';
                                    const latestDisc = discActionRaw.split(' || ').filter(Boolean).pop() || '';
                                    const isDiscActive = isDiscRecordActive(latestDisc);
                                    const dropClass = r.dropoutClassification || '';
                                    const isPerm = dropClass.includes('Permanent');

                                    return (
                                        <tr key={idx} onClick={() => onRowClick?.(r.studentId)} className="hover:bg-blue-50/20 transition-colors group cursor-pointer">
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center text-blue-600">
                                                        <User className="w-3.5 h-3.5 mr-2" />
                                                        <span className="text-[12px] font-black font-mono">{r.studentId}</span>
                                                        <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black rounded-full border border-amber-200" title="Total Follow-ups">
                                                            {r.followupCount}
                                                        </span>
                                                    </div>
                                                    <span className="text-[13px] font-bold text-slate-800 leading-tight">{r.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex flex-col space-y-2.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                                            <Clock className="w-3 h-3 mr-1.5" />{formatDateTime(r.date)}
                                                        </div>
                                                        {r.refollowUp && (
                                                            <div className={`flex items-center text-[11px] font-bold px-2 py-0.5 rounded border ${overdue ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                <Calendar className="w-3 h-3 mr-1.5" />Next: {formatDate(r.refollowUp)}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center text-[11px] font-medium px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100 tracking-tighter shadow-sm">
                                                            <Info className="w-3 h-3 mr-1.5 text-blue-500" />{toTitleCase(r.status)}
                                                        </div>
                                                        
                                                        {isDiscActive && (
                                                            <div className="flex items-center text-[11px] font-bold px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-100 shadow-sm" title={latestDisc}>
                                                                <ShieldAlert className="w-3 h-3 mr-1.5" />
                                                                <span>{latestDisc.split('from')[0].trim()}</span>
                                                            </div>
                                                        )}

                                                        {dropClass && (
                                                            <div className={`flex items-center text-[11px] font-black px-2 py-0.5 rounded border tracking-tighter shadow-sm ${isPerm ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                                <PowerOff className="w-3 h-3 mr-1.5" />
                                                                {toTitleCase(dropClass)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-start bg-slate-50/50 p-2 rounded-lg">
                                                        <MessageCircle className="w-4 h-4 text-slate-300 mr-3 mt-0.5 shrink-0" />
                                                        <p className="text-[13px] text-slate-600 italic font-medium leading-relaxed">{r.remark}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {analytics.sortedTimeline.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="py-24 text-center">
                                            <div className="flex flex-col items-center opacity-10">
                                                <MessageSquare className="w-12 h-12 mb-3" />
                                                <p className="text-[12px] font-black uppercase tracking-widest">No Matching Interactions Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-gray-500 font-bold uppercase shrink-0 h-[42px] select-none">
                        <div>
                            {analytics.sortedTimeline.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, analytics.sortedTimeline.length)} Of {analytics.sortedTimeline.length}
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><ChevronsLeft className="w-4 h-4" /></button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="min-w-[24px] text-center font-black text-blue-600 bg-white border border-slate-200 rounded py-0.5">{currentPage}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><ChevronsRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};