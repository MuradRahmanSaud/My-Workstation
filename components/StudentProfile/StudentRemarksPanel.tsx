
import React, { useMemo } from 'react';
import { X, MessageSquareQuote, Plus, CalendarDays, CalendarX, Pencil, Trash2, Info, ChevronDown, ChevronUp, ShieldAlert, CalendarX as CalendarXIcon, User, Loader2, Target, Tags, Banknote, Layers, Clock, CheckCircle2, ChevronRight, History, ShieldCheck, ShieldAlert as ShieldAlertIcon, AlertTriangle, ClipboardList, GraduationCap, FileText, BookmarkCheck } from 'lucide-react';
import { StudentFollowupRow, DiuEmployeeRow, TeacherDataRow } from '../../types';
import { normalizeId } from '../../services/sheetService';

interface StudentRemarksPanelProps {
    isOpen: boolean;
    onClose: () => void;
    historyRemarks: (StudentFollowupRow & { _index: number, _source?: string, SemanticStatus?: string })[];
    onAddFollowup: () => void;
    onEditFollowup: (item: any) => void;
    onDeleteFollowup: (index: number, source?: string) => void;
    onSnoozeFollowup?: (item: any, mode?: 'tracking' | 'snooze') => void;
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

export const normalizeSemesterName = (sem: string | undefined): string => {
    if (!sem) return '';
    let s = String(sem).trim().toLowerCase();
    s = s.replace(/'(\d{2})/, (_, yy) => ` 20${yy}`);
    s = s.replace(/([a-z]+)(\d+)/i, '$1 $2');
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
    const isDefenseMode = activeCategory === 'Defense Follow up';

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

    const duesDashboardData = useMemo(() => {
        if (!isDuesMode || !regHistory) return [];
        
        return regHistory.map(hist => {
            const semNormal = normalizeSemesterName(hist.semester);
            const periods = ['Registration', 'Mid-Term', 'Final-Term'];
            
            const periodData = periods.map(p => {
                const history = historyRemarks.filter(r => 
                    r.Category?.trim().toLowerCase() === 'dues follow up' &&
                    normalizeSemesterName(r['Target Semester']) === semNormal && 
                    ((r as any)['Exam Period'] || '').trim() === p
                ).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

                const mainRecord = history.length > 0 ? history[0] : null;

                let latestSnooze = '';
                if (mainRecord) {
                    if (mainRecord.SemanticStatus?.startsWith('Done')) {
                        latestSnooze = 'DONE';
                    } else if (mainRecord.SemanticStatus?.startsWith('Pending') && mainRecord['Re-follow up']) {
                        latestSnooze = mainRecord['Re-follow up'];
                    }
                }

                return { period: p, main: mainRecord, history, latestSnooze };
            });

            return { semester: hist.semester, periodData };
        });
    }, [historyRemarks, isDuesMode, regHistory]);

    const groupedRegistration = useMemo(() => {
        if (!isRegMode || !regHistory) return [];
        return regHistory.map(hist => {
            const semNormal = normalizeSemesterName(hist.semester);
            const remarksForSem = historyRemarks.filter(r => {
                const targetSemNormal = normalizeSemesterName(r['Target Semester']);
                const isRegCategory = r.Category?.trim().toLowerCase() === 'registration follow up';
                return targetSemNormal === semNormal && isRegCategory;
            }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            
            const main = remarksForSem.length > 0 ? remarksForSem[0] : { Date: '', Status: hist.isRegistered ? 'Registered' : 'Unregistered', 'Contacted By': 'System', 'Re-follow up': '', 'Target Semester': hist.semester, Remark: hist.isRegistered ? 'Student registered for this session.' : 'No registration found for this session.', Category: 'Registration Follow up', 'Exam Period': 'Registration', SemanticStatus: hist.isRegistered ? 'Done' : 'Pending', _index: -1, _source: 'history' } as any;
            let latestSnooze = '';
            const activeSnooze = remarksForSem.find(r => r['Re-follow up'] && r.SemanticStatus?.startsWith('Pending'));
            if (activeSnooze) latestSnooze = activeSnooze['Re-follow up'];
            else if (remarksForSem.length > 0 && remarksForSem[0].SemanticStatus?.startsWith('Done')) latestSnooze = 'DONE';
            return { main, history: remarksForSem, latestSnooze, semester: hist.semester };
        });
    }, [historyRemarks, isRegMode, regHistory]);

    return (
        <div className={`absolute inset-0 z-[100] bg-white flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full'}`}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[40] px-3 py-2 border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center min-w-0">
                    {isDuesMode ? <Banknote className="w-3.5 h-3.5 mr-2 text-amber-600 shrink-0" /> : isRegMode ? <Target className="w-3.5 h-3.5 mr-2 text-rose-600 shrink-0" /> : isDefenseMode ? <GraduationCap className="w-3.5 h-3.5 mr-2 text-indigo-600 shrink-0" /> : <MessageSquareQuote className="w-3.5 h-3.5 mr-2 text-blue-600 shrink-0" />}
                    <div className="flex flex-col min-w-0">
                        <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isDuesMode ? 'text-amber-700' : isRegMode ? 'text-rose-700' : isDefenseMode ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {activeCategory ? `${activeCategory}` : 'Remarks & History'}
                        </h4>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{isRegMode ? groupedRegistration.length : isDuesMode ? duesDashboardData.length : historyRemarks.length} Logs</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {(!isRegMode && !isDuesMode && !isDefenseMode) && (
                        <button onClick={onAddFollowup} className="flex items-center space-x-1 px-2 py-1 rounded-md border shadow-sm transition-colors bg-blue-600 text-white border-blue-700 hover:bg-blue-700">
                            <Plus className="w-3" />
                            <span className="text-[9px] font-bold uppercase">Add Follow-up</span>
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 ml-1"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                <div className="space-y-2 pt-1">
                    {isDuesMode ? (
                        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden overflow-x-auto thin-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[450px]">
                                <thead className="bg-amber-700 text-white">
                                    <tr>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase tracking-wider">Semester</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center">Registration</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center">Mid-Term</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center">Final Term</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {duesDashboardData.map(({ semester, periodData }) => (
                                        <React.Fragment key={semester}>
                                            <tr className="hover:bg-amber-50/40 transition-colors h-[34px]">
                                                <td className="px-3 py-1.5 text-[10px] font-black text-slate-800 tracking-tight">{semester}</td>
                                                {periodData.map(({ period, main, history, latestSnooze }) => {
                                                    const rowUid = `dues-${normalizeSemesterName(semester)}-${normalizeSemesterName(period)}`;
                                                    const isExpanded = expandedRemarks.has(rowUid);
                                                    const amountMatch = main ? main.Status.match(/\d+/) : null;
                                                    const amountText = amountMatch ? amountMatch[0] : '';
                                                    const effectiveMain = main || { 'Target Semester': semester, 'Exam Period': period, Category: 'Dues Follow up', _index: -1, _source: 'discussion', Status: 'BDT 0' };

                                                    return (
                                                        <td 
                                                            key={period} 
                                                            onClick={() => toggleRemarkExpansion(rowUid)}
                                                            className={`px-2 py-1.5 text-center cursor-pointer relative ${isExpanded ? 'bg-amber-50/50' : ''}`}
                                                        >
                                                            <div className="flex flex-col items-center">
                                                                {amountText ? (
                                                                    <>
                                                                        <span className={`text-[10px] font-black tabular-nums ${main ? 'text-red-600' : 'text-slate-300'}`}>{amountText}</span>
                                                                        {latestSnooze && latestSnooze !== 'DONE' && (
                                                                            <div className="w-1 h-1 bg-amber-500 rounded-full mt-0.5 animate-pulse"></div>
                                                                        )}
                                                                        {latestSnooze === 'DONE' && (
                                                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 mt-0.5" />
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); onSnoozeFollowup?.(effectiveMain, 'snooze'); }}
                                                                        className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all text-[8px] font-black uppercase tracking-tighter"
                                                                    >
                                                                        Add Dues
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {periodData.some(p => expandedRemarks.has(`dues-${normalizeSemesterName(semester)}-${normalizeSemesterName(p.period)}`)) && (
                                                <tr>
                                                    <td colSpan={4} className="px-0 py-0 bg-slate-50">
                                                        {periodData.map(({ period, main, history, latestSnooze }) => {
                                                            const rowUid = `dues-${normalizeSemesterName(semester)}-${normalizeSemesterName(period)}`;
                                                            if (!expandedRemarks.has(rowUid)) return null;

                                                            const effectiveMain = main || { 'Target Semester': semester, 'Exam Period': period, Category: 'Dues Follow up', _index: -1, _source: 'discussion', Status: 'BDT 0' };

                                                            return (
                                                                <div key={period} className="px-3 py-3 border-b border-slate-200 last:border-0 shadow-inner">
                                                                    <div className="flex flex-col space-y-3">
                                                                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1">
                                                                            <div className="flex items-center space-x-2">
                                                                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                                                                                <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{period} Follow-up Details</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2 pt-1">
                                                                            <div className="flex items-center space-x-2 px-1">
                                                                                <History className="w-3 h-3 text-indigo-500" />
                                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">History Log</span>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                {history.length > 0 ? history.map((h, hIdx) => { 
                                                                                    const hUid = h.uniqueid || `h-${hIdx}`;
                                                                                    const { name: hName, designation: hDesig } = resolveEmployeeInfo(h['Contacted By']); 
                                                                                    const isPendingStatus = h.SemanticStatus?.startsWith('Pending');
                                                                                    const isDoneStatus = h.SemanticStatus?.startsWith('Done');
                                                                                    const employeeId = h['Contacted By'];
                                                                                    const displayStatus = h.SemanticStatus?.includes(':') ? h.SemanticStatus.split(': ')[1] : h.Status;
                                                                                    const amountMatch = h.Status.match(/\d+/);
                                                                                    const amountText = amountMatch ? amountMatch[0] : '';

                                                                                    let overdueDays = 0;
                                                                                    if (h['Re-follow up'] && isPendingStatus) {
                                                                                        const snoozeDate = new Date(h['Re-follow up']);
                                                                                        const today = new Date();
                                                                                        today.setHours(0, 0, 0, 0);
                                                                                        if (snoozeDate < today) {
                                                                                            const diffTime = Math.abs(today.getTime() - snoozeDate.getTime());
                                                                                            overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                                        }
                                                                                    }

                                                                                    return (
                                                                                        <div key={hUid} className={`p-2 rounded border shadow-sm relative group/h bg-white transition-all ${isPendingStatus ? 'border-amber-200 ring-1 ring-amber-50' : isDoneStatus ? 'border-emerald-200' : 'border-slate-200'}`}>
                                                                                            <div className="flex items-center justify-between mb-1.5">
                                                                                                <div className="flex items-center min-w-0 flex-1">
                                                                                                    <div className="flex flex-col min-w-0">
                                                                                                        <div className="flex items-center space-x-1.5">
                                                                                                            <Clock className="w-3 h-3 text-slate-300" />
                                                                                                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{formatDate(h.Date, true)}</span>
                                                                                                            <div className="flex items-center space-x-1 opacity-0 group-hover/h:opacity-100 transition-all ml-1.5">
                                                                                                                <button onClick={(e) => { e.stopPropagation(); onEditFollowup(h); }} className="p-0.5 text-blue-400 hover:text-blue-600 transition-colors"><Pencil className="w-2.5 h-2.5" /></button>
                                                                                                                <button onClick={(e) => { e.stopPropagation(); onDeleteFollowup(h._index, 'discussion'); }} className="p-0.5 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        {hName && hName !== 'System' && (
                                                                                                            <div className="text-[8px] font-bold text-indigo-500 flex items-center mt-0.5 ml-4">
                                                                                                                <User className="w-2 h-2 mr-1 opacity-70 shrink-0" />
                                                                                                                <span className="truncate">{hName}{hDesig ? `, ${hDesig}` : ''} ({employeeId})</span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center space-x-1.5 shrink-0">
                                                                                                    {h['Re-follow up'] && (
                                                                                                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center border shadow-sm ${overdueDays > 0 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-indigo-600 border-indigo-100'}`}>
                                                                                                            <CalendarXIcon className={`w-2.5 h-2.5 mr-1 ${overdueDays > 0 ? 'text-red-500' : 'text-indigo-500'}`} />
                                                                                                            <span>Until: {formatDate(h['Re-follow up'], false)}</span>
                                                                                                            {overdueDays > 0 && (
                                                                                                                <span className="ml-1 px-1 rounded bg-red-600 text-white text-[7px] leading-tight">{overdueDays} Days Overdue</span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <p className="text-[11px] leading-relaxed pl-1 border-l-2 text-slate-600 border-slate-100 font-medium italic mb-2">{h.Remark}</p>
                                                                                            <div className="flex items-center justify-between">
                                                                                                <div className="flex items-center space-x-2">
                                                                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border bg-blue-50 text-blue-700 border-blue-200 whitespace-normal break-words" title={displayStatus}>{displayStatus}</span>
                                                                                                    {hIdx === 0 && (
                                                                                                        <div className="flex items-center space-x-1">
                                                                                                            <button onClick={(e) => { e.stopPropagation(); onSnoozeFollowup?.(effectiveMain, 'snooze'); }} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm font-black text-[8px] uppercase tracking-tight"><Clock className="w-2.5 h-2.5" /><span>Snooze</span></button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="flex items-center space-x-1.5">
                                                                                                    {amountText && (
                                                                                                        <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-inner">
                                                                                                            <Banknote className="w-2.5 h-2.5 text-amber-600" />
                                                                                                            <span className="text-[9px] font-black text-amber-800 tabular-nums">BDT {amountText}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    <button onClick={(e) => { e.stopPropagation(); if (!isDoneStatus) onClearSnoozeFollowup?.(effectiveMain); }} disabled={isDoneStatus} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center border shadow-sm transition-all ${isDoneStatus ? 'bg-emerald-600 text-white border-emerald-700 cursor-default' : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 active:scale-95 cursor-pointer'}`} title={isDoneStatus ? 'Task completed' : 'Mark as Done'}>{isDoneStatus ? <ShieldCheck className="w-2.5 h-2.5 mr-1" /> : <ShieldAlertIcon className="w-2.5 h-2.5 mr-1" />}{isDoneStatus ? 'Done' : 'Pending'}</button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ); 
                                                                                }) : (
                                                                                    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded space-y-3">
                                                                                        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center">No interactions logged for this semester</div>
                                                                                        <div className="flex items-center space-x-1.5">
                                                                                            <button onClick={(e) => { e.stopPropagation(); onSnoozeFollowup?.(effectiveMain, 'snooze'); }} className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm font-black text-[9px] uppercase tracking-tight"><Clock className="w-3 h-3" /><span>Add Snooze</span></button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); onClearSnoozeFollowup?.(effectiveMain); }} className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm font-black text-[9px] uppercase tracking-tight"><CheckCircle2 className="w-3.5 h-3.5" /><span>Mark Done</span></button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : isRegMode ? (
                        <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden overflow-x-auto thin-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[350px]">
                                <thead className="bg-rose-700 text-white">
                                    <tr>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase tracking-wider">Academic Session</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center">Status</th>
                                        <th className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center w-28">Latest Snooze</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {groupedRegistration.map(({ main, history, latestSnooze, semester }) => {
                                        const displaySem = semester;
                                        const period = (main as any)['Exam Period'] || 'Registration';
                                        const rowUid = `reg-${normalizeSemesterName(displaySem)}-${normalizeSemesterName(period)}`;
                                        const isExpanded = expandedRemarks.has(rowUid);
                                        const statusText = main.Status;

                                        return (
                                            <React.Fragment key={rowUid}>
                                                <tr onClick={() => toggleRemarkExpansion(rowUid)} className={`hover:bg-rose-50/40 transition-colors cursor-pointer group h-[34px] ${isExpanded ? 'bg-rose-50/50' : ''}`}>
                                                    <td className="px-3 py-1.5 flex items-center space-x-2">
                                                        <div className={`p-1 rounded bg-rose-100 text-rose-700 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                            <ChevronRight className="w-2.5 h-2.5" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-800 tracking-tight truncate">{displaySem}</span>
                                                    </td>
                                                    <td className={`px-2 py-1.5 text-center text-[10px] font-black ${main.SemanticStatus?.startsWith('Done') && statusText === 'Registered' ? 'text-emerald-600' : 'text-rose-600'}`}>{statusText}</td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        {latestSnooze === 'DONE' ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-black text-emerald-700 uppercase border border-emerald-100 shadow-sm"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Done</span>
                                                        ) : latestSnooze ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-[8px] font-black text-amber-700 uppercase border border-amber-100 shadow-sm"><Clock className="w-2.5 h-2.5 mr-1 text-amber-500" />Pending</span>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={3} className="px-3 py-3 bg-slate-50 shadow-inner">
                                                            <div className="flex flex-col space-y-3">
                                                                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className="w-1.5 h-1.5 bg-rose-400 rounded-full"></div>
                                                                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Follow-up Details</span>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2 pt-1">
                                                                    <div className="flex items-center space-x-2 px-1">
                                                                        <History className="w-3 h-3 text-indigo-500" />
                                                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">History Log</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        {history.length > 0 ? history.map((h, hIdx) => { 
                                                                            const hUid = h.uniqueid || `h-reg-${hIdx}`;
                                                                            const { name: hName, designation: hDesig } = resolveEmployeeInfo(h['Contacted By']); 
                                                                            const isPendingStatus = h.SemanticStatus?.startsWith('Pending');
                                                                            const isDoneStatus = h.SemanticStatus?.startsWith('Done');
                                                                            const employeeId = h['Contacted By'];
                                                                            const displayStatus = h.SemanticStatus?.includes(':') ? h.SemanticStatus.split(': ')[1] : h.Status;

                                                                            let overdueDays = 0;
                                                                            if (h['Re-follow up'] && isPendingStatus) {
                                                                                const snoozeDate = new Date(h['Re-follow up']);
                                                                                const today = new Date();
                                                                                today.setHours(0, 0, 0, 0);
                                                                                if (snoozeDate < today) {
                                                                                    const diffTime = Math.abs(today.getTime() - snoozeDate.getTime());
                                                                                    overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                                }
                                                                            }

                                                                            return (
                                                                                <div key={hUid} className={`p-2 rounded border shadow-sm relative group/h bg-white transition-all ${isPendingStatus ? 'border-amber-200 ring-1 ring-amber-50' : isDoneStatus ? 'border-emerald-200' : 'border-slate-200'}`}>
                                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                                        <div className="flex items-center min-w-0 flex-1">
                                                                                            <div className="flex flex-col min-w-0">
                                                                                                <div className="flex items-center space-x-1.5">
                                                                                                    <Clock className="w-3 h-3 text-slate-300" />
                                                                                                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{formatDate(h.Date, true)}</span>
                                                                                                    <div className="flex items-center space-x-1 opacity-0 group-hover/h:opacity-100 transition-all ml-1.5">
                                                                                                        <button onClick={(e) => { e.stopPropagation(); onEditFollowup(h); }} className="p-0.5 text-blue-400 hover:text-blue-600 transition-colors"><Pencil className="w-2.5 h-2.5" /></button>
                                                                                                        <button onClick={(e) => { e.stopPropagation(); onDeleteFollowup(h._index, 'discussion'); }} className="p-0.5 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                                                                                    </div>
                                                                                                </div>
                                                                                                {hName && hName !== 'System' && (
                                                                                                    <div className="text-[8px] font-bold text-indigo-500 flex items-center mt-0.5 ml-4">
                                                                                                        <User className="w-2 h-2 mr-1 opacity-70 shrink-0" />
                                                                                                        <span className="truncate">{hName}{hDesig ? `, ${hDesig}` : ''} ({employeeId})</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center space-x-1.5 shrink-0">
                                                                                            {h['Re-follow up'] && (
                                                                                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center border shadow-sm ${overdueDays > 0 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-indigo-600 border-indigo-100'}`}>
                                                                                                    <CalendarXIcon className={`w-2.5 h-2.5 mr-1 ${overdueDays > 0 ? 'text-red-500' : 'text-indigo-500'}`} />
                                                                                                    <span>Until: {formatDate(h['Re-follow up'], false)}</span>
                                                                                                    {overdueDays > 0 && (
                                                                                                        <span className="ml-1 px-1 rounded bg-red-600 text-white text-[7px] leading-tight">{overdueDays} Days Overdue</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <p className="text-[11px] leading-relaxed pl-1 border-l-2 text-slate-600 border-slate-100 font-medium italic mb-2">{h.Remark}</p>
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border bg-blue-50 text-blue-700 border-blue-200 whitespace-normal break-words" title={displayStatus}>{displayStatus}</span>
                                                                                            {hIdx === 0 && (
                                                                                                <div className="flex items-center space-x-1">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); onSnoozeFollowup?.(main, 'snooze'); }} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm font-black text-[8px] uppercase tracking-tight"><Clock className="w-2.5 h-2.5" /><span>Snooze</span></button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex items-center space-x-1.5">
                                                                                            <button onClick={(e) => { e.stopPropagation(); if (!isDoneStatus) onClearSnoozeFollowup?.(main); }} disabled={isDoneStatus} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center border shadow-sm transition-all ${isDoneStatus ? 'bg-emerald-600 text-white border-emerald-700 cursor-default' : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 active:scale-95 cursor-pointer'}`} title={isDoneStatus ? 'Task completed' : 'Mark as Done'}>{isDoneStatus ? <ShieldCheck className="w-2.5 h-2.5 mr-1" /> : <ShieldAlertIcon className="w-2.5 h-2.5 mr-1" />}{isDoneStatus ? 'Done' : 'Pending'}</button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ); 
                                                                        }) : (
                                                                            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded space-y-3">
                                                                                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center">No interactions logged for this semester</div>
                                                                                <div className="flex items-center space-x-1.5">
                                                                                    <button onClick={(e) => { e.stopPropagation(); onSnoozeFollowup?.(main, 'snooze'); }} className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm font-black text-[9px] uppercase tracking-tight">
                                                                                        <Clock className="w-3 h-3" />
                                                                                        <span>Add Snooze</span>
                                                                                    </button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); onClearSnoozeFollowup?.(main); }} className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm font-black text-[9px] uppercase tracking-tight">
                                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                                        <span>Mark Done</span>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
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
                    ) : isDefenseMode ? (
                        <div className="space-y-4">
                            {/* Summary / Metadata Display */}
                            <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gradient-to-br from-indigo-50/50 to-white">
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Defense Reg</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg"><ClipboardList className="w-4 h-4" /></div>
                                        <span className="text-[11px] font-black text-slate-800">
                                            {(() => {
                                                const ds = historyRemarks.find(r => r._source === 'packed-defense');
                                                return ds ? ds.Date : 'Not Started';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1 border-l border-slate-100 pl-4">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Current Phase</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><ShieldCheck className="w-4 h-4" /></div>
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">
                                            {(() => {
                                                const ds = historyRemarks.find(r => r._source === 'packed-defense');
                                                return ds ? ds.Status : 'Pending';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1 border-l border-slate-100 pl-4">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Supervisor</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><GraduationCap className="w-4 h-4" /></div>
                                        <span className="text-[11px] font-black text-slate-800 truncate max-w-[100px]">
                                            {(() => {
                                                const ds = historyRemarks.find(r => r._source === 'packed-defense');
                                                return ds ? resolveEmployeeInfo(ds['Contacted By']).name : '-';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1 border-l border-slate-100 pl-4">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Clearance</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><BookmarkCheck className="w-4 h-4" /></div>
                                        <span className="text-[11px] font-black text-slate-800">
                                            {(() => {
                                                const ds = historyRemarks.find(r => r._source === 'packed-defense');
                                                return ds ? (ds as any).LibraryClearance || 'Pending' : 'Pending';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* History Log Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1 border-b border-slate-100 pb-2">
                                    <div className="flex items-center space-x-2">
                                        <History className="w-3.5 h-3.5 text-indigo-500" />
                                        <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Defense Timeline Log</h5>
                                    </div>
                                    <button 
                                        onClick={() => onSnoozeFollowup?.(null, 'snooze')}
                                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-200 transition-all shadow-sm active:scale-95"
                                    >
                                        <Clock className="w-3 h-3" />
                                        <span>Add Snooze</span>
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    {historyRemarks.filter(r => r._source !== 'packed-defense').length > 0 ? historyRemarks.filter(r => r._source !== 'packed-defense').map((h, idx) => {
                                        const { name } = resolveEmployeeInfo(h['Contacted By']);
                                        const isLatest = idx === 0;
                                        return (
                                            <div key={idx} className={`bg-white rounded-lg border p-3 shadow-sm transition-all group relative border-l-4 ${isLatest ? 'border-l-indigo-500' : 'border-l-slate-200'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center space-x-2">
                                                            <Clock className="w-3 h-3 text-slate-300" />
                                                            <span className="text-[10px] font-bold text-slate-400">{formatDate(h.Date, true)}</span>
                                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase rounded tracking-tighter border border-indigo-100">{h.Status}</span>
                                                        </div>
                                                        <div className="mt-1 flex items-center text-[10px] font-bold text-slate-600">
                                                            <User className="w-3 h-3 mr-1 opacity-60" />
                                                            {name}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => onEditFollowup(h)} className="p-1 hover:bg-blue-50 text-blue-400 rounded"><Pencil className="w-3 h-3" /></button>
                                                        <button onClick={() => onDeleteFollowup(h._index, 'discussion')} className="p-1 hover:bg-red-50 text-red-400 rounded"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                                <div className="pl-3 relative">
                                                    <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-indigo-100 rounded-full"></div>
                                                    <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed">{h.Remark}</p>
                                                </div>
                                                {h['Re-follow up'] && (
                                                    <div className="mt-2 flex justify-end">
                                                        <div className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black rounded uppercase border border-amber-100 shadow-sm">
                                                            <CalendarX className="w-2.5 h-2.5 mr-1" />
                                                            Follow-up: {formatDate(h['Re-follow up'], false)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div className="py-12 flex flex-col items-center justify-center opacity-30 text-slate-400">
                                            <History className="w-10 h-10 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Timeline Empty</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center pt-2">
                                    <button 
                                        onClick={() => onSnoozeFollowup?.(null, 'tracking')}
                                        className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Update Defense Tracking</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        historyRemarks.length > 0 ? (
                            historyRemarks.map((item) => {
                                const uid = item.uniqueid || `remark-${item._index}`, isExpanded = expandedRemarks.has(uid);
                                const { name, designation } = resolveEmployeeInfo(item['Contacted By']);
                                const employeeId = item['Contacted By'];
                                
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
                                                </div>
                                                <div className="mt-1 pl-7 flex flex-col">
                                                    <div className="flex items-center text-[10px] font-bold tracking-tight text-blue-600">
                                                        <User className="w-2.5 h-2.5 mr-1 opacity-60" />
                                                        {name}
                                                        <span className="text-gray-400 font-normal ml-1">({employeeId})</span>
                                                    </div>
                                                    {designation && (
                                                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter leading-none mt-0.5 ml-3.5">
                                                            {designation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 shrink-0 ml-2">{item['Target Semester'] && (<div className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm bg-blue-600 text-white"><Target className="w-2.5 h-2.5 mr-1" />{item['Target Semester']}</div>)}</div>
                                        </div>
                                        <div className="relative pl-3 mb-1 cursor-pointer select-none mt-1" onClick={() => toggleRemarkExpansion(uid)}>
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-blue-400"></div>
                                            <p className={`text-[11px] text-slate-700 font-medium leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{item.Remark}</p>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center">{item.Status && (<div className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm border bg-blue-50 border-blue-100 text-blue-700"><Info className="w-2.5 h-2.5 mr-1 opacity-60" />{item.Status}</div>)}</div>
                                            <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => onEditFollowup(item)} className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded" title="Edit Record"><Pencil className="w-3 h-3" /></button>
                                                <button onClick={() => onDeleteFollowup(item._index, 'discussion')} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded" title="Delete Log">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center opacity-40"><MessageSquareQuote className="w-10 h-10 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-center">No records found</p></div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
});
