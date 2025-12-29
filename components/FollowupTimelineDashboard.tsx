
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StudentDataRow } from '../types';
import { Calendar, MessageSquare, PieChart, Table as TableIcon, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers, FilterX, Filter, ChevronUp, ChevronDown, RotateCcw, Check, User, MessageCircle, Info, Search, X, ShieldAlert } from 'lucide-react';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

interface FollowupTimelineDashboardProps {
    students: StudentDataRow[];
    onRowClick?: (studentId: string) => void;
}

export const FollowupTimelineDashboard: React.FC<FollowupTimelineDashboardProps> = ({ students, onRowClick }) => {
    // Filter States
    const [contactDateFrom, setContactDateFrom] = useState('');
    const [contactDateTo, setContactDateTo] = useState('');
    const [refollowupDateFrom, setRefollowupDateFrom] = useState('');
    const [refollowupDateTo, setRefollowupDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [historySearch, setHistorySearch] = useState('');
    const filterRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const resetDates = () => {
        setContactDateFrom('');
        setContactDateTo('');
        setRefollowupDateFrom('');
        setRefollowupDateTo('');
        setSelectedStatus(null);
        setHistorySearch('');
    };

    // Close filters when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Don't close if clicking the panel itself or the button that toggles it
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

    // Helper to format date/time to MMM DD, YYYY at hh:mm AM/PM (No seconds)
    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('en-US', { 
                month: 'short', 
                day: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to format simple date (MMM DD, YYYY)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('en-US', { 
                month: 'short', 
                day: '2-digit', 
                year: 'numeric' 
            }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to check if a date is overdue (before today)
    const isDateOverdue = (dateStr: string) => {
        if (!dateStr) return false;
        try {
            const d = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return !isNaN(d.getTime()) && d < today;
        } catch (e) {
            return false;
        }
    };

    // 1. Process data to get LATEST interaction per student with filtering
    const analytics = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        const latestTimeline: any[] = [];

        students.forEach(s => {
            const raw = s['Discussion Remark'];
            if (!raw || raw.trim() === '') return;

            const entries = raw.split(' || ').map(entry => {
                const fields = entry.split(' ;; ');
                return {
                    studentId: s['Student ID'],
                    studentName: s['Student Name'],
                    disciplinaryAction: s['Disciplinary Action'],
                    date: fields[0],
                    status: fields[1] || 'Unknown',
                    contactedBy: fields[2],
                    refollowUp: fields[3],
                    remark: fields[4]
                };
            });

            // Find absolute latest entry for this student
            const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latestEntry = sortedEntries[0];

            // Apply Date Filtering Logic
            if (contactDateFrom) {
                if (new Date(latestEntry.date) < new Date(contactDateFrom)) return;
            }
            if (contactDateTo) {
                if (new Date(latestEntry.date) > new Date(contactDateTo)) return;
            }
            if (refollowupDateFrom) {
                if (!latestEntry.refollowUp || new Date(latestEntry.refollowUp) < new Date(refollowupDateFrom)) return;
            }
            if (refollowupDateTo) {
                if (!latestEntry.refollowUp || new Date(latestEntry.refollowUp) > new Date(refollowupDateTo)) return;
            }

            const latestStatus = latestEntry.status;
            statusCounts[latestStatus] = (statusCounts[latestStatus] || 0) + 1;
            latestTimeline.push(latestEntry);
        });

        // SORTING: Primary sort by Re-follow up date (Soonest/Overdue first)
        const sortedTimeline = latestTimeline.sort((a, b) => {
            const dateA = a.refollowUp ? new Date(a.refollowUp).getTime() : Infinity;
            const dateB = b.refollowUp ? new Date(b.refollowUp).getTime() : Infinity;
            
            if (dateA !== dateB) return dateA - dateB;
            
            // Secondary sort: Interaction date descending
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

        // Filter the timeline for display
        const displayTimeline = sortedTimeline.filter(item => {
            const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
            
            const term = historySearch.toLowerCase().trim();
            const matchesSearch = term ? (
                item.studentId.toLowerCase().includes(term) ||
                item.studentName.toLowerCase().includes(term) ||
                (item.contactedBy && item.contactedBy.toLowerCase().includes(term)) ||
                (item.status && item.status.toLowerCase().includes(term)) ||
                (item.remark && item.remark.toLowerCase().includes(term))
            ) : true;
            
            return matchesStatus && matchesSearch;
        });

        return { 
            statusEntries, 
            sortedTimeline: displayTimeline, 
            totalStudents: latestTimeline.length 
        };
    }, [students, contactDateFrom, contactDateTo, refollowupDateFrom, refollowupDateTo, selectedStatus, historySearch]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(analytics.sortedTimeline);

    const COLORS = [
        '#ffeb3b', '#4fc3f7', '#e040fb', '#f57c00', '#aeea00', '#ff4081', '#00bcd4', '#ff5722'
    ];

    const renderAdvancedPieChart = () => {
        const total = analytics.statusEntries.reduce((sum, [_, count]) => sum + count, 0);
        if (total === 0) return (
            <div className="flex flex-col items-center justify-center h-40 w-40 text-slate-300">
                <FilterX className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-[8px] font-black uppercase tracking-widest text-center">No Data in Range</p>
            </div>
        );

        let cumulativeAngle = 0;
        const radius = 15;
        const centerX = 16;
        const centerY = 16;

        return (
            <svg viewBox="0 0 32 32" className="w-40 h-40 md:w-44 md:h-44 drop-shadow-md overflow-visible">
                {analytics.statusEntries.map(([status, count], idx) => {
                    const sliceAngle = (count / total) * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + sliceAngle;
                    
                    const x1 = centerX + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
                    const y1 = centerY + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
                    const x2 = centerX + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
                    const y2 = centerY + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
                    
                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const d = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    
                    const labelAngle = startAngle + sliceAngle / 2;
                    const labelRadius = radius * 0.7;
                    const lx = centerX + labelRadius * Math.cos((Math.PI * (labelAngle - 90)) / 180);
                    const ly = centerY + labelRadius * Math.sin((Math.PI * (labelAngle - 90)) / 180);

                    cumulativeAngle += sliceAngle;
                    const percentage = Math.round((count / total) * 100);
                    const isActive = selectedStatus === status;

                    return (
                        <g key={status} className="group outline-none">
                            <path
                                d={d}
                                onClick={() => setSelectedStatus(isActive ? null : status)}
                                fill={COLORS[idx % COLORS.length]}
                                stroke="none"
                                className="transition-all duration-300 cursor-pointer origin-center"
                                style={{
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    filter: isActive ? `drop-shadow(0 0 1px ${COLORS[idx % COLORS.length]})` : 'none'
                                }}
                            >
                                <title>{status}: {count} ({percentage}%)</title>
                            </path>
                            {percentage > 5 && (
                                <text
                                    x={lx} y={ly} fill={isActive ? "#000" : "#444"} fontSize="1.6" fontWeight="900" textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none opacity-80 transition-all duration-300"
                                    style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transformOrigin: `${lx}px ${ly}px` }}
                                >
                                    {percentage}%
                                </text>
                            )}
                        </g>
                    );
                })}
                <circle cx="16" cy="16" r="3" fill="white" className="shadow-inner" />
            </svg>
        );
    };

    const isFilterActive = contactDateFrom || contactDateTo || refollowupDateFrom || refollowupDateTo;

    return (
        <div className="h-full flex flex-col lg:flex-row gap-3 overflow-hidden bg-transparent font-sans">
            {/* Left Panel: Statistics */}
            <div className="w-full lg:w-[320px] shrink-0 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm h-full">
                <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-6">
                    {/* Response Status Section */}
                    <section>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center">
                                <TableIcon className="w-3 h-3 mr-2 opacity-60 text-indigo-500" /> 
                                Response Status
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {analytics.totalStudents} IDs
                            </span>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto thin-scrollbar px-1 pb-2">
                            <table className="w-full text-left border-separate border-spacing-y-1.5">
                                <tbody>
                                    {analytics.statusEntries.map(([status, count], idx) => {
                                        const isActive = selectedStatus === status;
                                        const sliceColor = COLORS[idx % COLORS.length];
                                        return (
                                            <tr 
                                                key={status} 
                                                onClick={() => setSelectedStatus(isActive ? null : status)}
                                                className={`transition-all duration-300 h-[32px] cursor-pointer rounded-lg border-none ${isActive ? 'scale-[1.03]' : 'hover:bg-blue-50/50'}`}
                                                style={{ backgroundColor: isActive ? sliceColor : 'transparent', boxShadow: isActive ? `0 10px 15px -3px ${sliceColor}80` : 'none' }}
                                            >
                                                <td className="py-1 pl-3 rounded-l-lg">
                                                    <div className="flex items-center">
                                                        <div className={`w-1.5 h-1.5 rounded-full mr-2.5 border border-white shadow-sm shrink-0 transition-transform ${isActive ? 'scale-125 bg-white' : ''}`} style={{ backgroundColor: isActive ? 'white' : sliceColor }}></div>
                                                        <span className={`text-[10px] font-bold truncate max-w-[180px] transition-colors ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{status}</span>
                                                    </div>
                                                </td>
                                                <td className={`py-1 pr-3 text-right font-black text-[10px] tabular-nums rounded-r-lg ${isActive ? 'text-slate-900' : 'text-slate-900'}`}>
                                                    {count}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Chart Section */}
                    <section className="flex flex-col items-center pt-2">
                        <div className="w-full flex items-center mb-3 border-b border-slate-50 pb-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center">
                                <Layers className="w-3 h-3 mr-2 opacity-60 text-indigo-500" />
                                Data Share
                            </h4>
                        </div>
                        <div className="py-2">
                            {renderAdvancedPieChart()}
                        </div>
                    </section>
                </div>
            </div>

            {/* Right Panel: Follow-up History */}
            <div className="flex-1 flex flex-col overflow-hidden h-full relative">
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full relative">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 h-[48px] relative z-[51]">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.15em] flex items-center shrink-0">
                            <MessageSquare className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                            History
                        </h4>
                        
                        <div className="flex items-center space-x-2 flex-1 justify-end relative">
                            {/* Integrated Search & Filter Bar */}
                            <div className="relative max-w-[280px] w-full flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-400 transition-all group">
                                {/* Date Filter Button (Inside left) */}
                                <button 
                                    ref={buttonRef}
                                    onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
                                    className={`p-2 border-r border-slate-100 rounded-l-lg transition-colors ${isFilterActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50/50 text-slate-400 hover:text-indigo-600 hover:bg-white'}`}
                                    title="Date Filters"
                                >
                                    <Calendar className={`w-3.5 h-3.5 ${isFilterActive ? 'animate-pulse' : ''}`} />
                                </button>
                                
                                <Search className="w-3 h-3 text-slate-300 ml-2 group-focus-within:text-indigo-400 transition-colors" />
                                
                                <input 
                                    type="text" 
                                    placeholder="Search student, remark..." 
                                    value={historySearch} 
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="flex-1 pl-1.5 pr-2 py-1.5 text-[10px] font-bold bg-transparent outline-none placeholder:text-slate-300 rounded-r-lg"
                                />

                                {/* Floating Date Filters Popover (Relative to combined bar) */}
                                {showFilters && (
                                    <div 
                                        ref={filterRef}
                                        className="absolute top-[110%] right-0 w-[calc(100vw-40px)] sm:w-[280px] z-[100] bg-white border border-slate-200 shadow-2xl rounded-xl p-4 animate-in slide-in-from-top-2 duration-200"
                                    >
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center">
                                                <Calendar className="w-3.5 h-3.5 mr-2" />
                                                Range Filters
                                            </h4>
                                            <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-slate-100 rounded-full">
                                                <X className="w-3.5 h-3.5 text-slate-400" />
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Interaction Date</label>
                                                <div className="flex items-center space-x-2">
                                                    <input type="date" value={contactDateFrom} onChange={(e) => setContactDateFrom(e.target.value)} className="flex-1 h-8 text-[10px] p-2 border border-slate-200 rounded-md outline-none font-bold bg-slate-50/50" />
                                                    <span className="text-slate-300 font-bold">-</span>
                                                    <input type="date" value={contactDateTo} onChange={(e) => setContactDateTo(e.target.value)} className="flex-1 h-8 text-[10px] p-2 border border-slate-200 rounded-md outline-none font-bold bg-slate-50/50" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Re-Followup Date</label>
                                                <div className="flex items-center space-x-2">
                                                    <input type="date" value={refollowupDateFrom} onChange={(e) => setRefollowupDateFrom(e.target.value)} className="flex-1 h-8 text-[10px] p-2 border border-slate-200 rounded-md outline-none font-bold bg-slate-50/50" />
                                                    <span className="text-slate-300 font-bold">-</span>
                                                    <input type="date" value={refollowupDateTo} onChange={(e) => setRefollowupDateTo(e.target.value)} className="flex-1 h-8 text-[10px] p-2 border border-slate-200 rounded-md outline-none font-bold bg-slate-50/50" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-4 border-t border-slate-100 flex space-x-2">
                                            <button onClick={resetDates} className="flex-1 py-2 text-[10px] font-black text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center uppercase tracking-widest transition-all"><RotateCcw className="w-3 h-3 mr-2" /> Reset</button>
                                            <button onClick={() => setShowFilters(false)} className="flex-1 py-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center uppercase tracking-widest transition-all shadow-sm"><Check className="w-3 h-3 mr-2" /> Apply</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {selectedStatus && (
                                <span className="flex items-center text-[8px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-indigo-700 shadow-sm shrink-0">
                                    <Check className="w-2.5 h-2.5 mr-1" /> {selectedStatus}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-white border-b border-slate-200">
                                    <th className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 w-[200px]">Student</th>
                                    <th className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Last Conversation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.map((r, idx) => {
                                    const overdue = isDateOverdue(r.refollowUp);
                                    const discActionRaw = r.disciplinaryAction || '';
                                    const latestDisc = discActionRaw.split(' || ').filter(Boolean).pop() || '';

                                    return (
                                        <tr key={idx} onClick={() => onRowClick?.(r.studentId)} className="hover:bg-blue-50/20 transition-colors group cursor-pointer">
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center">
                                                        <div className="p-1 rounded bg-indigo-50 text-indigo-600 mr-2 shrink-0"><User className="w-3 h-3" /></div>
                                                        <span className="text-[10px] font-black text-indigo-600 font-mono tracking-tighter">{r.studentId}</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-800 leading-tight block" title={r.studentName}>{r.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col space-y-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded"><Clock className="w-2.5 h-2.5 mr-1" />{formatDateTime(r.date)}</div>
                                                        {r.refollowUp && (
                                                            <div className={`flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${overdue ? 'bg-red-50 text-red-700 border-red-100 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                <Calendar className={`w-2.5 h-2.5 mr-1 ${overdue ? 'text-red-500' : 'text-amber-500'}`} />Next: {formatDate(r.refollowUp)}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center text-[9px] font-black px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-tighter shadow-sm"><Info className="w-2.5 h-2.5 mr-1 text-blue-500" />{r.status}</div>
                                                        
                                                        {latestDisc && (
                                                            <div className="flex items-center text-[9px] font-black px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-100 uppercase tracking-tighter shadow-sm" title={latestDisc}>
                                                                <ShieldAlert className="w-2.5 h-2.5 mr-1 text-red-500 shrink-0" />
                                                                <span className="whitespace-normal leading-tight">{latestDisc}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-start">
                                                        <div className="p-1 rounded bg-slate-50 text-slate-400 mr-2 shrink-0 mt-0.5"><MessageCircle className="w-3 h-3" /></div>
                                                        <p className="text-[11px] text-slate-600 italic font-medium leading-relaxed group-hover:text-slate-900 transition-colors">{r.remark}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {analytics.sortedTimeline.length === 0 && (
                                    <tr><td colSpan={2} className="py-24 text-center"><div className="flex flex-col items-center opacity-10"><MessageSquare className="w-10 h-10 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No interactions recorded</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-tight shrink-0 h-[36px] select-none">
                        <div className="flex items-center space-x-2">
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                {analytics.sortedTimeline.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, analytics.sortedTimeline.length)} <span className="opacity-40 px-0.5">of</span> {analytics.sortedTimeline.length}
                            </span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                            <span className="min-w-[24px] text-center font-black text-slate-600 bg-white border border-slate-200 rounded py-0.5">{currentPage}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages || totalPages === 0} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
