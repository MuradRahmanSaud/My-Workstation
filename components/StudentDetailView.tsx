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
import { StudentRemarksPanel, normalizeSemesterName } from './StudentProfile/StudentRemarksPanel';
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

const deduplicateRemarks = (remarks: string[]): string[] => {
    const seen = new Set<string>();
    return remarks.filter(r => {
        const trimmed = r.trim();
        if (!trimmed || seen.has(trimmed)) return false;
        seen.add(trimmed);
        return true;
    });
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
    const [followupFormData, setFollowupFormData] = useState({ Date: '', Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '', 'Target Semester': '', Category: '' });
    const [defenseTypes] = useState(['Thesis', 'Project', 'Internship']);

    const historyRemarks = useMemo(() => {
        const isDues = followupContext === 'dues';
        const isReg = followupContext === 'registration';
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
                    'Target Semester': (fields[4] || '').trim(), 
                    Remark: fields[5] || '', 
                    Category: (fields[6] || '').trim(), 
                    'Exam Period': (fields[7] || '').trim(), 
                    'SemanticStatus': (fields[8] || fields[1] || '').trim(), // Support legacy by falling back to index 1
                    'Student ID': student['Student ID'], 
                    'Student Name': student['Student Name'],
                    'uniqueid': `remark-${idx}`, _index: idx,
                    _source: 'discussion'
                };
            });
        }

        if (isDues) {
            const duesRelatedRemarks = remarkEntries.filter(r => r.Category?.trim().toLowerCase() === 'dues follow up');
            const rawDues = student['Dues'];
            let duesEntries: any[] = [];
            if (!isValEmpty(rawDues)) {
                if (!rawDues!.includes(FIELD_SEP)) {
                    duesEntries.push({
                        Date: new Date().toISOString(), Status: `BDT ${rawDues}`, 'Contacted By': 'System', 'Re-follow up': '', 'Target Semester': '', 'Exam Period': '', Remark: `Direct Amount: ${rawDues} BDT`, Category: 'Dues Follow up', 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'uniqueid': 'legacy-dues', _index: -1, _source: 'dues', DoneStatus: '', SemanticStatus: 'Done'
                    });
                } else {
                    duesEntries = rawDues!.split(RECORD_SEP).map(s => s.trim()).filter(Boolean).map((entry, idx) => {
                        const fields = entry.split(FIELD_SEP).map(f => f.trim());
                        return { Date: fields[0] || '', Status: `BDT ${fields[1] || '0'}`, 'Contacted By': fields[4] || 'System', 'Re-follow up': '', 'Target Semester': fields[3] || '', 'Exam Period': fields[2] || '', Remark: fields[5] || `Dues set to ${fields[1]} BDT`, Category: 'Dues Follow up', 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'uniqueid': `dues-${idx}`, _index: idx, _source: 'dues', DoneStatus: fields[6] || '', SemanticStatus: fields[6] === 'DONE' ? 'Done' : 'Pending' } as any;
                    });
                }
            }
            return [...duesEntries, ...duesRelatedRemarks].sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }
        
        if (followupContext === 'defense') {
            return remarkEntries.filter(r => r.Category?.trim().toLowerCase() === 'defense follow up').sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        } else if (isReg) {
            return remarkEntries.filter(r => r.Category?.trim().toLowerCase() === 'registration follow up').sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }
        
        return remarkEntries.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [student['Discussion Remark'], student['Dues'], followupContext, student['Student ID']]);

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
        return allSemesters.filter(sem => { if (sem.year > enrollmentParsed.year) return true; if (sem.year === enrollmentParsed.year && sem.season >= enrollmentParsed.season) return true; return false; }).map(sem => { const isRegistered = registeredSems.has(sem.original); return { semester: sem.original, isRegistered: isRegistered, taken: isRegistered ? (15) : null, complete: isRegistered ? 15 : null, sgpa: isRegistered ? (3.2 + Math.random() * 0.7).toFixed(2) : null, dues: 0 }; }).sort((a, b) => { const pa = parseSem(a.semester), pb = parseSem(b.semester); if (pa.year !== pb.year) return pb.year - pa.year; return pb.season - pa.season; });
    }, [registrationLookup, student['Student ID'], studentSemester, uniqueSemesters]);

    // Fix: Corrected setter name to setIsDiscFormOpen to resolve redeclaration conflict and missing name errors
    const [isDiscFormOpen, setIsDiscFormOpen] = useState(false);
    const [editingDiscIndex, setEditingDiscIndex] = useState<number | null>(null);
    const [editingFollowupIndex, setEditingFollowupIndex] = useState<number | null>(null);

    const handleQuickUpdate = useCallback(async (newData: any) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
        setIsSaving(true);
        setActivePopup(null);
        try {
            const payload = { ...newData };
            if (activePopup === 'defense' && payload['Defense Registration']) { payload['Defense Registration'] = formatDisplayDate(payload['Defense Registration'], false); }
            await onSaveStudent(semesterToSave, { ...student, ...payload } as StudentDataRow);
        } finally { setIsSaving(false); }
    }, [studentSemester, student, onSaveStudent, activePopup]);

    const handleSaveInlineForm = () => { handleQuickUpdate(editFormData); };

    const [discReason, setDiscReason] = useState('');
    const [discFromDate, setDiscFromDate] = useState('');
    const [discToDate, setDiscToDate] = useState('');

    const statusOptions = useMemo(() => {
        const defaults = ['Call Busy', 'Switched Off', 'Not Reachable', 'Department Change', 'University Change'];
        const used = new Set<string>();
        studentFollowupData.forEach(f => {
            if (f.Status && f.Status.trim()) used.add(f.Status.trim());
        });
        return Array.from(new Set([...defaults, ...used])).sort();
    }, [studentFollowupData]);

    const handleSaveDisc = async () => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
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
            await onSaveStudent(semesterToSave, { ...student, 'Disciplinary Action': updatedValue } as StudentDataRow);
            // Fix: Correctly close the form using setIsDiscFormOpen instead of isDiscHistoryOpen
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
                                <input type="date" value={editFormData[field] || ''} onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                            ) : field === 'Mentor' ? (
                                <SearchableSelect value={editFormData[field] || ''} onChange={(v) => setEditFormData({ ...editFormData, [field]: v })} options={employeeOptions} />
                            ) : (
                                <input type="text" value={editFormData[field] || ''} onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex space-x-2"><button onClick={() => setActivePopup(null)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg uppercase">Cancel</button><button onClick={handleSaveInlineForm} disabled={isSaving} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg uppercase shadow-md flex items-center justify-center">{isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />} Save</button></div>
            </div>
        );
    };

    const handleSaveFollowup = async (finalData?: any) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) {
            alert("Error: Semester information missing for this student.");
            return;
        }

        const d = finalData || followupFormData;
        const categoryValue = d.Category || (followupContext === 'defense' ? 'Defense Follow up' : followupContext === 'registration' ? 'Registration Follow up' : followupContext === 'dues' ? 'Dues Follow up' : 'General Follow up');
        const targetSemValue = d['Target Semester'] || '';
        const targetPeriodValue = d['Exam Period'] || 'Registration';
        
        if (followupContext === 'registration' || followupContext === 'dues' || followupContext === 'defense') {
            const prefix = followupContext === 'registration' ? 'reg' : (followupContext === 'dues' ? 'dues' : 'defense');
            const targetUid = `${prefix}-${normalizeSemesterName(targetSemValue)}-${normalizeSemesterName(targetPeriodValue)}`;
            setExpandedRemarks(new Set([targetUid]));
            setIsRemarksOpen(true);
        }

        setShowFollowupForm(false);
        setIsSaving(true);
        try {
            const now = new Date();
            const timePart = now.toTimeString().split(' ')[0];
            const combinedDate = `${now.toISOString().split('T')[0]} ${timePart}`;
            const reFollowupDate = (d['Re-follow up'] || '').split(' ')[0].split('T')[0];
            const contactedByText = d['Contacted By'] || '';
            const idMatch = contactedByText.match(/\(([^)]+)\)$/);
            const contactedById = idMatch ? idMatch[1] : contactedByText;
            
            const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);

            if (editingFollowupIndex !== null && editingFollowupIndex >= 0) {
                // EDIT LOGIC
                const fields = entries[editingFollowupIndex].split(FIELD_SEP).map(f => f.trim());
                fields[1] = d.Status;
                fields[2] = contactedById;
                fields[3] = reFollowupDate;
                fields[5] = (d.Remark || d.Status).replace(/\n/g, ' ');
                if (d.Category) fields[6] = d.Category;
                if (targetPeriodValue) fields[7] = targetPeriodValue;
                while (fields.length < 9) fields.push('');
                fields[8] = 'Done';
                entries[editingFollowupIndex] = fields.join(FIELD_SEP);
                const updatedRemarksStr = deduplicateRemarks(entries).join(RECORD_SEP);
                await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': updatedRemarksStr } as StudentDataRow);
            } else {
                // ADD LOGIC
                const processedRemarks = entries.map(re => {
                    const fields = re.split(FIELD_SEP).map(f => f.trim());
                    const isCatMatch = fields[6] === categoryValue;
                    const isSemMatch = normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSemValue);
                    if (isCatMatch && isSemMatch && (fields[8] === 'Pending' || (!fields[8] && fields[1] === 'Pending'))) {
                        while (fields.length < 9) fields.push('');
                        fields[8] = 'Done'; return fields.join(FIELD_SEP);
                    }
                    return re;
                });

                const mainEntryFields = [combinedDate, d.Status, contactedById, reFollowupDate, targetSemValue, (d.Remark || d.Status).replace(/\n/g, ' '), categoryValue, targetPeriodValue, 'Done'];
                processedRemarks.push(mainEntryFields.join(FIELD_SEP));

                if (d.snoozeDate && d.snoozeRemark) {
                    const snoozeEntryFields = [combinedDate, d.Status, contactedById, d.snoozeDate, targetSemValue, d.snoozeRemark, categoryValue, targetPeriodValue, 'Pending'];
                    processedRemarks.push(snoozeEntryFields.join(FIELD_SEP));
                    const globalPayload = { 'uniqueid': `SF-SNZ-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': d.snoozeRemark, 'Re-follow up': d.snoozeDate, 'Target Semester': targetSemValue, 'Status': 'Pending', 'Contacted By': contactedById, 'Category': categoryValue, 'Timestamp': new Date().toLocaleString() };
                    await submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
                }

                const updatedRemarksStr = deduplicateRemarks(processedRemarks).join(RECORD_SEP);
                await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': updatedRemarksStr } as StudentDataRow);
                
                const mainPayload = { 'uniqueid': `SF-AUTO-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': d.Remark || d.Status, 'Re-follow up': reFollowupDate, 'Target Semester': targetSemValue, 'Status': d.Status, 'Contacted By': contactedById, 'Category': categoryValue, 'Timestamp': new Date().toLocaleString() };
                await submitSheetData('add', SHEET_NAMES.FOLLOWUP, mainPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
            }
            await reloadData('followup', false);
        } finally {
            setIsSaving(false);
            setEditingFollowupIndex(null);
        }
    };

    const handleSaveDues = async (duesData: any) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
        
        const targetSem = `${duesData.semester} ${duesData.year}`;
        const targetPeriod = duesData.period;
        const targetUid = `dues-${normalizeSemesterName(targetSem)}-${normalizeSemesterName(targetPeriod)}`;
        
        const now = new Date();
        const combinedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
        const approverId = (duesData.approver.match(/\(([^)]+)\)$/) || [])[1] || duesData.approver;
        const duesFields = [combinedDate, duesData.amount, duesData.period, targetSem, approverId, duesData.historyRemark];
        if (editingDuesData?.DoneStatus === 'DONE') duesFields.push('DONE');
        const entryStr = duesFields.join(FIELD_SEP);
        const rawDues = student['Dues'] || '';
        const entries = rawDues.includes(FIELD_SEP) ? rawDues.split(RECORD_SEP).map(s => s.trim()).filter(Boolean) : [];
        if (editingDuesIndex !== null && editingDuesIndex >= 0) entries[editingDuesIndex] = entryStr;
        else entries.push(entryStr);
        const updatedDues = entries.join(RECORD_SEP);
        
        let updatedRemarks = student['Discussion Remark'] || '';
        let globalFollowupPayload: any = null;

        if (duesData.snoozeDate && duesData.snoozeRemark) {
            const remarkEntries = updatedRemarks.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            const processedRemarks = remarkEntries.map(re => {
                const fields = re.split(FIELD_SEP).map(f => f.trim());
                const isCatMatch = fields[6]?.trim().toLowerCase() === 'dues follow up';
                const isSemMatch = normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSem);
                const isPeriodMatch = fields[7] === targetPeriod;
                if (isCatMatch && isSemMatch && isPeriodMatch && (fields[8] === 'Pending' || (!fields[8] && fields[1] === 'Pending'))) {
                    while (fields.length < 9) fields.push('');
                    fields[8] = 'Done'; return fields.join(FIELD_SEP);
                }
                return re;
            });
            const snoozeEntryFields = [combinedDate, 'Dues Set', 'System', duesData.snoozeDate, targetSem, duesData.snoozeRemark, 'Dues Follow up', targetPeriod, 'Pending'];
            processedRemarks.push(snoozeEntryFields.join(FIELD_SEP));
            updatedRemarks = processedRemarks.join(RECORD_SEP);
            globalFollowupPayload = { 'uniqueid': `SF-SNZ-DUES-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': duesData.snoozeRemark, 'Re-follow up': duesData.snoozeDate, 'Target Semester': targetSem, 'Status': 'Pending', 'Contacted By': 'System', 'Category': 'Dues Follow up', 'Timestamp': new Date().toLocaleString() };
        }

        setExpandedRemarks(new Set([targetUid]));
        setIsRemarksOpen(true);
        setShowDuesForm(false); 
        onSaveStudent(semesterToSave, { ...student, 'Dues': updatedDues, 'Discussion Remark': updatedRemarks } as StudentDataRow);

        setIsSaving(true);
        try {
            if (globalFollowupPayload) {
                await submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalFollowupPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
            }
            await reloadData('followup', false);
        } finally {
            setIsSaving(false);
            setEditingDuesIndex(null); setEditingDuesData(null);
        }
    };

    const handleSaveSnooze = async (snoozeData: { snoozeDate: string; remark: string; status?: string; contactedBy?: string }) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave || !snoozeContext) return;

        const targetSem = (snoozeContext['Target Semester'] || '').trim();
        const targetPeriod = (snoozeContext['Exam Period'] || '').trim();
        const prefix = followupContext === 'registration' ? 'reg' : (followupContext === 'dues' ? 'dues' : 'standard');
        const targetUid = `${prefix}-${normalizeSemesterName(targetSem)}-${normalizeSemesterName(targetPeriod)}`;
        
        // IMMEDIATE UI CLOSE
        setShowSnoozeForm(false);
        setExpandedRemarks(new Set([targetUid]));
        setIsRemarksOpen(true);
        
        let updatedEntries: string[] = [];
        const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
        let category = 'General Follow up';
        if (followupContext === 'registration') category = 'Registration Follow up';
        else if (followupContext === 'dues') category = 'Dues Follow up';
        else if (followupContext === 'defense') category = 'Defense Follow up';

        let personnel = 'System';
        if (snoozeData.contactedBy) {
            const idMatch = snoozeData.contactedBy.match(/\(([^)]+)\)$/);
            personnel = idMatch ? idMatch[1] : snoozeData.contactedBy;
        }

        const now = new Date();
        const combinedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

        if (editingFollowupIndex !== null && editingFollowupIndex >= 0) {
            // EDIT MODE
            const fields = entries[editingFollowupIndex].split(FIELD_SEP).map(f => f.trim());
            fields[1] = snoozeData.status || fields[1];
            fields[2] = personnel;
            fields[3] = snoozeData.snoozeDate;
            fields[5] = snoozeData.remark;
            while (fields.length < 9) fields.push('');
            fields[8] = 'Pending';
            entries[editingFollowupIndex] = fields.join(FIELD_SEP);
            updatedEntries = entries;
        } else {
            // ADD MODE
            const remarkEntries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            const processedRemarks = remarkEntries.map(re => {
                const fields = re.split(FIELD_SEP).map(f => f.trim());
                const isCatMatch = fields[6]?.trim().toLowerCase() === category.toLowerCase();
                const isSemMatch = normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSem);
                const isPeriodMatch = (followupContext === 'registration' || followupContext === 'defense') ? true : fields[7] === targetPeriod;
                if (isCatMatch && isSemMatch && isPeriodMatch && (fields[8] === 'Pending' || (!fields[8] && fields[1] === 'Pending'))) {
                    while (fields.length < 9) fields.push('');
                    fields[8] = 'Done'; return fields.join(FIELD_SEP);
                }
                return re;
            });
            const interactionFields = [combinedDate, snoozeData.status || 'Pending', personnel, snoozeData.snoozeDate, targetSem, snoozeData.remark, category, targetPeriod, 'Pending'];
            processedRemarks.push(interactionFields.join(FIELD_SEP));
            updatedEntries = processedRemarks;
        }

        const deduplicatedRemarksStr = deduplicateRemarks(updatedEntries).join(RECORD_SEP);
        
        // OPTIMISTIC UPDATE: Trigger parent state change before background sync
        onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': deduplicatedRemarksStr } as StudentDataRow);

        setIsSaving(true);
        try {
            if (editingFollowupIndex === null) {
                // Only send to global followup sheet if it's a NEW snooze
                const globalPayload = { 'uniqueid': `SF-SNZ-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': snoozeData.remark, 'Re-follow up': snoozeData.snoozeDate, 'Target Semester': targetSem, 'Status': 'Pending', 'Contacted By': personnel, 'Category': category, 'Timestamp': new Date().toLocaleString() };
                await submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
            }
            await reloadData('followup', false);
        } finally {
            setIsSaving(false);
            setSnoozeContext(null); setEditingFollowupIndex(null);
        }
    };

    const handleSaveSnoozeClear = useCallback(async (context: any) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave || !context) return;
        setIsSaving(true);
        try {
            const targetSem = (context['Target Semester'] || '').trim();
            const targetPeriod = (context['Exam Period'] || '').trim();
            
            let newDuesValue = student['Dues'] || '';
            if (followupContext === 'dues') {
                if (!newDuesValue.includes(FIELD_SEP)) {
                    const now = new Date();
                    const combinedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
                    newDuesValue = [combinedDate, newDuesValue, 'Registration', '', 'System', `Legacy dues marked as done.`, 'DONE'].join(FIELD_SEP);
                } else {
                    const entries = newDuesValue.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
                    if (context._index >= 0 && context._index < entries.length) {
                        const fields = entries[context._index].split(FIELD_SEP).map(f => f.trim());
                        while (fields.length < 6) fields.push('');
                        fields[6] = 'DONE'; entries[context._index] = fields.join(FIELD_SEP);
                        newDuesValue = entries.join(RECORD_SEP);
                    } else {
                        const updatedEntries = entries.map(entry => {
                            const fields = entry.split(FIELD_SEP).map(f => f.trim());
                            const isMatch = normalizeSemesterName(fields[3]) === normalizeSemesterName(targetSem) && fields[2] === targetPeriod;
                            if (isMatch) {
                                while (fields.length < 6) fields.push('');
                                fields[6] = 'DONE'; return fields.join(FIELD_SEP);
                            }
                            return entry;
                        });
                        newDuesValue = updatedEntries.join(RECORD_SEP);
                    }
                }
            }

            const remarkEntries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            let category = 'General Follow up';
            if (followupContext === 'registration') category = 'Registration Follow up';
            else if (followupContext === 'dues') category = 'Dues Follow up';
            else if (followupContext === 'defense') category = 'Defense Follow up';

            const resolvedRemarks = remarkEntries.map(re => {
                const fields = re.split(FIELD_SEP).map(f => f.trim());
                const isCatMatch = fields[6]?.trim().toLowerCase() === category.toLowerCase();
                const isSemMatch = normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSem);
                const isPeriodMatch = (followupContext === 'registration' || followupContext === 'defense') ? true : fields[7] === targetPeriod;
                if (isCatMatch && isSemMatch && isPeriodMatch && (fields[8] === 'Pending' || (!fields[8] && fields[1] === 'Pending'))) {
                    while (fields.length < 9) fields.push('');
                    fields[8] = 'Done'; return fields.join(FIELD_SEP);
                }
                return re;
            });
            const finalRemarksStr = deduplicateRemarks(resolvedRemarks).join(RECORD_SEP);
            await onSaveStudent(semesterToSave, { ...student, 'Dues': newDuesValue, 'Discussion Remark': finalRemarksStr } as StudentDataRow);
        } finally {
            setIsSaving(false);
        }
    }, [studentSemester, student, onSaveStudent, followupContext]);

    const handleDeleteFollowup = async (index: number, source: string = 'discussion') => {
        setConfirmDeleteInfo(null);
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
        setIsSaving(true);
        try {
            let updatedRemarks = student['Discussion Remark'] || '';
            let updatedDues = student['Dues'] || '';
            if (source === 'dues') {
                const entries = updatedDues.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
                if (index >= 0 && index < entries.length) {
                    const duesFields = entries[index].split(FIELD_SEP).map(f => f.trim());
                    const targetSem = (duesFields[3] || '').trim(), targetPeriod = (duesFields[2] || '').trim();
                    const remarkEntries = updatedRemarks.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
                    const filteredRemarks = remarkEntries.filter(re => {
                        const fields = re.split(FIELD_SEP).map(f => f.trim());
                        return !(fields[6]?.trim().toLowerCase() === 'dues follow up' && normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSem) && fields[7] === targetPeriod);
                    });
                    updatedRemarks = filteredRemarks.join(RECORD_SEP);
                    entries.splice(index, 1); 
                    updatedDues = entries.join(RECORD_SEP);
                }
            } else {
                const remarkEntries = updatedRemarks.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
                if (index >= 0 && index < remarkEntries.length) {
                    remarkEntries.splice(index, 1);
                    updatedRemarks = remarkEntries.join(RECORD_SEP);
                }
            }
            const finalRemarksStr = deduplicateRemarks(updatedRemarks.split(RECORD_SEP)).join(RECORD_SEP);
            await onSaveStudent(semesterToSave, { ...student, 'Dues': updatedDues, 'Discussion Remark': finalRemarksStr } as StudentDataRow);
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleStatCardClick = useCallback((type: string) => {
        if (type === 'history') { setActivePopup(null); setIsRemarksOpen(false); setFollowupContext('standard'); }
        else if (type === 'remarks') { setIsRemarksOpen(true); setActivePopup(null); setFollowupContext('registration'); }
        else if (type === 'remarks-defense') { setIsRemarksOpen(true); setActivePopup(null); setFollowupContext('defense'); }
        else if (type === 'remarks-dues') { setIsRemarksOpen(true); setActivePopup(null); setFollowupContext('dues'); }
        else { setActivePopup(type); setIsRemarksOpen(false); setFollowupContext('standard'); }
    }, []);

    const dropInfo = useMemo(() => {
        const classification = student['Dropout Classification'];
        if (!classification || isValEmpty(classification)) return null;
        if (classification.includes('Permanent')) return { label: 'P. Drop', color: 'text-rose-700' };
        if (classification.includes('Temporary')) return { label: 'T. Drop', color: 'text-orange-600' };
        return { label: classification, color: 'text-slate-600' };
    }, [student]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white font-sans h-full">
            <div className="bg-white border-b border-slate-100 p-2.5 shadow-sm shrink-0 relative z-50">
                <StudentIdentity student={student} program={program} dropInfo={dropInfo} onDropClick={() => { setActivePopup('dropout'); setIsRemarksOpen(false); }} />
            </div>
            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/20">
                <div className="p-2.5 pb-0"><StudentStatsGrid student={student} activePopup={activePopup} onCardClick={handleStatCardClick} isCreditsMet={parseFloat(student['Credit Completed'] || '0') >= parseFloat(student['Credit Requirement'] || '0')} isDefenseSuccess={student['Defense Status']?.toLowerCase() === 'complete'} isDegreeDone={student['Degree Status']?.toLowerCase() === 'complete'} lastRegSemester={historyData.length > 0 ? historyData[0].semester : 'None'} mentorAssigned={!isValEmpty(student?.Mentor)} /></div>
                <div className="flex-1 flex flex-col overflow-hidden relative p-2"><StudentRegistrationHistory historyData={historyData} /></div>
                {activePopup && !['history', 'remarks', 'remarks-defense', 'remarks-dues'].includes(activePopup) && (<div className="absolute inset-0 z-20 p-2"><div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-full relative">{activePopup === 'dropout' ? <StudentDropoutControl onClose={() => setActivePopup(null)} onUpdate={(type) => handleQuickUpdate({ 'Dropout Classification': type })} /> : renderInlineEditForm()}</div></div>)}
                <StudentRemarksPanel 
                    isOpen={isRemarksOpen} onClose={() => setIsRemarksOpen(false)}
                    historyRemarks={historyRemarks} expandedRemarks={expandedRemarks} 
                    toggleRemarkExpansion={(uid) => setExpandedRemarks(prev => prev.has(uid) ? new Set() : new Set([uid]))}
                    formatDate={formatDisplayDate} 
                    onAddFollowup={() => { 
                        if (followupContext === 'dues') { 
                            setEditingDuesIndex(null); setEditingDuesData(null); setShowDuesForm(true); 
                        } else if (followupContext !== 'registration') { 
                            const now = new Date(); const datePart = now.toISOString().split('T')[0]; 
                            setFollowupFormData({ Date: datePart, Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '', 'Target Semester': '', Category: followupContext === 'defense' ? 'Defense Follow up' : '' }); 
                            setEditingFollowupIndex(null); setShowFollowupForm(true); 
                        } 
                    }}
                    onEditFollowup={(item) => { 
                        if (item._source === 'dues') { setEditingDuesIndex(item._index); setEditingDuesData(item); setShowDuesForm(true); } 
                        else if (item.SemanticStatus === 'Pending' || item.SemanticStatus === 'Done') { setEditingFollowupIndex(item._index); setSnoozeContext(item); setShowSnoozeForm(true); }
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
                    regHistory={historyData}
                />
            </div>
            {isDiscFormOpen && (<div className="absolute inset-0 z-[150] p-3 bg-white/95 backdrop-blur-sm"><StudentDisciplinaryForm mode={editingDiscIndex !== null ? 'edit' : 'add'} discReason={discReason} setDiscReason={setDiscReason} discFromDate={discFromDate} setDiscFromDate={setDiscFromDate} discToDate={discToDate} setDiscToDate={setDiscToDate} isExpired={discStatus.isExpired} isSaving={isSaving} onSave={handleSaveDisc} onClose={() => setIsDiscFormOpen(false)} /></div>)}
            {showFollowupForm && (<StudentFollowupForm student={student} formData={followupFormData} setFormData={setFollowupFormData} employeeOptions={employeeOptions} statusOptions={statusOptions} isSaving={isSaving} onSave={handleSaveFollowup} onClose={() => setShowFollowupForm(false)} />)}
            {showDuesForm && (<StudentDuesForm student={student} employeeOptions={employeeOptions} isSaving={isSaving} onSave={handleSaveDues} onClose={() => { setShowDuesForm(false); setEditingDuesData(null); setEditingDuesIndex(null); }} initialData={editingDuesData} />)}
            {showSnoozeForm && (<StudentSnoozeForm student={student} isSaving={isSaving} onSave={handleSaveSnooze} onClose={() => { setShowSnoozeForm(false); setSnoozeContext(null); setEditingFollowupIndex(null); }} initialData={editingFollowupIndex !== null ? snoozeContext : null} statusOptions={statusOptions} employeeOptions={employeeOptions} isRegistration={followupContext === 'registration'} />)}
            <ConfirmDialog isOpen={confirmDeleteInfo !== null} title="Delete Record?" message={confirmDeleteInfo?.source === 'dues' ? "This will permanently delete the Main Dues Record and ALL associated History Logs for this session. This cannot be undone." : "This action will permanently remove this history log. The Main Dues record will remain unchanged."} onConfirm={() => confirmDeleteInfo !== null && handleDeleteFollowup(confirmDeleteInfo.index, confirmDeleteInfo.source)} onCancel={() => setConfirmDeleteInfo(null)} />
            <ConfirmDialog confirmLabel="Clear" isOpen={confirmClearDisc} title="Clear All Records?" message="Are you sure you want to clear all disciplinary history for this student? This is a permanent action." onConfirm={() => { 
                const semesterToSave = studentSemester || (student as any)._semester;
                setConfirmClearDisc(false); 
                onSaveStudent(semesterToSave!, { ...student, 'Disciplinary Action': '' } as StudentDataRow); 
            }} onCancel={() => setConfirmClearDisc(false)} />
        </div>
    );
};