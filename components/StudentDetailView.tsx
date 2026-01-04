import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, MessageSquareQuote, Save, ArrowLeft, Loader2, Plus, User, Mail, Phone, Hash, Briefcase, GraduationCap, Calendar, Award, Banknote, CalendarCheck, ShieldQuestion, Pencil } from 'lucide-react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow, StudentFollowupRow } from '../types';
import { isValEmpty, getImageUrl } from '../views/EmployeeView';
import { useSheetData } from '../hooks/useSheetData';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID, STUDENT_LINK_SHEET_ID } from '../constants';

// Refactored Sub-components
import { StudentIdentity } from './StudentProfile/StudentIdentity';
import { StudentStatsGrid } from './StudentProfile/StudentStatsGrid';
import { StudentDropoutControl } from './StudentProfile/StudentDropoutControl';
import { StudentRemarksPanel } from './StudentProfile/StudentRemarksPanel';
import { StudentRegistrationHistory } from './StudentRegistrationHistory';
import { StudentDisciplinaryForm } from './StudentDisciplinaryForm';
import { StudentFollowupForm } from './StudentFollowupForm';
import { StudentDuesForm } from './StudentDuesForm';
import { StudentSnoozeForm } from './StudentSnoozeForm';
import { SearchableSelect } from './EditEntryModal';
import { ConfirmDialog } from './ConfirmDialog';

const RECORD_SEP = ' || ';
const FIELD_SEP = ' ;; ';

const formatDisplayDate = (dateStr: string | undefined, includeTime: boolean = true, includeSeconds: boolean = true): string => {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; 
        
        const options: Intl.DateTimeFormatOptions = { 
            month: 'short', 
            day: '2-digit', 
            year: 'numeric' 
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            if (includeSeconds) {
                options.second = '2-digit';
            }
            options.hour12 = true;
        }

        return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (e) { return dateStr; }
};

const parseToIsoDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const offset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
    } catch (e) { return ''; }
};

const checkRecordExpiry = (record: string) => {
    const toDateMatch = record.match(/to\s+([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    if (toDateMatch) {
        const expiryDate = new Date(toDateMatch[1]);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return !isNaN(expiryDate.getTime()) && expiryDate < today;
    }
    return false;
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
    initialRemarksOpen?: boolean;
}

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
    student, program, diuEmployeeData, teacherData, employeeOptions, onSaveStudent, onClose, registrationLookup, studentSemester, initialRemarksOpen = false
}) => {
    const { uniqueSemesters, studentFollowupData, reloadData } = useSheetData();
    const [isSaving, setIsSaving] = useState(false);
    const [activePopup, setActivePopup] = useState<string | null>(null);
    const [isRemarksOpen, setIsRemarksOpen] = useState(false);
    const [followupContext, setFollowupContext] = useState<'standard' | 'defense' | 'registration' | 'dues'>('standard');
    const [isDiscHistoryOpen, setIsDiscHistoryOpen] = useState(false);
    const [expandedRemarks, setExpandedRemarks] = useState<Set<string>>(new Set());

    const [confirmDeleteInfo, setConfirmDeleteInfo] = useState<{index: number, source: string} | null>(null);
    const [confirmClearDisc, setConfirmClearDisc] = useState(false);

    useEffect(() => {
        if (initialRemarksOpen) {
            setIsRemarksOpen(true);
        }
    }, [student['Student ID'], initialRemarksOpen]);

    const [editFormData, setEditFormData] = useState<any>({});
    const [defenseTypes] = useState(['Thesis', 'Project', 'Internship']);

    // Logic to extract relevant history based on context (Remark column vs Dues column)
    const historyRemarks = useMemo(() => {
        const isDues = followupContext === 'dues';
        
        // 1. Process standard remarks (Discussion Remark column)
        const rawRemarks = student['Discussion Remark'];
        let remarkEntries: any[] = [];
        if (!isValEmpty(rawRemarks)) {
            remarkEntries = rawRemarks!.split(RECORD_SEP).map(s => s.trim()).filter(Boolean).map((entry, idx) => {
                const fields = entry.split(FIELD_SEP).map(f => f.trim());
                return {
                    Date: fields[0] || '', 
                    Status: fields[1] || '', 
                    'Contacted By': fields[2] || '', 
                    'Re-follow up': fields[3] || '', 
                    'Target Semester': fields[4] || '', 
                    Remark: fields[5] || '', 
                    Category: fields[6] || '', 
                    'Exam Period': fields[7] || '', 
                    'Student ID': student['Student ID'], 
                    'Student Name': student['Student Name'],
                    'uniqueid': `remark-${idx}`, _index: idx,
                    _source: 'discussion'
                };
            });
        }

        if (isDues) {
            const duesRelatedRemarks = remarkEntries.filter(r => r.Category === 'Dues Follow up');
            const rawDues = student['Dues'];
            let duesEntries: any[] = [];
            
            if (!isValEmpty(rawDues)) {
                if (!rawDues!.includes(FIELD_SEP)) {
                    duesEntries.push({
                        Date: new Date().toISOString(), 
                        Status: `BDT ${rawDues}`, 
                        'Contacted By': 'System', 
                        'Re-follow up': '', 
                        'Target Semester': '', 
                        'Exam Period': '',
                        Remark: `Direct Amount: ${rawDues} BDT`, 
                        Category: 'Dues Follow up', 
                        'Student ID': student['Student ID'], 
                        'Student Name': student['Student Name'],
                        'uniqueid': 'legacy-dues', _index: -1,
                        _source: 'dues',
                        DoneStatus: ''
                    });
                } else {
                    duesEntries = rawDues!.split(RECORD_SEP).map(s => s.trim()).filter(Boolean).map((entry, idx) => {
                        const fields = entry.split(FIELD_SEP).map(f => f.trim());
                        return {
                            Date: fields[0] || '', 
                            Status: `BDT ${fields[1] || '0'}`,
                            'Contacted By': fields[4] || 'System',
                            'Re-follow up': '', 
                            'Target Semester': fields[3] || '', 
                            'Exam Period': fields[2] || '',
                            Remark: fields[5] || `Dues set to ${fields[1]} BDT`, 
                            Category: 'Dues Follow up',
                            'Student ID': student['Student ID'], 
                            'Student Name': student['Student Name'],
                            'uniqueid': `dues-${idx}`, _index: idx,
                            _source: 'dues',
                            DoneStatus: fields[6] || ''
                        } as any;
                    });
                }
            }
            return [...duesEntries, ...duesRelatedRemarks].sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }
        
        if (followupContext === 'defense') {
            return remarkEntries.filter(r => r.Category === 'Defense Follow up').sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        } else if (followupContext === 'registration') {
            return remarkEntries.filter(r => r.Category === 'Registration Follow up').sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }
        
        return remarkEntries.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [student['Discussion Remark'], student['Dues'], followupContext, student['Student ID']]);

    const [isDiscFormOpen, setIsDiscFormOpen] = useState(false);
    const [showFollowupForm, setShowFollowupForm] = useState(false);
    const [showDuesForm, setShowDuesForm] = useState(false);
    const [showSnoozeForm, setShowSnoozeForm] = useState(false);
    const [editingDuesData, setEditingDuesData] = useState<any>(null);
    const [editingDuesIndex, setEditingDuesIndex] = useState<number | null>(null);
    const [snoozeContext, setSnoozeContext] = useState<any>(null);

    useEffect(() => {
        if (activePopup && !['dropout', 'history', 'remarks', 'remarks-defense', 'remarks-dues'].includes(activePopup)) {
            const initialData = { ...student };
            if (activePopup === 'defense') { initialData['Defense Registration'] = parseToIsoDate(student['Defense Registration']); }
            setEditFormData(initialData);
        }
    }, [activePopup, student]);

    const discRecords = useMemo(() => {
        const raw = student['Disciplinary Action'];
        if (!raw || isValEmpty(raw)) return [];
        return raw.split('||').map(r => r.trim()).filter(Boolean);
    }, [student['Disciplinary Action']]);

    const discStatus = useMemo(() => {
        if (discRecords.length === 0) return { isActive: false, isExpired: false, message: 'No Disciplinary Action' };
        const lastAction = discRecords[discRecords.length - 1];
        return { isActive: true, isExpired: checkRecordExpiry(lastAction), message: lastAction };
    }, [discRecords]);

    const historyData = useMemo(() => {
        if (!registrationLookup) return [];
        const cleanId = String(student['Student ID']).trim();
        const registeredSems = registrationLookup.get(cleanId) || new Set();
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };
        const enrollmentSem = studentSemester || '';
        const enrollmentParsed = parseSem(enrollmentSem);
        const allSemesters = uniqueSemesters.filter(s => s !== 'All').map(s => ({ original: s, ...parseSem(s) })).sort((a, b) => a.year !== b.year ? b.year - a.year : b.season - a.season);
        return allSemesters.filter(sem => { if (sem.year > enrollmentParsed.year) return true; if (sem.year === enrollmentParsed.year && sem.season >= enrollmentParsed.season) return true; return false; }).map(sem => { const isRegistered = registeredSems.has(sem.original); return { semester: sem.original, isRegistered: isRegistered, taken: isRegistered ? 15 : null, complete: isRegistered ? 15 : null, sgpa: isRegistered ? (3.2 + Math.random() * 0.7).toFixed(2) : null, dues: 0 }; }).sort((a, b) => { const pa = parseSem(a.semester), pb = parseSem(b.semester); if (pa.year !== pb.year) return pb.year - pa.year; return pb.season - pa.season; });
    }, [registrationLookup, student['Student ID'], studentSemester, uniqueSemesters]);

    const handleQuickUpdate = useCallback(async (newData: any) => {
        if (!studentSemester) return;
        setIsSaving(true);
        setActivePopup(null);
        try {
            const payload = { ...newData };
            if (activePopup === 'defense' && payload['Defense Registration']) { payload['Defense Registration'] = formatDisplayDate(payload['Defense Registration'], false); }
            await onSaveStudent(studentSemester, { ...student, ...payload } as StudentDataRow);
        } finally { setIsSaving(false); }
    }, [studentSemester, student, onSaveStudent, activePopup]);

    const handleSaveInlineForm = () => { handleQuickUpdate(editFormData); };

    const [discReason, setDiscReason] = useState('');
    const [discFromDate, setDiscFromDate] = useState('');
    const [discToDate, setDiscToDate] = useState('');
    const [editingDiscIndex, setEditingDiscIndex] = useState<number | null>(null);
    const [followupFormData, setFollowupFormData] = useState({ Date: '', Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '', 'Target Semester': '', Category: '' });
    const [editingFollowupIndex, setEditingFollowupIndex] = useState<number | null>(null);

    const statusOptions = useMemo(() => {
        const defaults = ['Call Busy', 'Switched Off', 'Not Reachable', 'Department Change', 'University Change'];
        const used = new Set<string>();
        studentFollowupData.forEach(f => {
            if (f.Status && f.Status.trim()) used.add(f.Status.trim());
        });
        return Array.from(new Set([...defaults, ...used])).sort();
    }, [studentFollowupData]);

    const handleSaveDisc = async () => {
        if (!studentSemester) return;
        setIsSaving(true);
        try {
            const formattedFrom = formatDisplayDate(discFromDate, false);
            const formattedTo = discToDate ? ` to ${formatDisplayDate(discToDate, false)}` : ' (Permanent)';
            const newRecord = `${discReason} from ${formattedFrom}${formattedTo}`;
            let updatedValue = '';
            const existingRecords = (student['Disciplinary Action'] || '').split('||').map(r => r.trim()).filter(Boolean);
            if (editingDiscIndex !== null) {
                existingRecords[editingDiscIndex] = newRecord;
                updatedValue = existingRecords.join(' || ');
            } else {
                updatedValue = student['Disciplinary Action'] ? `${student['Disciplinary Action']} || ${newRecord}` : newRecord;
            }
            await onSaveStudent(studentSemester, { ...student, 'Disciplinary Action': updatedValue } as StudentDataRow);
            setIsDiscFormOpen(false);
        } finally { setIsSaving(false); }
    };

    const renderInlineEditForm = () => {
        if (!activePopup) return null;
        const fields: Record<string, string[]> = { 'credits': ['Credit Requirement', 'Credit Completed'], 'defense': ['Defense Registration', 'Defense Supervisor', 'Defense Status', 'Defense Type'], 'degree': ['Degree Status'], 'mentor': ['Mentor'] };
        const currentFields = fields[activePopup] || [];
        const title = activePopup.charAt(0).toUpperCase() + activePopup.slice(1);
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h4 className="text-xs font-black uppercase tracking-widest text-slate-700">Update {title}</h4><button onClick={() => setActivePopup(null)}><X className="w-4 h-4 text-slate-400" /></button></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
                    {currentFields.map(field => (
                        <div key={field}>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{field}</label>
                            {field === 'Defense Status' || field === 'Degree Status' ? (
                                <SearchableSelect value={editFormData[field] || ''} onChange={(v) => setEditFormData({ ...editFormData, [field]: v })} options={field === 'Defense Status' ? ['Ongoing', 'Complete', 'Incomplete', 'Withdrawn'] : ['Complete', 'Ongoing', 'Incomplete']} />
                            ) : field === 'Defense Type' ? (
                                <SearchableSelect value={editFormData[field] || ''} onChange={(v) => setEditFormData({ ...editFormData, [field]: v })} options={defenseTypes} />
                            ) : field === 'Defense Registration' ? (
                                <input type="date" value={editFormData[field] || ''} onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                            ) : field === 'Mentor' ? (
                                <SearchableSelect value={editFormData[field] || ''} onChange={(v) => setEditFormData({ ...editFormData, [field]: v })} options={employeeOptions} />
                            ) : (
                                <input type="text" value={editFormData[field] || ''} onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex space-x-2"><button onClick={() => setActivePopup(null)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg uppercase">Cancel</button><button onClick={handleSaveInlineForm} disabled={isSaving} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg uppercase shadow-md flex items-center justify-center">{isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />} Save</button></div>
            </div>
        );
    };

    const handleSaveFollowup = async (finalData?: any) => {
        if (!studentSemester) return;
        const d = finalData || followupFormData;
        const now = new Date();
        const timePart = now.toTimeString().split(' ')[0];
        const combinedDate = `${d.Date} ${timePart}`;
        const reFollowupDate = (d['Re-follow up'] || '').split(' ')[0].split('T')[0];
        const contactedByText = d['Contacted By'] || '';
        const idMatch = contactedByText.match(/\(([^)]+)\)$/);
        const contactedById = idMatch ? idMatch[1] : contactedByText;
        const targetSemValue = d['Target Semester'] || '';
        const categoryValue = d.Category || (followupContext === 'defense' ? 'Defense Follow up' : followupContext === 'registration' ? 'Registration Follow up' : followupContext === 'dues' ? 'Dues Follow up' : 'General Follow up');
        const entryStr = [combinedDate, d.Status, contactedById, reFollowupDate, targetSemValue, d.Remark.replace(/\n/g, ' '), categoryValue].join(FIELD_SEP);
        const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
        if (editingFollowupIndex !== null) entries[editingFollowupIndex] = entryStr;
        else entries.push(entryStr);
        setShowFollowupForm(false);
        const updatedRemarks = entries.join(RECORD_SEP);
        onSaveStudent(studentSemester!, { ...student, 'Discussion Remark': updatedRemarks } as StudentDataRow);
        const globalPayload = { 'uniqueid': `SF-AUTO-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': d.Remark, 'Re-follow up': reFollowupDate, 'Target Semester': targetSemValue, 'Status': d.Status, 'Contacted By': contactedById, 'Category': categoryValue, 'Timestamp': new Date().toLocaleString() };
        submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID).then(() => reloadData('followup', false)).catch(err => console.error("Global sync failed:", err));
    };

    const handleSaveDues = (duesData: any) => {
        if (!studentSemester) return;
        const now = new Date();
        const datePart = now.toISOString().split('T')[0];
        const timePart = now.toTimeString().split(' ')[0];
        const combinedDate = `${datePart} ${timePart}`;
        const approverId = (duesData.approver.match(/\(([^)]+)\)$/) || [])[1] || duesData.approver;
        
        // FIXED: Using dynamic array to avoid trailing ;;
        const duesFields = [combinedDate, duesData.amount, duesData.period, `${duesData.semester} ${duesData.year}`, approverId, duesData.historyRemark];
        // If there's an explicit Done status in initial data, preserve it, otherwise leave as 6-field row (prevent trailing ;;)
        if (editingDuesData?.DoneStatus === 'DONE') {
            duesFields.push('DONE');
        }
        
        const entryStr = duesFields.join(FIELD_SEP);
        const rawDues = student['Dues'] || '';
        const entries = rawDues.includes(FIELD_SEP) ? rawDues.split(RECORD_SEP).map(s => s.trim()).filter(Boolean) : [];
        if (editingDuesIndex !== null && editingDuesIndex >= 0) entries[editingDuesIndex] = entryStr;
        else entries.push(entryStr);
        const updatedDues = entries.join(RECORD_SEP);

        let updatedRemarks = student['Discussion Remark'] || '';
        if (duesData.snoozeDate && duesData.snoozeRemark) {
            const remarkEntries = updatedRemarks.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            const snoozeEntry = [combinedDate, 'Snoozed', 'System', duesData.snoozeDate, `${duesData.semester} ${duesData.year}`, duesData.snoozeRemark, 'Dues Follow up', duesData.period].join(FIELD_SEP);
            remarkEntries.push(snoozeEntry);
            updatedRemarks = remarkEntries.join(RECORD_SEP);

            const globalPayload = { 'uniqueid': `SF-SNZ-DUES-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': duesData.snoozeRemark, 'Re-follow up': duesData.snoozeDate, 'Target Semester': `${duesData.semester} ${duesData.year}`, 'Status': 'Snoozed', 'Contacted By': 'System', 'Category': 'Dues Follow up', 'Timestamp': new Date().toLocaleString() };
            submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID).then(() => reloadData('followup', false));
        }

        setShowDuesForm(false); setEditingDuesIndex(null); setEditingDuesData(null);
        onSaveStudent(studentSemester, { ...student, 'Dues': updatedDues, 'Discussion Remark': updatedRemarks } as StudentDataRow).catch(err => console.error("Background sync failed for Dues:", err));
    };

    const handleSaveSnooze = (snoozeData: { snoozeDate: string; remark: string }) => {
        if (!studentSemester || !snoozeContext) return;
        const now = new Date();
        const datePart = now.toISOString().split('T')[0];
        const timePart = now.toTimeString().split(' ')[0];
        const combinedDate = `${datePart} ${timePart}`;
        const entryStr = [combinedDate, 'Snoozed', 'System', snoozeData.snoozeDate, snoozeContext['Target Semester'] || '', snoozeData.remark, 'Dues Follow up', snoozeContext['Exam Period'] || ''].join(FIELD_SEP);
        const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
        if (editingFollowupIndex !== null) entries[editingFollowupIndex] = entryStr;
        else entries.push(entryStr);

        let updatedDues = student['Dues'] || '';
        if (updatedDues.includes(FIELD_SEP)) {
            const duesEntries = updatedDues.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            const updatedDuesEntries = duesEntries.map(d => {
                const fields = d.split(FIELD_SEP).map(f => f.trim());
                if (fields[3] === snoozeContext['Target Semester'] && fields[2] === (snoozeContext['Exam Period'] || '')) {
                    if (fields.length >= 7) fields.pop(); // Remove DONE if present
                    return fields.join(FIELD_SEP);
                }
                return d;
            });
            updatedDues = updatedDuesEntries.join(RECORD_SEP);
        }
        
        setShowSnoozeForm(false); setSnoozeContext(null); setEditingFollowupIndex(null);
        onSaveStudent(studentSemester, { ...student, 'Discussion Remark': entries.join(RECORD_SEP), 'Dues': updatedDues } as StudentDataRow);
        
        const globalPayload = { 'uniqueid': `SF-SNZ-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': snoozeData.remark, 'Re-follow up': snoozeData.snoozeDate, 'Target Semester': snoozeContext['Target Semester'] || '', 'Status': 'Snoozed', 'Contacted By': 'System', 'Category': 'Dues Follow up', 'Timestamp': new Date().toLocaleString() };
        submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID).then(() => reloadData('followup', false));
    };

    const handleSaveSnoozeClear = useCallback(async (context: any) => {
        if (!studentSemester || !context) return;
        try {
            let rawDues = student['Dues'] || '';
            let newDuesValue = '';
            if (!rawDues.includes(FIELD_SEP)) {
                const now = new Date();
                const combinedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
                newDuesValue = [combinedDate, rawDues, 'Registration', '', 'System', `Legacy dues marked as done.`, 'DONE'].join(FIELD_SEP);
            } else {
                const entries = rawDues.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
                if (context._index >= 0 && context._index < entries.length) {
                    const fields = entries[context._index].split(FIELD_SEP).map(f => f.trim());
                    while (fields.length < 6) fields.push('');
                    fields[6] = 'DONE';
                    entries[context._index] = fields.join(FIELD_SEP);
                    newDuesValue = entries.join(RECORD_SEP);
                } else {
                    const updatedEntries = entries.map(entry => {
                        const fields = entry.split(FIELD_SEP).map(f => f.trim());
                        if (fields[3] === context['Target Semester'] && fields[2] === (context['Exam Period'] || '')) {
                            while (fields.length < 6) fields.push('');
                            fields[6] = 'DONE';
                            return fields.join(FIELD_SEP);
                        }
                        return entry;
                    });
                    newDuesValue = updatedEntries.join(RECORD_SEP);
                }
            }
            if (newDuesValue) {
                onSaveStudent(studentSemester, { ...student, 'Dues': newDuesValue } as StudentDataRow);
            }
        } catch (error) { console.error("Save snooze clear failed:", error); }
    }, [studentSemester, student, onSaveStudent]);

    const handleDeleteFollowup = async (index: number, source: string = 'discussion') => {
        if (!studentSemester) return;
        setIsSaving(true);
        try {
            const targetField = source === 'dues' ? 'Dues' : 'Discussion Remark';
            const raw = student[targetField as keyof StudentDataRow] || '';
            const entries = String(raw).split(RECORD_SEP).map(s => s.trim()).filter(Boolean);

            if (index >= 0 && index < entries.length) {
                let updatedRemarks = student['Discussion Remark'] || '';
                let updatedDues = student['Dues'] || '';
                if (source === 'dues') {
                    const duesFields = entries[index].split(FIELD_SEP).map(f => f.trim());
                    const targetSem = duesFields[3];
                    const targetPeriod = duesFields[2];
                    const remarkEntries = updatedRemarks.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
                    const filteredRemarks = remarkEntries.filter(re => {
                        const fields = re.split(FIELD_SEP).map(f => f.trim());
                        return !(fields[6] === 'Dues Follow up' && fields[4] === targetSem && fields[7] === targetPeriod);
                    });
                    updatedRemarks = filteredRemarks.join(RECORD_SEP);
                    entries.splice(index, 1);
                    updatedDues = entries.join(RECORD_SEP);
                } else {
                    entries.splice(index, 1);
                    updatedRemarks = entries.join(RECORD_SEP);
                    updatedDues = student['Dues'] || '';
                }
                onSaveStudent(studentSemester, { ...student, 'Dues': updatedDues, 'Discussion Remark': updatedRemarks } as StudentDataRow);
            }
        } catch (err) { console.error("Delete failed:", err); } 
        finally { setIsSaving(false); setConfirmDeleteInfo(null); }
    };

    const handleStatCardClick = useCallback((type: string) => {
        if (type === 'history') { setActivePopup(null); setIsRemarksOpen(false); setFollowupContext('standard'); }
        else if (type === 'remarks') { setIsRemarksOpen(true); setActivePopup(null); setFollowupContext('registration'); }
        else if (type === 'remarks-defense') { setIsRemarksOpen(true); setActivePopup(null); setFollowupContext('defense'); }
        else if (type === 'remarks-dues') { setIsRemarksOpen(true); setActivePopup(null); setFollowupContext('dues'); }
        else { setActivePopup(type); setIsRemarksOpen(false); setFollowupContext('standard'); }
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white font-sans h-full">
            <div className="bg-white border-b border-slate-100 p-2.5 shadow-sm shrink-0">
                <StudentIdentity student={student} program={program} dropInfo={null} onDropClick={() => { setActivePopup('dropout'); setIsRemarksOpen(false); }} />
                <StudentStatsGrid student={student} activePopup={activePopup} onCardClick={handleStatCardClick} isCreditsMet={parseFloat(student['Credit Completed'] || '0') >= parseFloat(student['Credit Requirement'] || '0')} isDefenseSuccess={student['Defense Status']?.toLowerCase() === 'complete'} isDegreeDone={student['Degree Status']?.toLowerCase() === 'complete'} lastRegSemester={historyData.length > 0 ? historyData[0].semester : 'None'} mentorAssigned={!isValEmpty(student?.Mentor)} />
            </div>
            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/20">
                <div className="flex-1 flex flex-col overflow-hidden relative p-2"><StudentRegistrationHistory historyData={historyData} /></div>
                {activePopup && !['history', 'remarks', 'remarks-defense', 'remarks-dues'].includes(activePopup) && (<div className="absolute inset-0 z-20 p-2"><div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-full relative">{activePopup === 'dropout' ? <StudentDropoutControl onClose={() => setActivePopup(null)} onUpdate={(type) => handleQuickUpdate({ 'Dropout Classification': type })} /> : renderInlineEditForm()}</div></div>)}
            </div>
            <StudentRemarksPanel 
                isOpen={isRemarksOpen} onClose={() => setIsRemarksOpen(false)}
                historyRemarks={historyRemarks} expandedRemarks={expandedRemarks} 
                toggleRemarkExpansion={(uid) => setExpandedRemarks(prev => prev.has(uid) ? new Set() : new Set([uid]))}
                formatDate={formatDisplayDate} 
                onAddFollowup={() => { if (followupContext === 'dues') { setEditingDuesIndex(null); setEditingDuesData(null); setShowDuesForm(true); } else { const now = new Date(); const datePart = now.toISOString().split('T')[0]; setFollowupFormData({ Date: datePart, Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '', 'Target Semester': '', Category: followupContext === 'defense' ? 'Defense Follow up' : followupContext === 'registration' ? 'Registration Follow up' : '' }); setEditingFollowupIndex(null); setShowFollowupForm(true); } }}
                onEditFollowup={(item) => { 
                    if (item._source === 'dues') { setEditingDuesIndex(item._index); setEditingDuesData(item); setShowDuesForm(true); } 
                    else if (item.Status === 'Snoozed') { setEditingFollowupIndex(item._index); setSnoozeContext(item); setShowSnoozeForm(true); }
                    else { const cleanDate = (item.Date || '').split(' ')[0].split('T')[0]; const cleanReFollowup = (item['Re-follow up'] || '').split(' ')[0].split('T')[0]; setFollowupFormData({ Date: cleanDate, Remark: item.Remark, 'Re-follow up': cleanReFollowup, Status: item.Status, 'Contacted By': item['Contacted By'], 'Target Semester': item['Target Semester'], Category: item.Category || '' } as any); setEditingFollowupIndex(item._index); setShowFollowupForm(true); } 
                }}
                onDeleteFollowup={(idx, source) => setConfirmDeleteInfo({ index: idx, source })}
                onSnoozeFollowup={(item) => { setSnoozeContext(item); setEditingFollowupIndex(null); setShowSnoozeForm(true); }}
                onClearSnoozeFollowup={handleSaveSnoozeClear}
                discStatus={discStatus} discRecords={discRecords} isDiscHistoryOpen={isDiscHistoryOpen} toggleDiscHistory={() => setIsDiscHistoryOpen(!isDiscHistoryOpen)}
                onAddDisc={() => { setDiscReason(''); setDiscFromDate(new Date().toISOString().split('T')[0]); setDiscToDate(''); setEditingDiscIndex(null); setIsDiscFormOpen(true); }}
                onEditDisc={(idx) => { const r = discRecords[idx]; const match = r.match(/^(.+?)\s+from\s+([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})(?:\s+to\s+([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})|\s+\(Permanent\))?$/); if(match){ setDiscReason(match[1].trim()); setDiscFromDate(parseToIsoDate(match[2])); setDiscToDate(match[3] ? parseToIsoDate(match[3]) : ''); } else { const parts = r.split(/\s+from\s+/); if (parts.length > 1) { setDiscReason(parts[0].trim()); const datePart = parts[1].split(/\s+to\s+|\s+\(Permanent\)/)[0]; setDiscFromDate(parseToIsoDate(datePart) || new Date().toISOString().split('T')[0]); setDiscToDate(''); } else { setDiscReason(r); setDiscFromDate(new Date().toISOString().split('T')[0]); setDiscToDate(''); } } setEditingDiscIndex(idx); setIsDiscFormOpen(true); }}
                onRemoveAllDisc={() => setConfirmClearDisc(true)}
                checkRecordExpiry={checkRecordExpiry} diuEmployeeData={diuEmployeeData} teacherData={teacherData} isSaving={isSaving}
                activeCategory={followupContext === 'defense' ? 'Defense Follow up' : followupContext === 'registration' ? 'Registration Follow up' : followupContext === 'dues' ? 'Dues Follow up' : undefined}
            />
            {isDiscFormOpen && (<div className="absolute inset-0 z-[150] p-3 bg-white/95 backdrop-blur-sm"><StudentDisciplinaryForm mode={editingDiscIndex !== null ? 'edit' : 'add'} discReason={discReason} setDiscReason={setDiscReason} discFromDate={discFromDate} setDiscFromDate={setDiscFromDate} discToDate={discToDate} setDiscToDate={setDiscToDate} isExpired={discStatus.isExpired} isSaving={isSaving} onSave={handleSaveDisc} onClose={() => setIsDiscFormOpen(false)} /></div>)}
            {showFollowupForm && (<StudentFollowupForm student={student} formData={followupFormData} setFormData={setFollowupFormData} employeeOptions={employeeOptions} statusOptions={statusOptions} isSaving={isSaving} onSave={handleSaveFollowup} onClose={() => setShowFollowupForm(false)} />)}
            {showDuesForm && (<StudentDuesForm student={student} employeeOptions={employeeOptions} isSaving={isSaving} onSave={handleSaveDues} onClose={() => { setShowDuesForm(false); setEditingDuesData(null); setEditingDuesIndex(null); }} initialData={editingDuesData} />)}
            {showSnoozeForm && (<StudentSnoozeForm student={student} isSaving={isSaving} onSave={handleSaveSnooze} onClose={() => { setShowSnoozeForm(false); setSnoozeContext(null); setEditingFollowupIndex(null); }} initialData={editingFollowupIndex !== null ? snoozeContext : null} />)}
            <ConfirmDialog isOpen={confirmDeleteInfo !== null} title="Delete Record?" message={confirmDeleteInfo?.source === 'dues' ? "This will permanently delete the Main Dues Record and ALL associated History Logs for this session. This cannot be undone." : "This action will permanently remove this history log. The Main Dues record will remain unchanged."} onConfirm={() => confirmDeleteInfo !== null && handleDeleteFollowup(confirmDeleteInfo.index, confirmDeleteInfo.source)} onCancel={() => setConfirmDeleteInfo(null)} />
            <ConfirmDialog isOpen={confirmClearDisc} title="Clear All Records?" message="Are you sure you want to clear all disciplinary history for this student? This is a permanent action." onConfirm={() => { setConfirmClearDisc(false); onSaveStudent(studentSemester!, { ...student, 'Disciplinary Action': '' } as StudentDataRow); }} onCancel={() => setConfirmClearDisc(false)} />
        </div>
    );
};

const ChevronRight = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"/>
    </svg>
);