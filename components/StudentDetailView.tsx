import React, { useState, useMemo, useEffect } from 'react';
import { X, Pencil, Save, MessageSquareQuote, Plus, Clock, AlertTriangle, ShieldAlert, User, Mail, Phone, History, ChevronDown, ChevronUp, CalendarX, CheckCircle, Info, PowerOff, ShieldMinus, CalendarDays, UserCircle2 } from 'lucide-react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow, StudentFollowupRow } from '../types';
import { normalizeId, submitSheetData, extractSheetIdAndGid } from '../services/sheetService';
import { SearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { SHEET_NAMES, STUDENT_LINK_SHEET_ID } from '../constants';
import { useSheetData } from '../hooks/useSheetData';

// Sub-components
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentRegistrationHistory } from './StudentRegistrationHistory';
import { StudentDisciplinaryForm } from './StudentDisciplinaryForm';
import { StudentFollowupForm } from './StudentFollowupForm';

// Helper to format date
const formatDisplayDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; 
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
    } catch (e) { return dateStr; }
};

// Helper to convert to HTML5 date
const parseToIsoDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return ''; }
};

interface StudentDetailViewProps {
    student: StudentDataRow;
    program: ProgramDataRow;
    diuEmployeeData: DiuEmployeeRow[];
    teacherData: TeacherDataRow[];
    employeeOptions: string[];
    onSaveStudent: (semester: string, student: StudentDataRow) => Promise<void>;
    onClose: () => void;
    registrationLookup?: Map<string, Set<string>>;
    studentSemester?: string;
}

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
    student, program, diuEmployeeData, teacherData, employeeOptions, onSaveStudent, onClose, registrationLookup, studentSemester
}) => {
    const { studentFollowupData, setStudentFollowupData, reloadData } = useSheetData();
    const [isSaving, setIsSaving] = useState(false);
    
    // UI Popups State
    const [activePopup, setActivePopup] = useState<string | null>(null);
    const [isDiscFormOpen, setIsDiscFormOpen] = useState(false);
    const [isDiscHistoryOpen, setIsDiscHistoryOpen] = useState(false);
    const [showFollowupForm, setShowFollowupForm] = useState(false);
    const [showMentorDetails, setShowMentorDetails] = useState(false);
    
    // Track expanded remarks in history
    const [expandedRemarks, setExpandedRemarks] = useState<Set<string>>(new Set());
    
    // Disciplinary State
    const [discReason, setDiscReason] = useState('');
    const [discFromDate, setDiscFromDate] = useState('');
    const [discToDate, setDiscToDate] = useState('');
    const [editingDiscIndex, setEditingDiscIndex] = useState<number | null>(null);

    const [followupFormData, setFollowupFormData] = useState({
        Date: new Date().toISOString().split('T')[0],
        Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': ''
    });

    const closeAll = () => { 
        setActivePopup(null); 
        setIsDiscFormOpen(false); 
        setIsDiscHistoryOpen(false);
        setShowFollowupForm(false); 
        setShowMentorDetails(false); 
        setEditingDiscIndex(null);
    };

    const toggleRemarkExpansion = (uid: string) => {
        setExpandedRemarks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) newSet.delete(uid);
            else newSet.add(uid);
            return newSet;
        });
    };

    // Filtered Follow-up History
    const historyRemarks = useMemo(() => {
        const targetId = String(student['Student ID']).trim();
        return studentFollowupData
            .filter(f => String(f['Student ID']).trim() === targetId)
            .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [student, studentFollowupData]);

    // Discover Latest Drop Status
    const dropStatus = useMemo(() => {
        if (historyRemarks.length === 0) return null;
        
        const latestWithDrop = historyRemarks.find(r => r.Status?.includes('Drop'));
        if (!latestWithDrop) return null;
        
        if (latestWithDrop.Status.includes('Permanent Drop')) return { type: 'Permanent', label: 'P. Drop', color: 'text-red-600' };
        if (latestWithDrop.Status.includes('Temporary Drop')) return { type: 'Temporary', label: 'T. Drop', color: 'text-orange-500' };
        
        return null;
    }, [historyRemarks]);

    // Disciplinary Records Array (Parsed from Sheet using || delimiter)
    const discRecords = useMemo(() => {
        const raw = student['Disciplinary Action'];
        if (!raw || isValEmpty(raw)) return [];
        if (raw.includes('||')) return raw.split('||').map(r => r.trim()).filter(Boolean);
        return [raw.trim()];
    }, [student['Disciplinary Action']]);

    // Helper to check if a specific disciplinary record string is expired
    const checkRecordExpiry = (record: string) => {
        const toDateMatch = record.match(/to\s+([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
        if (toDateMatch) {
            const expiryDate = new Date(toDateMatch[1]);
            const today = new Date(); 
            today.setHours(0, 0, 0, 0);
            if (!isNaN(expiryDate.getTime()) && expiryDate < today) return true;
        }
        return false;
    };

    // Disciplinary Status Logic for Header Summary (Latest Entry)
    const discStatus = useMemo(() => {
        if (discRecords.length === 0) return { isActive: false, isExpired: false, message: 'No Disciplinary Action' };
        
        const lastAction = discRecords[discRecords.length - 1];
        const isExpired = checkRecordExpiry(lastAction);
        
        return { isActive: true, isExpired: isExpired, message: lastAction };
    }, [discRecords]);

    // Registration History Generator
    const historyData = useMemo(() => {
        if (!registrationLookup || !studentSemester) return [];
        const cleanId = String(student['Student ID']).trim();
        const registeredSems = registrationLookup.get(cleanId) || new Set();
        
        return Array.from(registeredSems).map(sem => ({
            semester: sem,
            isRegistered: true,
            taken: 15, complete: 15, sgpa: '3.75', dues: 0
        }));
    }, [student, registrationLookup, studentSemester]);

    const mentorInfo = useMemo(() => {
        if (!student?.Mentor) return null;
        const normId = normalizeId(student.Mentor);
        return diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId) || null;
    }, [student, diuEmployeeData]);

    // Actions for Disciplinary
    const handleAddDisc = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setDiscReason(''); 
        setDiscFromDate(new Date().toISOString().split('T')[0]); 
        setDiscToDate('');
        setEditingDiscIndex(null);
        setIsDiscFormOpen(true);
    };

    const handleEditDisc = (index: number) => {
        const record = discRecords[index];
        const rangeMatch = record.match(/(.+) from ([A-Z][a-z]{2} \d{1,2}, \d{4}) to ([A-Z][a-z]{2} \d{1,2}, \d{4})/);
        const permMatch = record.match(/([A-Z][a-z]{2} \d{1,2}, \d{4}) \(Permanent (.+)\)/);

        if (rangeMatch) {
            setDiscReason(rangeMatch[1].trim());
            setDiscFromDate(parseToIsoDate(rangeMatch[2]));
            setDiscToDate(parseToIsoDate(rangeMatch[3]));
        } else if (permMatch) {
            setDiscReason(permMatch[2].trim());
            setDiscFromDate(parseToIsoDate(permMatch[1]));
            setDiscToDate('');
        } else {
            setDiscReason(record);
            setDiscFromDate('');
            setDiscToDate('');
        }
        
        setEditingDiscIndex(index);
        setIsDiscFormOpen(true);
    };

    const handleRemoveDisc = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!studentSemester || !student['Disciplinary Action']) return;
        if (!window.confirm("Delete ALL disciplinary records for this student?")) return;
        setIsSaving(true);
        try {
            await onSaveStudent(studentSemester, { ...student, 'Disciplinary Action': '' } as StudentDataRow);
            setIsDiscHistoryOpen(false);
        } finally { setIsSaving(false); }
    };

    const handleSaveDisc = async () => {
        if (!studentSemester || !discReason || !discFromDate) return;
        
        const formattedFrom = formatDisplayDate(discFromDate);
        const formattedTo = discToDate ? formatDisplayDate(discToDate) : '';
        const formattedNewNotice = formattedTo 
            ? `${discReason} from ${formattedFrom} to ${formattedTo}` 
            : `${formattedFrom} (Permanent ${discReason})`;
        
        let finalNotice = '';
        if (editingDiscIndex !== null) {
            const updatedRecords = [...discRecords];
            updatedRecords[editingDiscIndex] = formattedNewNotice;
            finalNotice = updatedRecords.join(' || ');
        } else {
            finalNotice = discRecords.length > 0 
                ? `${student['Disciplinary Action']} || ${formattedNewNotice}` 
                : formattedNewNotice;
        }

        onSaveStudent(studentSemester, { ...student, 'Disciplinary Action': finalNotice } as StudentDataRow);
        
        setIsDiscFormOpen(false);
        setEditingDiscIndex(null);
    };

    const handleSaveFollowup = async (finalData?: any) => {
        // Use directly passed finalData if available, otherwise fallback to state
        const dataToUse = finalData || followupFormData;
        
        if (!dataToUse.Remark.trim()) { alert("Please enter a remark."); return; }
        
        const now = new Date();
        const datePart = now.toISOString().split('T')[0];
        const timePart = now.toTimeString().split(' ')[0];
        
        const payload: StudentFollowupRow = { 
            ...dataToUse, 
            'Student ID': student['Student ID'], 
            'Student Name': student['Student Name'], 
            'uniqueid': `SF-${Date.now()}`, 
            Timestamp: `${datePart} ${timePart}` 
        };
        
        setStudentFollowupData(prev => [payload, ...prev]);
        closeAll();
        
        try { 
            await submitSheetData('add', SHEET_NAMES.FOLLOWUP, payload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID); 
        } catch (e) { 
            console.error(e); 
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/10 font-sans">
            <StudentProfileHeader 
                student={student} program={program} discStatus={discStatus}
                dropInfo={dropStatus}
                onOpenDisciplinary={() => setIsDiscHistoryOpen(!isDiscHistoryOpen)} 
                onRemoveDisciplinary={handleRemoveDisc}
                isSaving={isSaving}
                isCreditsMet={parseFloat(student['Credit Completed'] || '0') >= parseFloat(student['Credit Requirement'] || '0')}
                isDefenseSuccess={student['Defense Status']?.toLowerCase() === 'complete'}
                isDegreeDone={student['Degree Status']?.toLowerCase() === 'complete'}
                lastRegSemester="Spring 2024"
                mentorAssigned={!!mentorInfo}
                onCardClick={(type) => { closeAll(); if (type === 'history') setActivePopup('history'); else if (type === 'mentor') setShowMentorDetails(true); else setActivePopup(type); }}
                activePopup={activePopup}
            />

            <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
                {activePopup === 'history' && <div className="absolute inset-0 z-[60] p-3 bg-white"><StudentRegistrationHistory historyData={historyData} onClose={closeAll} /></div>}
                
                {isDiscFormOpen && (
                    <div className="absolute inset-0 z-[80] p-3 bg-white/95 backdrop-blur-sm overflow-y-auto">
                        <StudentDisciplinaryForm 
                            discReason={discReason} setDiscReason={setDiscReason} 
                            discFromDate={discFromDate} setDiscFromDate={setDiscFromDate} 
                            discToDate={discToDate} setDiscToDate={setDiscToDate} 
                            isExpired={discStatus.isExpired} isSaving={isSaving} 
                            onSave={handleSaveDisc} 
                            onClose={() => setIsDiscFormOpen(false)} 
                        />
                    </div>
                )}
                
                {showFollowupForm && <StudentFollowupForm student={student} formData={followupFormData} setFormData={setFollowupFormData} employeeOptions={employeeOptions} isSaving={isSaving} onSave={handleSaveFollowup} onClose={closeAll} />}

                {showMentorDetails && (
                    <div className="absolute inset-0 z-[60] bg-white p-4 flex flex-col animate-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center"><User className="w-4 h-4 mr-2" /> Mentor Info</h4>
                            <button onClick={closeAll}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        {mentorInfo ? (
                            <div className="flex items-start space-x-4">
                                <div className="w-20 h-20 rounded-full border overflow-hidden shrink-0">{getImageUrl(mentorInfo.Photo) ? <img src={getImageUrl(mentorInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><User className="w-10 h-10" /></div>}</div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-bold text-slate-900 truncate">{mentorInfo['Employee Name']}</h3>
                                    <p className="text-xs text-blue-600 font-medium mt-1 truncate">{mentorInfo['Academic Designation']}</p>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center text-xs text-slate-600"><Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />{mentorInfo.Mobile || '-'}</div>
                                        <div className="flex items-center text-xs text-slate-600"><Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />{mentorInfo['E-mail'] || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="text-center text-gray-400 italic py-10">No mentor assigned</p>}
                    </div>
                )}

                {/* Main Content Area - Inline Scrollable */}
                <div className="flex-1 flex flex-col min-h-0">
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
                                <button 
                                    onClick={handleAddDisc} 
                                    className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /><span className="text-[9px] font-bold uppercase">Add Disciplinary</span>
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    setFollowupFormData({
                                        Date: new Date().toISOString().split('T')[0],
                                        Remark: '', 
                                        'Re-follow up': '', 
                                        Status: '', 
                                        'Contacted By': ''
                                    });
                                    setShowFollowupForm(true);
                                }} 
                                className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-blue-600 text-white border-blue-700 shadow-sm hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-3 h-3" /><span className="text-[9px] font-bold uppercase">Add Follow-up</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                        {/* Latest Disciplinary Card - Inline Toggle */}
                        {discStatus.isActive && (
                            <div className="space-y-1.5 animate-in fade-in duration-300">
                                <div 
                                    className={`border rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${isDiscHistoryOpen ? 'bg-red-100 border-red-300 ring-2 ring-red-500/10' : (discStatus.isExpired ? 'bg-yellow-100 border-yellow-200' : 'bg-red-50 border-red-200')}`}
                                    onClick={() => setIsDiscHistoryOpen(!isDiscHistoryOpen)}
                                >
                                    <div className={`flex items-center justify-between mb-1.5 ${discStatus.isExpired ? 'text-yellow-700' : 'text-red-700'}`}>
                                        <div className="flex items-center space-x-2">
                                            <ShieldAlert className="w-4 h-4" />
                                            <h4 className="text-[11px] font-black uppercase tracking-wider">Latest Disciplinary Status</h4>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={handleAddDisc}
                                                className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mr-1 shadow-sm"
                                                title="Add New Disciplinary Record"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <span className="text-[8px] font-bold bg-white/60 px-1 py-0.5 rounded border border-current opacity-60">{discRecords.length} LOGS</span>
                                            {isDiscHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </div>
                                    </div>
                                    <p className={`text-[11px] leading-relaxed font-bold italic ${discStatus.isExpired ? 'text-yellow-800' : 'text-red-600'}`}>{discStatus.message}</p>
                                </div>

                                {/* Inline Disciplinary History Records (Simple Cards) */}
                                {isDiscHistoryOpen && (
                                    <div className="bg-red-50/30 rounded-lg border border-red-200 p-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        {discRecords.slice().reverse().map((record, idx) => {
                                            const actualIdx = discRecords.length - 1 - idx;
                                            const isExpired = checkRecordExpiry(record);
                                            
                                            return (
                                                <div 
                                                    key={actualIdx} 
                                                    className={`rounded-md border p-2.5 flex items-start justify-between shadow-sm transition-all group ${isExpired ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' : 'bg-white border-red-100 hover:border-red-200'}`}
                                                >
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            {actualIdx === discRecords.length - 1 && <span className={`${isExpired ? 'bg-yellow-600' : 'bg-red-600'} text-white text-[7px] font-black px-1 py-0.5 rounded tracking-widest shadow-sm`}>CURRENT</span>}
                                                            {isExpired && (
                                                                <span className="bg-yellow-100 text-yellow-800 text-[7px] font-black px-1 py-0.5 rounded border border-yellow-300 flex items-center">
                                                                    <CalendarX className="w-2.5 h-2.5 mr-0.5" /> EXPIRED
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-bold uppercase tracking-tight ${isExpired ? 'text-yellow-600' : 'text-red-300'}`}>Record #{actualIdx + 1}</span>
                                                        </div>
                                                        <p className={`text-[10px] md:text-[11px] font-bold italic leading-relaxed ${isExpired ? 'text-yellow-900' : 'text-red-900'}`}>
                                                            {record}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEditDisc(actualIdx); }}
                                                        className={`p-1.5 rounded-md transition-colors shrink-0 border border-transparent ${isExpired ? 'text-yellow-600 hover:bg-yellow-100 hover:border-yellow-200' : 'text-red-500 hover:bg-red-50 hover:border-red-100'}`}
                                                        title="Edit this record"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <button 
                                            onClick={handleRemoveDisc}
                                            className="w-full py-1 text-[8px] font-black text-red-400 hover:text-red-600 transition-colors uppercase border border-dashed border-red-200 rounded mt-1"
                                        >
                                            Clear All Logged Records
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Standard Follow-up History */}
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center px-1 mb-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conversation Timeline</span>
                                <div className="h-px bg-slate-100 flex-1 ml-3"></div>
                            </div>
                            {historyRemarks.length > 0 ? (
                                historyRemarks.map((item, idx) => {
                                    // Parsing Response Status and Dropout Classification
                                    const statusStr = item.Status || '';
                                    const match = statusStr.match(/^(.+?)\s*\((.+?)\)$/);
                                    const responseStatus = match ? match[1] : (statusStr || 'Contacted');
                                    const dropType = match ? match[2] : null;
                                    const uid = item.uniqueid || `idx-${idx}`;
                                    const isExpanded = expandedRemarks.has(uid);

                                    return (
                                        <div key={uid} className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group relative">
                                            {/* Top Metadata Row */}
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1 rounded bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        <CalendarDays className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-800 tracking-tight">{formatDisplayDate(item.Date)}</span>
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">By {item['Contacted By'] || 'System'}</span>
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                        <UserCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Remark Content Block */}
                                            <div 
                                                className="relative pl-3 mb-2.5 cursor-pointer select-none active:opacity-70"
                                                onClick={() => toggleRemarkExpansion(uid)}
                                                title="Click to toggle full text"
                                            >
                                                <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${dropType ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                                                <p className={`text-[11px] text-slate-700 font-medium leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>
                                                    {item.Remark}
                                                </p>
                                                {!isExpanded && item.Remark && item.Remark.length > 120 && (
                                                    <div className="text-[9px] text-blue-400 font-bold mt-1 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Click to read more...
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actionable Footer Metadata */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-50">
                                                {/* Response Badge */}
                                                <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                                    <Info className="w-2.5 h-2.5 mr-1 text-blue-500" />
                                                    {responseStatus}
                                                </div>

                                                {/* Dropout Pill */}
                                                {dropType && (
                                                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter ${
                                                        dropType.includes('Permanent') 
                                                        ? 'bg-red-50 text-red-600 border-red-100' 
                                                        : 'bg-orange-50 text-orange-600 border-orange-100'
                                                    }`}>
                                                        {dropType.includes('Permanent') ? <PowerOff className="w-2.5 h-2.5 mr-1" /> : <Clock className="w-2.5 h-2.5 mr-1" />}
                                                        {dropType}
                                                    </div>
                                                )}

                                                {/* Re-follow up Pill */}
                                                {item['Re-follow up'] && (
                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700 ml-auto uppercase tracking-tighter">
                                                        <CalendarX className="w-2.5 h-2.5 mr-1 text-emerald-500" />
                                                        Next: {formatDisplayDate(item['Re-follow up'])}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                                    <MessageSquareQuote className="w-10 h-10 mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-center">No remarks recorded</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};