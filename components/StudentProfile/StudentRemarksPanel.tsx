
import React from 'react';
import { X, MessageSquareQuote, Plus, CalendarDays, CalendarX, Pencil, Trash2, Info, ChevronDown, ChevronUp, ShieldAlert, CalendarX as CalendarXIcon, User, Loader2, Target } from 'lucide-react';
import { StudentFollowupRow, DiuEmployeeRow, TeacherDataRow } from '../../types';
import { normalizeId } from '../../services/sheetService';

interface StudentRemarksPanelProps {
    isOpen: boolean;
    onClose: () => void;
    historyRemarks: (StudentFollowupRow & { _index: number })[];
    onAddFollowup: () => void;
    onEditFollowup: (item: any) => void;
    onDeleteFollowup: (index: number) => void;
    expandedRemarks: Set<string>;
    toggleRemarkExpansion: (uid: string) => void;
    formatDate: (d: string | undefined, includeTime?: boolean, includeSeconds?: boolean) => string;
    // Disciplinary props
    discStatus: { isActive: boolean; isExpired: boolean; message: string };
    discRecords: string[];
    isDiscHistoryOpen: boolean;
    toggleDiscHistory: () => void;
    onAddDisc: () => void;
    onEditDisc: (index: number) => void;
    onRemoveAllDisc: () => void;
    checkRecordExpiry: (r: string) => boolean;
    // Data for employee resolution
    diuEmployeeData: DiuEmployeeRow[];
    teacherData: TeacherDataRow[];
    isSaving?: boolean;
}

export const StudentRemarksPanel: React.FC<StudentRemarksPanelProps> = React.memo((props) => {
    const { 
        isOpen, onClose, historyRemarks, onAddFollowup, onEditFollowup, onDeleteFollowup,
        expandedRemarks, toggleRemarkExpansion, formatDate, discStatus, discRecords,
        isDiscHistoryOpen, toggleDiscHistory, onAddDisc, onEditDisc, onRemoveAllDisc, checkRecordExpiry,
        diuEmployeeData, teacherData, isSaving = false
    } = props;

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

    return (
        <div className={`absolute inset-0 z-[100] bg-white flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-y-0 shadow-2xl' : 'translate-y-full'}`}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[40] px-3 py-2 border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center">
                    <MessageSquareQuote className="w-3.5 h-3.5 mr-2 text-blue-600" />
                    <div className="flex flex-col">
                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Remarks & History</h4>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{historyRemarks.length} Follow-ups</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1.5">
                    {discRecords.length === 0 && (
                        <button onClick={onAddDisc} className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700 transition-colors">
                            <Plus className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">Add Disciplinary</span>
                        </button>
                    )}
                    <button onClick={onAddFollowup} className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-blue-600 text-white border-blue-700 shadow-sm hover:bg-blue-700 transition-colors">
                        <Plus className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase">Add Follow-up</span>
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 ml-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                {discStatus.isActive && (
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
                    <div className="flex items-center px-1 mb-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conversation Timeline</span><div className="h-px bg-slate-100 flex-1 ml-3"></div></div>
                    {historyRemarks.length > 0 ? (
                        historyRemarks.map((item) => {
                            const uid = item.uniqueid || `remark-${item._index}`; 
                            const { name, designation } = resolveEmployeeInfo(item['Contacted By']);
                            const statusStr = item.Status || ''; 
                            const match = statusStr.match(/^(.+?)\s*\((.+?)\)$/); 
                            const responseStatus = match ? match[1] : (statusStr || 'Contacted'); 
                            const dropType = match ? match[2] : null; 
                            const isExpanded = expandedRemarks.has(uid);
                            const targetSemester = (item as any)['Target Semester'];

                            return (
                                <div key={uid} className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm transition-all group relative hover:shadow-md hover:border-blue-100">
                                    {/* Header Section: Top Align */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col min-h-[34px]">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1 rounded bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><CalendarDays className="w-3 h-3" /></div>
                                                    <span className="text-[10px] font-black text-slate-800 tracking-tight">{formatDate(item.Date, true, false)}</span>
                                                </div>
                                                
                                                {item['Re-follow up'] && (
                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[8px] font-bold text-emerald-700 uppercase tracking-tighter shadow-sm">
                                                        <CalendarX className="w-2.5 h-2.5 mr-1 text-emerald-500" />
                                                        Next: {formatDate(item['Re-follow up'], false)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1 pl-7 flex items-center flex-wrap gap-x-2">
                                                <div className="flex items-center text-[10px] font-bold text-blue-600 tracking-tight">
                                                    <User className="w-2.5 h-2.5 mr-1 text-blue-400" />
                                                    {name}
                                                </div>
                                                {designation && (
                                                    <>
                                                        <span className="text-[8px] text-slate-300 font-black leading-none">•</span>
                                                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter leading-none">
                                                            {designation}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Target Semester Badge - Fixed at Top Right */}
                                        {targetSemester && (
                                            <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider shadow-sm shrink-0">
                                                <Target className="w-2.5 h-2.5 mr-1" />
                                                {targetSemester}
                                            </div>
                                        )}
                                    </div>

                                    {/* Body Section: Remark Content */}
                                    <div className="relative pl-3 mb-1 cursor-pointer select-none mt-1" onClick={() => toggleRemarkExpansion(uid)}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${dropType ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                                        <p className={`text-[11px] text-slate-700 font-medium leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{item.Remark}</p>
                                    </div>

                                    {/* Footer Section: Bottom Right Align for Action Buttons */}
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center">
                                            {responseStatus && (
                                                <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-700 uppercase tracking-tighter shadow-sm">
                                                    <Info className="w-2.5 h-2.5 mr-1 text-blue-500" />
                                                    {responseStatus}
                                                </div>
                                            )}
                                        </div>

                                        {/* Edit / Delete Buttons - Positioned at Bottom Right corner */}
                                        <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => onEditFollowup(item)} className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded" title="Edit Remark"><Pencil className="w-3 h-3" /></button>
                                            <button 
                                                onClick={() => onDeleteFollowup(item._index)} 
                                                className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded" 
                                                title="Delete Remark"
                                            >
                                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center opacity-40"><MessageSquareQuote className="w-10 h-10 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-center">No remarks recorded</p></div>
                    )}
                </div>
            </div>
        </div>
    );
});
