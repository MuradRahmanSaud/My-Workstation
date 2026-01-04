
import React, { useMemo } from 'react';
import { X, MessageSquareQuote, Plus, CalendarDays, CalendarX, Pencil, Trash2, Info, ChevronDown, ChevronUp, ShieldAlert, CalendarX as CalendarXIcon, User, Loader2, Target, Tags, Banknote, Layers, Clock, CheckCircle2 } from 'lucide-react';
import { StudentFollowupRow, DiuEmployeeRow, TeacherDataRow } from '../../types';
import { normalizeId } from '../../services/sheetService';

interface StudentRemarksPanelProps {
    isOpen: boolean;
    onClose: () => void;
    historyRemarks: (StudentFollowupRow & { _index: number, _source?: string })[];
    onAddFollowup: () => void;
    onEditFollowup: (item: any) => void;
    onDeleteFollowup: (index: number, source?: string) => void;
    onSnoozeFollowup?: (item: any) => void;
    onClearSnoozeFollowup?: (item: any) => void;
    expandedRemarks: Set<string>;
    toggleRemarkExpansion: (uid: string) => void;
    formatDate: (d: string | undefined, includeTime?: boolean, includeSeconds?: boolean) => string;
    discStatus: { isActive: boolean; isExpired: boolean; message: string };
    discRecords: string[];
    isDiscHistoryOpen: boolean;
    toggleDiscHistory: () => void;
    onAddDisc: () => void;
    onEditDisc: (index: number) => void;
    onRemoveAllDisc: () => void;
    checkRecordExpiry: (r: string) => boolean;
    diuEmployeeData: DiuEmployeeRow[];
    teacherData: TeacherDataRow[];
    isSaving?: boolean;
    activeCategory?: string; 
}

export const StudentRemarksPanel: React.FC<StudentRemarksPanelProps> = React.memo((props) => {
    const { 
        isOpen, onClose, historyRemarks, onAddFollowup, onEditFollowup, onDeleteFollowup, onSnoozeFollowup, onClearSnoozeFollowup,
        expandedRemarks, toggleRemarkExpansion, formatDate, discStatus, discRecords,
        isDiscHistoryOpen, toggleDiscHistory, onAddDisc, onEditDisc, onRemoveAllDisc, checkRecordExpiry,
        diuEmployeeData, teacherData, isSaving = false, activeCategory
    } = props;

    const isDuesMode = activeCategory === 'Dues Follow up';

    const resolveEmployeeInfo = (id: string | undefined) => {
        if (!id || id === 'System') return { name: id || 'System', designation: '' };
        const normId = normalizeId(id);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) {
            const desig = [emp['Academic Designation'], emp['Administrative Designation']].filter(Boolean).join(' / ');
            return { name: emp['Employee Name'], designation: desig };
        }
        const teacher = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teacher) {
            return { name: teacher['Employee Name'], designation: teacher.Designation };
        }
        return { name: id, designation: '' };
    };

    const groupedDues = useMemo(() => {
        if (!isDuesMode) return [];
        const mainRecords = historyRemarks.filter(r => r._source === 'dues');
        const semWeight: Record<string, number> = { 'fall': 3, 'summer': 2, 'spring': 1 };
        const periodWeight: Record<string, number> = { 'final-term': 3, 'mid-term': 2, 'registration': 1 };

        const sortedMain = [...mainRecords].sort((a, b) => {
            const semA = a['Target Semester'] || '';
            const semB = b['Target Semester'] || '';
            const periodA = (a as any)['Exam Period'] || '';
            const periodB = (b as any)['Exam Period'] || '';
            const partsA = semA.split(' ');
            const partsB = semB.split(' ');
            const yearA = parseInt(partsA[1] || '0');
            const yearB = parseInt(partsB[1] || '0');
            if (yearA !== yearB) return yearB - yearA;
            const sWeightA = semWeight[partsA[0]?.toLowerCase()] || 0;
            const sWeightB = semWeight[partsB[0]?.toLowerCase()] || 0;
            if (sWeightA !== sWeightB) return sWeightB - sWeightA;
            const pWeightA = periodWeight[periodA.toLowerCase()] || 0;
            const pWeightB = periodWeight[periodB.toLowerCase()] || 0;
            return pWeightB - pWeightA;
        });
        
        return sortedMain.map(main => {
            const sem = main['Target Semester'] || '';
            const period = (main as any)['Exam Period'] || '';
            const history = historyRemarks.filter(r => 
                r._source === 'discussion' && 
                r['Target Semester'] === sem && 
                (r as any)['Exam Period'] === period
            ).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            let latestSnooze = '';
            if ((main as any).DoneStatus === 'DONE') {
                latestSnooze = 'DONE';
            } else if (history.length > 0) {
                const latest = history[0];
                if (latest.Status === 'Snoozed') {
                    latestSnooze = latest['Re-follow up'];
                }
            }
            return { main, history, latestSnooze };
        });
    }, [historyRemarks, isDuesMode]);

    return (
        <div className={`absolute inset-0 z-[100] bg-white flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full'}`}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[40] px-3 py-2 border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center min-w-0">
                    {isDuesMode ? (
                        <Banknote className="w-3.5 h-3.5 mr-2 text-amber-600 shrink-0" />
                    ) : (
                        <MessageSquareQuote className="w-3.5 h-3.5 mr-2 text-blue-600 shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0">
                        <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isDuesMode ? 'text-amber-700' : 'text-slate-700'}`}>
                            {activeCategory ? `${activeCategory}` : 'Remarks & History'}
                        </h4>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{historyRemarks.length} Records</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {discRecords.length === 0 && !activeCategory && (
                        <button onClick={onAddDisc} className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700 transition-colors">
                            <Plus className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">Add Disciplinary</span>
                        </button>
                    )}
                    <button 
                        onClick={onAddFollowup} 
                        className={`flex items-center space-x-1 px-2 py-1 rounded-md border shadow-sm transition-colors ${isDuesMode ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700' : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'}`}
                    >
                        <Plus className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase">{isDuesMode ? 'Add Dues Record' : 'Add Follow-up'}</span>
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 ml-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                {discStatus.isActive && !activeCategory && (
                    <div className="space-y-1.5">
                        <div className={`border rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${isDiscHistoryOpen ? 'bg-red-100 border-red-300 ring-2 ring-red-500/10' : (discStatus.isExpired ? 'bg-yellow-100 border-yellow-200' : 'bg-red-50 border-red-200')}`} onClick={toggleDiscHistory}>
                            <div className={`flex items-center justify-between mb-1.5 ${discStatus.isExpired ? 'text-yellow-700' : 'text-red-700'}`}>
                                <div className="flex items-center space-x-2"><ShieldAlert className="w-4 h-4" /><h4 className="text-[11px] font-black uppercase tracking-wider">Disciplinary Status</h4></div>
                                <div className="flex items-center space-x-2"><button onClick={(e) => { e.stopPropagation(); onAddDisc(); }} className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mr-1 shadow-sm"><Plus className="w-3 h-3" /></button><span className="text-[8px] font-bold bg-white/60 px-1 py-0.5 rounded border border-current opacity-60">{discRecords.length} LOGS</span>{isDiscHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</div>
                            </div>
                            <p className={`text-[11px] leading-relaxed font-bold italic ${discStatus.isExpired ? 'text-yellow-800' : 'text-red-600'}`}>{discStatus.message}</p>
                        </div>
                        {isDiscHistoryOpen && (
                            <div className="bg-red-50/30 rounded-lg border border-red-200 p-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                {discRecords.slice().reverse().map((record, idx) => {
                                    const actualIdx = discRecords.length - 1 - idx; const isExpired = checkRecordExpiry(record);
                                    return (
                                        <div key={actualIdx} className={`rounded-md border p-2.5 flex items-start justify-between shadow-sm transition-all ${isExpired ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-red-100'}`}>
                                            <div className="flex-1 min-w-0 mr-3">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    {actualIdx === discRecords.length - 1 && <span className={`${isExpired ? 'bg-yellow-600' : 'bg-red-600'} text-white text-[7px] font-black px-1 py-0.5 rounded tracking-widest shadow-sm`}>CURRENT</span>}
                                                    {isExpired && <span className="bg-yellow-100 text-yellow-800 text-[7px] font-black px-1 py-0.5 rounded border border-yellow-300 flex items-center"><CalendarXIcon className="w-2.5 h-2.5 mr-0.5" /> EXPIRED</span>}
                                                    <span className={`text-[9px] font-bold uppercase tracking-tight ${isExpired ? 'text-yellow-600' : 'text-red-300'}`}>Record #{actualIdx + 1}</span>
                                                </div>
                                                <p className={`text-[10px] md:text-[11px] font-bold italic leading-relaxed ${isExpired ? 'text-yellow-900' : 'text-red-900'}`}>{record}</p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); onEditDisc(actualIdx); }} className={`p-1.5 rounded-md transition-colors ${isExpired ? 'text-yellow-600 hover:bg-yellow-100' : 'text-red-500 hover:bg-red-50'}`}><Pencil className="w-3 h-3" /></button>
                                        </div>
                                    );
                                })}
                                <button onClick={onRemoveAllDisc} className="w-full py-1 text-[8px] font-black text-red-400 hover:text-red-600 transition-colors uppercase border border-dashed border-red-200 rounded mt-1">Clear All Records</button>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2 pt-1">
                    <div className="flex items-center px-1 mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {isDuesMode ? 'Dues History Table' : activeCategory ? 'History' : 'Conversation Timeline'}
                        </span>
                        <div className="h-px bg-slate-100 flex-1 ml-3"></div>
                    </div>
                    
                    {isDuesMode ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto thin-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[350px]">
                                <thead className="bg-slate-800 text-white">
                                    <tr>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase tracking-wider">Semester & Period</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center w-24">Dues (BDT)</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center w-28">Latest Snooze</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {groupedDues.length > 0 ? (
                                        groupedDues.map(({ main, history, latestSnooze }) => {
                                            const uid = main.uniqueid || `dues-${main._index}`;
                                            const isExpanded = expandedRemarks.has(uid);
                                            const { name } = resolveEmployeeInfo(main['Contacted By']);
                                            const semester = main['Target Semester'] || '-';
                                            const period = (main as any)['Exam Period'] || '';

                                            return (
                                                <React.Fragment key={uid}>
                                                    <tr 
                                                        onClick={() => toggleRemarkExpansion(uid)}
                                                        className={`hover:bg-amber-50/40 transition-colors cursor-pointer group h-[34px] ${isExpanded ? 'bg-amber-50/50' : ''}`}
                                                    >
                                                        <td className="px-3 py-1.5 flex items-center space-x-2">
                                                            <div className={`p-1 rounded bg-amber-100 text-amber-700 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                                <ChevronRight className="w-2.5 h-2.5" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[10px] font-black text-slate-800 tracking-tight truncate">
                                                                    {semester} {period && <span className="text-slate-400 font-bold ml-1">({period})</span>}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center text-[10px] font-black text-red-600 tabular-nums">
                                                            {main.Status.replace('BDT ', '')}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            {latestSnooze === 'DONE' ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-black text-emerald-700 uppercase border border-emerald-100 shadow-sm">
                                                                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                                    Done
                                                                </span>
                                                            ) : latestSnooze ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-[8px] font-black text-indigo-700 uppercase border border-indigo-100">
                                                                    <Clock className="w-2 h-2 mr-1" />
                                                                    {formatDate(latestSnooze, false)}
                                                                </span>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={3} className="px-3 py-3 bg-slate-50 shadow-inner">
                                                                <div className="flex flex-col space-y-3">
                                                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1">
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                                                                            <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Main Record</span>
                                                                            <span className="text-[8px] font-bold text-slate-400">• {formatDate(main.Date, true)}</span>
                                                                            <span className="text-[8px] font-bold text-slate-400">• By: {name}</span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed px-1">{main.Remark}</p>

                                                                    {/* Actions */}
                                                                    <div className="flex items-center space-x-1.5 px-1 py-1">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSnoozeFollowup?.(main); }}
                                                                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm" 
                                                                            title="Snooze Dues"
                                                                        >
                                                                            <Clock className="w-3 h-3" />
                                                                            <span className="text-[9px] font-black uppercase tracking-tight">Snooze</span>
                                                                        </button>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClearSnoozeFollowup?.(main); }}
                                                                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm" 
                                                                            title="Mark as Done"
                                                                        >
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                            <span className="text-[9px] font-black uppercase tracking-tight">Done</span>
                                                                        </button>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditFollowup(main); }}
                                                                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                                                                            title="Edit Record"
                                                                        >
                                                                            <Pencil className="w-3 h-3" />
                                                                            <span className="text-[9px] font-black uppercase tracking-tight">Edit</span>
                                                                        </button>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteFollowup(main._index, 'dues'); }}
                                                                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
                                                                            title="Delete Record"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                            <span className="text-[9px] font-black uppercase tracking-tight">Delete</span>
                                                                        </button>
                                                                    </div>

                                                                    {/* History Log */}
                                                                    {history.length > 0 && (
                                                                        <div className="space-y-2 pt-2 border-t border-slate-200/50">
                                                                            <div className="flex items-center space-x-2 px-1">
                                                                                <Clock className="w-3 h-3 text-indigo-500" />
                                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">History Log</span>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                {history.map((h, hIdx) => {
                                                                                    const hUid = h.uniqueid || `h-${hIdx}`;
                                                                                    return (
                                                                                        <div key={hUid} className="bg-white p-2 rounded border border-slate-200 shadow-sm relative group/h">
                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                <div className="flex items-center space-x-2">
                                                                                                    <Clock className="w-3 h-3 text-indigo-300" />
                                                                                                    <span className="text-[9px] font-bold text-slate-400">{formatDate(h.Date, true)}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center space-x-1 opacity-0 group-hover/h:opacity-100 transition-all">
                                                                                                    <button 
                                                                                                        onClick={(e) => { e.stopPropagation(); onEditFollowup(h); }}
                                                                                                        className="p-0.5 text-blue-400 hover:text-blue-600 transition-colors"
                                                                                                    >
                                                                                                        <Pencil className="w-2.5 h-2.5" />
                                                                                                    </button>
                                                                                                    <button 
                                                                                                        onClick={(e) => { e.stopPropagation(); onDeleteFollowup(h._index, 'discussion'); }}
                                                                                                        className="p-0.5 text-red-300 hover:text-red-500 transition-colors"
                                                                                                    >
                                                                                                        <Trash2 className="w-2.5 h-2.5" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                            <p className="text-[11px] text-slate-600 leading-relaxed pl-1 border-l border-slate-100">{h.Remark}</p>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan={3} className="py-12 text-center text-slate-300"><div className="flex flex-col items-center"><Banknote className="w-8 h-8 mb-2 opacity-20" /><span className="text-[10px] font-bold uppercase tracking-widest">No Dues Records Found</span></div></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        historyRemarks.length > 0 ? (
                            historyRemarks.map((item) => {
                                const uid = item.uniqueid || `remark-${item._index}`; 
                                const { name, designation } = resolveEmployeeInfo(item['Contacted By']);
                                const statusStr = item.Status || ''; 
                                const match = statusStr.match(/^(.+?)\s*\((.+?)\)$/); 
                                const responseStatus = match ? match[1] : (statusStr || 'Log'); 
                                const dropType = match ? match[2] : null; 
                                const isExpanded = expandedRemarks.has(uid);
                                const targetSemester = item['Target Semester'];
                                const category = item.Category;

                                return (
                                    <div key={uid} className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm transition-all group relative hover:shadow-md hover:border-blue-100 border-l-4 border-l-transparent">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col min-h-[34px]">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="p-1 rounded transition-colors bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"><CalendarDays className="w-3 h-3" /></div>
                                                        <span className="text-[10px] font-black text-slate-800 tracking-tight">{formatDate(item.Date, true, false)}</span>
                                                    </div>
                                                    {item['Re-follow up'] && (<div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[8px] font-bold text-emerald-700 uppercase tracking-tighter shadow-sm"><CalendarX className="w-2.5 h-2.5 mr-1 text-emerald-500" />Next: {formatDate(item['Re-follow up'], false)}</div>)}
                                                    {!activeCategory && category && (<div className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter shadow-sm border bg-slate-100 border-slate-200 text-slate-500"><Tags className="w-2.5 h-2.5 mr-1" />{category}</div>)}
                                                </div>
                                                <div className="mt-1 pl-7 flex items-center flex-wrap gap-x-2">
                                                    <div className="flex items-center text-[10px] font-bold tracking-tight text-blue-600"><User className="w-2.5 h-2.5 mr-1 opacity-60" />{name}</div>
                                                    {designation && <><span className="text-[8px] text-slate-300 font-black leading-none">•</span><div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter leading-none">{designation}</div></>}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 shrink-0 ml-2">{targetSemester && (<div className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm bg-blue-600 text-white"><Target className="w-2.5 h-2.5 mr-1" />{targetSemester}</div>)}</div>
                                        </div>
                                        <div className="relative pl-3 mb-1 cursor-pointer select-none mt-1" onClick={() => toggleRemarkExpansion(uid)}><div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${dropType ? 'bg-orange-400' : 'bg-blue-400'}`}></div><p className={`text-[11px] text-slate-700 font-medium leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{item.Remark}</p></div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center">{responseStatus && (<div className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm border bg-blue-50 border-blue-100 text-blue-700"><Info className="w-2.5 h-2.5 mr-1 opacity-60" />{responseStatus}</div>)}</div>
                                            <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => onEditFollowup(item)} className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded" title="Edit Record"><Pencil className="w-3 h-3" /></button>
                                                <button onClick={() => onDeleteFollowup(item._index, 'discussion')} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded" title="Delete Log">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center opacity-40"><MessageSquareQuote className="w-10 h-10 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-center">No records in this category</p></div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
});

const ChevronRight = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"/>
    </svg>
);
