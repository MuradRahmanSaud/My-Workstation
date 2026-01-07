import React, { useMemo } from 'react';
import { X, MessageSquareQuote, Plus, CalendarDays, CalendarX, Pencil, Trash2, Info, ChevronDown, ChevronUp, ShieldAlert, CalendarX as CalendarXIcon, User, Loader2, Target, Tags, Banknote, Layers, Clock, CheckCircle2, ChevronRight, History } from 'lucide-react';
import { StudentFollowupRow, DiuEmployeeRow, TeacherDataRow } from '../../types';
import { normalizeId } from '../../services/sheetService';

interface StudentRemarksPanelProps {
    isOpen: boolean;
    onClose: () => void;
    historyRemarks: (StudentFollowupRow & { _index: number, _source?: string, SemanticStatus?: string })[];
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
    regHistory?: any[]; 
}

/**
 * Normalizes semester strings for robust comparison.
 */
export const normalizeSemesterName = (sem: string | undefined): string => {
    if (!sem) return '';
    let s = String(sem).trim().toLowerCase();
    
    // Handle 'YY shorthand (e.g., Spring '24 -> spring 2024)
    s = s.replace(/'(\d{2})/, (_, yy) => ` 20${yy}`);
    
    // Insert space between letters and numbers if missing (e.g. Fall2025 -> fall 2025)
    s = s.replace(/([a-z]+)(\d+)/i, '$1 $2');
    
    // Normalize all types of separators/whitespace to a single space
    s = s.replace(/[\s\-_]+/, ' ').trim();
    
    return s;
};

export const StudentRemarksPanel: React.FC<StudentRemarksPanelProps> = React.memo((props) => {
    const { 
        isOpen, onClose, historyRemarks, onAddFollowup, onEditFollowup, onDeleteFollowup, onSnoozeFollowup, onClearSnoozeFollowup,
        expandedRemarks, toggleRemarkExpansion, formatDate, discStatus, discRecords,
        isDiscHistoryOpen, toggleDiscHistory, onAddDisc, onEditDisc, onRemoveAllDisc, checkRecordExpiry,
        diuEmployeeData, teacherData, isSaving = false, activeCategory, regHistory
    } = props;

    const isDuesMode = activeCategory === 'Dues Follow up';
    const isRegMode = activeCategory === 'Registration Follow up';

    const resolveEmployeeInfo = (id: string | undefined) => {
        if (!id || id === 'System') return { name: id || 'System', designation: '' };
        const normId = normalizeId(id);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) {
            const desig = [emp['Academic Designation'], emp['Administrative Designation']].filter(Boolean).join(' / ');
            return { name: emp['Employee Name'], designation: desig };
        }
        const teacher = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teacher) return { name: teacher['Employee Name'], designation: teacher.Designation };
        return { name: id, designation: '' };
    };

    const groupedDues = useMemo(() => {
        if (!isDuesMode) return [];
        const mainRecords = historyRemarks.filter(r => r._source === 'dues');
        const semWeight: Record<string, number> = { 'fall': 3, 'summer': 2, 'spring': 1 };
        const periodWeight: Record<string, number> = { 'final-term': 3, 'mid-term': 2, 'registration': 1 };

        const sortedMain = [...mainRecords].sort((a, b) => {
            const semA = a['Target Semester'] || '', semB = b['Target Semester'] || '';
            const periodA = (a as any)['Exam Period'] || '', periodB = (b as any)['Exam Period'] || '';
            const partsA = semA.split(' ');
            const partsB = semB.split(' ');
            const yearA = parseInt(partsA[1] || '0'), yearB = parseInt(partsB[1] || '0');
            if (yearA !== yearB) return yearB - yearA;
            const sWeightA = semWeight[partsA[0]?.toLowerCase()] || 0, sWeightB = semWeight[partsB[0]?.toLowerCase()] || 0;
            if (sWeightA !== sWeightB) return sWeightB - sWeightA;
            const pWeightA = periodWeight[periodA.toLowerCase()] || 0, pWeightB = periodWeight[periodB.toLowerCase()] || 0;
            return pWeightB - pWeightA;
        });
        
        return sortedMain.map(main => {
            const semNormal = normalizeSemesterName(main['Target Semester']);
            const period = (main as any)['Exam Period'] || '';
            const history = historyRemarks.filter(r => 
                r._source === 'discussion' && 
                (r.Category?.trim().toLowerCase() === 'dues follow up') &&
                normalizeSemesterName(r['Target Semester']) === semNormal && 
                (r as any)['Exam Period'] === period
            ).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            
            let latestSnooze = '';
            if ((main as any).DoneStatus === 'DONE') {
                latestSnooze = 'DONE';
            } else if (history.length > 0) {
                // Check semantic status for snooze tracking
                const activeSnooze = history.find(h => h.SemanticStatus === 'Pending' && h['Re-follow up']);
                if (activeSnooze) {
                    latestSnooze = activeSnooze['Re-follow up'];
                }
            }
            return { main, history, latestSnooze };
        });
    }, [historyRemarks, isDuesMode]);

    const groupedRegistration = useMemo(() => {
        if (!isRegMode || !regHistory) return [];
        
        return regHistory.map(hist => {
            const semNormal = normalizeSemesterName(hist.semester);
            const remarksForSem = historyRemarks.filter(r => {
                const targetSemNormal = normalizeSemesterName(r['Target Semester']);
                const isRegCategory = r.Category?.trim().toLowerCase() === 'registration follow up';
                return targetSemNormal === semNormal && isRegCategory;
            }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            
            const main = remarksForSem.length > 0 ? remarksForSem[0] : {
                Date: '',
                Status: hist.isRegistered ? 'Registered' : 'Unregistered',
                'Contacted By': 'System',
                'Re-follow up': '',
                'Target Semester': hist.semester,
                Remark: hist.isRegistered ? 'Student registered for this session.' : 'No registration found for this session.',
                Category: 'Registration Follow up',
                'Exam Period': 'Registration',
                SemanticStatus: hist.isRegistered ? 'Done' : 'Pending',
                _index: -1,
                _source: 'history'
            } as any;

            let latestSnooze = '';
            // Check index 8 (SemanticStatus) for pending follow-ups
            const activeSnooze = remarksForSem.find(r => r['Re-follow up'] && r.SemanticStatus === 'Pending');
            
            if (activeSnooze) {
                latestSnooze = activeSnooze['Re-follow up'];
            } else if (remarksForSem.length > 0 && remarksForSem[0].SemanticStatus === 'Done') {
                latestSnooze = 'DONE';
            }

            return { main, history: remarksForSem, latestSnooze, semester: hist.semester };
        });
    }, [historyRemarks, isRegMode, regHistory]);

    return (
        <div className={`absolute inset-0 z-[100] bg-white flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full'}`}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[40] px-3 py-2 border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center min-w-0">
                    {isDuesMode ? <Banknote className="w-3.5 h-3.5 mr-2 text-amber-600 shrink-0" /> : isRegMode ? <Target className="w-3.5 h-3.5 mr-2 text-rose-600 shrink-0" /> : <MessageSquareQuote className="w-3.5 h-3.5 mr-2 text-blue-600 shrink-0" />}
                    <div className="flex flex-col min-w-0">
                        <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isDuesMode ? 'text-amber-700' : isRegMode ? 'text-rose-700' : 'text-slate-700'}`}>
                            {activeCategory ? `${activeCategory}` : 'Remarks & History'}
                        </h4>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{isRegMode ? groupedRegistration.length : historyRemarks.length} Sessions</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {!isRegMode && (
                        <button onClick={onAddFollowup} className={`flex items-center space-x-1 px-2 py-1 rounded-md border shadow-sm transition-colors ${isDuesMode ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700' : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'}`}>
                            <Plus className="w-3" />
                            <span className="text-[9px] font-bold uppercase">{isDuesMode ? 'Add Dues' : 'Add Follow-up'}</span>
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 ml-1"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                <div className="space-y-2 pt-1">
                    {(isDuesMode || isRegMode) ? (
                        <div className={`bg-white rounded-xl border ${isDuesMode ? 'border-amber-200' : 'border-rose-200'} shadow-sm overflow-hidden overflow-x-auto thin-scrollbar`}>
                            <table className="w-full text-left border-collapse min-w-[350px]">
                                <thead className={`${isDuesMode ? 'bg-amber-700' : 'bg-rose-700'} text-white`}>
                                    <tr>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase tracking-wider">Academic Session</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center">Status</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center w-28">Latest Snooze</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(isDuesMode ? groupedDues : groupedRegistration).map(({ main, history, latestSnooze, semester }) => {
                                        const displaySem = isDuesMode ? (main['Target Semester'] || '-') : semester;
                                        const period = isDuesMode ? (main as any)['Exam Period'] : (main as any)['Exam Period'] || 'Registration';
                                        
                                        const rowUid = `${isRegMode ? 'reg' : 'dues'}-${normalizeSemesterName(displaySem)}-${normalizeSemesterName(period)}`;
                                        const isExpanded = expandedRemarks.has(rowUid);
                                        // Status text is the Response Status (e.g. Call Busy, BDT XXX)
                                        const statusText = isDuesMode ? main.Status.replace('BDT ', '') : main.Status;
                                        const accentClass = isDuesMode ? 'amber' : 'rose';

                                        return (
                                            <React.Fragment key={rowUid}>
                                                <tr onClick={() => toggleRemarkExpansion(rowUid)} className={`hover:bg-${accentClass}-50/40 transition-colors cursor-pointer group h-[34px] ${isExpanded ? `bg-${accentClass}-50/50` : ''}`}>
                                                    <td className="px-3 py-1.5 flex items-center space-x-2">
                                                        <div className={`p-1 rounded bg-${accentClass}-100 text-${accentClass}-700 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                            <ChevronRight className="w-2.5 h-2.5" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] font-black text-slate-800 tracking-tight truncate">
                                                                {displaySem} {period && <span className="text-slate-400 font-bold ml-1">({period})</span>}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-2 py-1.5 text-center text-[10px] font-black ${isDuesMode ? 'text-red-600' : (main.SemanticStatus === 'Done' && statusText === 'Registered' ? 'text-emerald-600' : 'text-rose-600')} tabular-nums`}>{statusText}</td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        {latestSnooze === 'DONE' ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-black text-emerald-700 uppercase border border-emerald-100 shadow-sm">
                                                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                                Done
                                                            </span>
                                                        ) : latestSnooze ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-[8px] font-black text-amber-700 uppercase border border-amber-100 shadow-sm" title={`Snooze Until: ${formatDate(latestSnooze, false)}`}>
                                                                <Clock className="w-2.5 h-2.5 mr-1 text-amber-500" />
                                                                Pending
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={3} className="px-3 py-3 bg-slate-50 shadow-inner">
                                                            <div className="flex flex-col space-y-3">
                                                                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className={`w-1.5 h-1.5 bg-${accentClass}-400 rounded-full`}></div>
                                                                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Follow-up Controls</span>
                                                                        {main.Date && <span className="text-[8px] font-bold text-slate-400">• Latest: {formatDate(main.Date, true)}</span>}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center space-x-1.5 px-1 py-1">
                                                                    <button onClick={(e) => { e.stopPropagation(); onSnoozeFollowup?.(main); }} className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm font-black text-[9px] uppercase tracking-tight">
                                                                        <Clock className="w-3 h-3" />
                                                                        <span>Add Snooze</span>
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); onClearSnoozeFollowup?.(main); }} className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm font-black text-[9px] uppercase tracking-tight">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span>Mark Done</span>
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-2 pt-2 border-t border-slate-200/50">
                                                                    <div className="flex items-center space-x-2 px-1">
                                                                        <History className="w-3 h-3 text-indigo-500" />
                                                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">History Log (Semester Wise)</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        {history.length > 0 ? history.map((h, hIdx) => { 
                                                                            const hUid = h.uniqueid || `h-${hIdx}`;
                                                                            const { name: hName } = resolveEmployeeInfo(h['Contacted By']); 
                                                                            const isPendingStatus = h.SemanticStatus === 'Pending';
                                                                            const isDoneStatus = h.SemanticStatus === 'Done';
                                                                            return (
                                                                                <div key={hUid} className={`p-2 rounded border shadow-sm relative group/h bg-white transition-all ${isPendingStatus ? 'border-amber-200 ring-1 ring-amber-50' : isDoneStatus ? 'border-emerald-200' : 'border-slate-200'}`}>
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <div className="flex items-center space-x-1.5">
                                                                                            <Clock className="w-3 h-3 text-slate-300" />
                                                                                            <span className="text-[9px] font-bold text-slate-400">{formatDate(h.Date, true)}</span>
                                                                                            
                                                                                            {/* Response Status Badge */}
                                                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border transition-colors ${isPendingStatus ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                                                                {h.Status}
                                                                                            </span>

                                                                                            {/* Semantic Status Badge */}
                                                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${isDoneStatus ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                                                                {h.SemanticStatus || 'Pending'}
                                                                                            </span>

                                                                                            {hName && hName !== 'System' && <span className="text-[8px] font-bold text-indigo-500 flex items-center"><User className="w-2 h-2 mr-1" />{hName}</span>}
                                                                                        </div>
                                                                                        <div className="flex items-center space-x-1 opacity-0 group-hover/h:opacity-100 transition-all">
                                                                                            <button onClick={(e) => { e.stopPropagation(); onEditFollowup(h); }} className="p-0.5 text-blue-400 hover:text-blue-600 transition-colors"><Pencil className="w-2.5 h-2.5" /></button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); onDeleteFollowup(h._index, 'discussion'); }} className="p-0.5 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                    <p className="text-[11px] leading-relaxed pl-1 border-l-2 text-slate-600 border-slate-100 font-medium italic">{h.Remark}</p>
                                                                                    {h['Re-follow up'] && <div className={`mt-1 text-[8px] font-black uppercase flex items-center px-1 ${isPendingStatus ? 'text-indigo-600' : 'text-slate-400'}`}><CalendarXIcon className="w-2 h-2 mr-1" />Snooze Until: {formatDate(h['Re-follow up'], false)}</div>}
                                                                                </div>
                                                                            ); 
                                                                        }) : (
                                                                            <div className="p-4 text-center border border-dashed border-slate-200 rounded text-[9px] font-bold text-slate-300 uppercase tracking-widest">No interactions logged for this semester</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        historyRemarks.length > 0 ? (
                            historyRemarks.map((item) => {
                                const uid = item.uniqueid || `remark-${item._index}`, isExpanded = expandedRemarks.has(uid);
                                const { name, designation } = resolveEmployeeInfo(item['Contacted By']);
                                const responseStatus = item.Status || ''; 
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
                                                    {item['Re-follow up'] && (<div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[8px] font-bold text-emerald-700 uppercase tracking-tighter shadow-sm"><CalendarX className="w-2.5 h-2.5 mr-1 text-emerald-500" />Follow-up: {formatDate(item['Re-follow up'], false)}</div>)}
                                                    {!activeCategory && category && (<div className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter shadow-sm border bg-slate-100 border-slate-200 text-slate-500"><Tags className="w-2.5 h-2.5 mr-1" />{category}</div>)}
                                                </div>
                                                <div className="mt-1 pl-7 flex items-center flex-wrap gap-x-2">
                                                    <div className="flex items-center text-[10px] font-bold tracking-tight text-blue-600"><User className="w-2.5 h-2.5 mr-1 opacity-60" />{name}</div>
                                                    {designation && <><span className="text-[8px] text-slate-300 font-black leading-none">•</span><div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter leading-none">{designation}</div></>}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 shrink-0 ml-2">{targetSemester && (<div className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm bg-blue-600 text-white"><Target className="w-2.5 h-2.5 mr-1" />{targetSemester}</div>)}</div>
                                        </div>
                                        <div className="relative pl-3 mb-1 cursor-pointer select-none mt-1" onClick={() => toggleRemarkExpansion(uid)}>
                                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-blue-400`}></div>
                                            <p className={`text-[11px] text-slate-700 font-medium leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{item.Remark}</p>
                                        </div>
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