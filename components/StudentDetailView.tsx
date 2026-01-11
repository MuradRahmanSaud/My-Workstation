import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, MessageSquareQuote, Save, ArrowLeft, Loader2, Plus, User, Mail, Phone, Hash, Briefcase, GraduationCap, Calendar, Award, Banknote, CalendarCheck, ShieldQuestion, Pencil } from 'lucide-react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow, StudentFollowupRow } from '../types';
import { isValEmpty, getImageUrl } from '../views/EmployeeView';
import { useSheetData } from '../hooks/useSheetData';
import { submitSheetData, normalizeId, normalizeSemesterString } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID, STUDENT_LINK_SHEET_ID } from '../constants';

// Refactored Sub-components
import { StudentIdentity } from './StudentProfile/StudentIdentity';
import { StudentStatsGrid } from './StudentProfile/StudentStatsGrid';
import { StudentDropoutControl } from './StudentProfile/StudentDropoutControl';
import { StudentRemarksPanel, normalizeSemesterName } from './StudentProfile/StudentRemarksPanel';
import { StudentRegistrationHistory } from './StudentRegistrationHistory';
import { StudentDisciplinaryForm } from './StudentDisciplinaryForm';
import { StudentFollowupForm } from './StudentFollowupForm';
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
    const { uniqueSemesters, studentFollowupData, reloadData, data: sectionData, studentDataLinks } = useSheetData();
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
    const [activeDefenseMode, setActiveDefenseMode] = useState<'tracking' | 'snooze'>('snooze');

    const historyRemarks = useMemo(() => {
        const isDues = followupContext === 'dues';
        const isReg = followupContext === 'registration';
        const isDef = followupContext === 'defense';
        const rawRemarks = student['Discussion Remark'];
        let remarkEntries: any[] = [];
        
        if (!isValEmpty(rawRemarks)) {
            remarkEntries = rawRemarks!.split(RECORD_SEP).map(s => s.trim()).filter(Boolean).map((entry: string, idx) => {
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
                    'SemanticStatus': (fields[8] || fields[1] || '').trim(),
                    'Student ID': student['Student ID'], 
                    'Student Name': student['Student Name'],
                    'uniqueid': `remark-${idx}`, _index: idx,
                    _source: 'discussion'
                };
            });
        }

        if (isDues) {
            const duesRelatedRemarks = remarkEntries.filter(r => r.Category?.trim().toLowerCase() === 'dues follow up');
            return duesRelatedRemarks.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }
        
        if (isDef) {
            const list = remarkEntries.filter(r => r.Category?.trim().toLowerCase() === 'defense follow up');
            
            const packedDef = student['Defense Status'] || '';
            if (packedDef.includes(' ;; ')) {
                const f = packedDef.split(' ;; ').map(x => x.trim());
                list.unshift({
                    Date: f[0] || 'Unknown',
                    Status: f[1] || 'On going',
                    'Contacted By': f[2] || 'Unassigned',
                    'DefenseType': f[3] || 'Thesis',
                    'Remark': f[4] || '',
                    'LibraryClearance': f[5] || 'Pending',
                    _source: 'packed-defense'
                } as any);
            }
            return list.sort((a, b) => {
                if (a._source === 'packed-defense') return -1;
                if (b._source === 'packed-defense') return 1;
                return new Date(b.Date).getTime() - new Date(a.Date).getTime();
            });
        } else if (isReg) {
            return remarkEntries.filter(r => r.Category?.trim().toLowerCase() === 'registration follow up').sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }
        
        return remarkEntries.sort((a, b) => {
            const dateA = new Date(a.Date).getTime();
            const dateB = new Date(b.Date).getTime();
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            return dateB - dateA;
        });
    }, [student, followupContext]);

    // Helper to extract admission semester from DIU Student ID (e.g., 231-15-1234 -> Spring 2023)
    const getAdmissionSemesterFromId = useCallback((id: string) => {
        const match = id.match(/^(\d{2})(\d)/);
        if (!match) return null;
        const year = '20' + match[1];
        const sessionCode = match[2];
        const sessions: Record<string, string> = { '1': 'Spring', '2': 'Summer', '3': 'Fall' };
        const session = sessions[sessionCode];
        if (!session) return null;
        return `${session} ${year}`;
    }, []);

    const historyData = useMemo(() => {
        if (!registrationLookup) return [];
        const cleanId = normalizeId(student['Student ID']);
        const registeredSems = registrationLookup.get(cleanId) || new Set();
        
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };

        // Determine actual admission semester for filtering
        const idAdmissionSem = getAdmissionSemesterFromId(student['Student ID']);
        const enrollmentSem = idAdmissionSem || studentSemester || '';
        const enrollmentParsed = parseSem(enrollmentSem);

        // Build a complete pool of semesters from all available system sources
        const allAvailableSemNames = new Set<string>();
        uniqueSemesters.forEach(s => { if (s !== 'All') allAvailableSemNames.add(s); });
        // Fix: Explicitly cast Array.from result to string array to resolve unknown type issues during add()
        (Array.from(studentDataLinks.keys()) as string[]).forEach(s => allAvailableSemNames.add(s));
        if (enrollmentSem) allAvailableSemNames.add(enrollmentSem);

        const allSemesters = Array.from(allAvailableSemNames)
            .map(s => ({ original: s, ...parseSem(s) }))
            .sort((a, b) => a.year !== b.year ? a.year - b.year : a.season - b.season);

        return allSemesters.filter(sem => { 
            if (sem.year > enrollmentParsed.year) return true; 
            if (sem.year === enrollmentParsed.year && sem.season >= enrollmentParsed.season) return true; 
            return false; 
        }).map(sem => { 
            const normalizedSemName = normalizeSemesterString(sem.original);
            const isRegistered = registeredSems.has(normalizedSemName); 
            return { 
                semester: sem.original, 
                isRegistered: isRegistered, 
                taken: isRegistered ? 15 : null, 
                complete: isRegistered ? 15 : null, 
                sgpa: isRegistered ? (3.2 + Math.random() * 0.7).toFixed(2) : null, 
                dues: 0 
            }; 
        }).sort((a, b) => { 
            const pa = parseSem(a.semester), pb = parseSem(b.semester); 
            if (pa.year !== pb.year) return pb.year - pa.year; 
            return pb.season - pa.season; 
        });
    }, [registrationLookup, student['Student ID'], studentSemester, uniqueSemesters, studentDataLinks, getAdmissionSemesterFromId]);

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
            await onSaveStudent(semesterToSave, { ...student, ...payload } as StudentDataRow);
        } finally { setIsSaving(true); }
    }, [studentSemester, student, onSaveStudent]);

    const handleSaveInlineForm = () => { handleQuickUpdate(editFormData); };

    const [discReason, setDiscReason] = useState('');
    const [discFromDate, setDiscFromDate] = useState('');
    const [discToDate, setDiscToDate] = useState('');

    const statusOptions = useMemo(() => {
        const defaults = [
            'Call Busy', 
            'Not Reachable', 
            'Academic Reasons',
            'Financial Reasons',
            'Administrative / System Reasons',
            'Personal / Family Reasons',
            'Job / Career Reasons',
            'Transfer / Change Reasons',
            'Decision / Motivation Reasons',
            'Death-Related',
            'Health / Medical Related',
            'Legal / Compliance Issues',
            'Extracurricular-Sports-Arts',
            'Miscellaneous'
        ];
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
            setIsDiscFormOpen(false);
        } finally { setIsSaving(false); }
    };

    const handleSaveFollowup = async (finalData?: any) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
        const d = finalData || followupFormData;
        const categoryValue = d.Category || (followupContext === 'defense' ? 'Defense Follow up' : followupContext === 'registration' ? 'Registration Follow up' : followupContext === 'dues' ? 'Dues Follow up' : 'General Follow up');
        const targetSemValue = d['Target Semester'] || '';
        const targetPeriodValue = d['Exam Period'] || 'Registration';
        const isDues = categoryValue === 'Dues Follow up';
        
        setShowFollowupForm(false);
        setIsSaving(true);
        try {
            const now = new Date();
            const combinedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
            const reFollowupDate = (d['Re-follow up'] || '').split(' ')[0].split('T')[0];
            const contactedByText = d['Contacted By'] || '';
            const idMatch = contactedByText.match(/\(([^)]+)\)$/);
            const contactedById = idMatch ? idMatch[1] : contactedByText;
            const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            
            const categoricalStatus = d.Status || 'Pending';
            const savedStatus = isDues ? (d.amount ? `BDT ${d.amount}` : categoricalStatus) : categoricalStatus;
            const semanticStatusValue = `Done: ${categoricalStatus}`;

            if (editingFollowupIndex !== null && editingFollowupIndex >= 0) {
                const fields = entries[editingFollowupIndex].split(FIELD_SEP).map(f => f.trim());
                fields[1] = savedStatus; fields[2] = contactedById; fields[3] = reFollowupDate; fields[5] = (d.Remark || categoricalStatus).replace(/\n/g, ' '); if (d.Category) fields[6] = d.Category; if (targetPeriodValue) fields[7] = targetPeriodValue; while (fields.length < 9) fields.push(''); fields[8] = semanticStatusValue;
                entries[editingFollowupIndex] = fields.join(FIELD_SEP);
                const updatedRemarksStr = deduplicateRemarks(entries).join(RECORD_SEP);
                await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': updatedRemarksStr } as StudentDataRow);
            } else {
                const processedRemarks = entries.map(re => {
                    const fields = re.split(FIELD_SEP).map(f => f.trim());
                    const isCatMatch = fields[6] === categoryValue;
                    const isSemMatch = normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSemValue);
                    const isPeriodMatch = isDues ? fields[7] === targetPeriodValue : true;
                    if (isCatMatch && isSemMatch && isPeriodMatch && (fields[8]?.startsWith('Pending') || (!fields[8] && fields[1] === 'Pending'))) {
                        while (fields.length < 9) fields.push(''); fields[8] = `Done: ${fields[8]?.split(': ')[1] || fields[1]}`; return fields.join(FIELD_SEP);
                    }
                    return re;
                });
                const mainEntryFields = [combinedDate, savedStatus, contactedById, reFollowupDate, targetSemValue, (d.Remark || categoricalStatus).replace(/\n/g, ' '), categoryValue, targetPeriodValue, semanticStatusValue];
                processedRemarks.push(mainEntryFields.join(FIELD_SEP));
                const updatedRemarksStr = deduplicateRemarks(processedRemarks).join(RECORD_SEP);
                await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': updatedRemarksStr } as StudentDataRow);
                const mainPayload = { 'uniqueid': `SF-AUTO-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': d.Remark || categoricalStatus, 'Re-follow up': reFollowupDate, 'Target Semester': targetSemValue, 'Status': savedStatus, 'Contacted By': contactedById, 'Category': categoryValue, 'Timestamp': new Date().toLocaleString() };
                await submitSheetData('add', SHEET_NAMES.FOLLOWUP, mainPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
            }
            await reloadData('followup', false);
        } finally { setIsSaving(false); setEditingFollowupIndex(null); }
    };

    const [showFollowupForm, setShowFollowupForm] = useState(false);
    const [showSnoozeForm, setShowSnoozeForm] = useState(false);
    const [snoozeContext, setSnoozeContext] = useState<any>(null);

    const handleSaveSnooze = async (snoozeData: { snoozeDate: string; remark: string; status?: string; contactedBy?: string; amount?: string; defenseData?: any; isTrackingUpdate?: boolean; targetSemester?: string }) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
        
        const currentContext = snoozeContext || { Category: followupContext === 'defense' ? 'Defense Follow up' : (followupContext === 'dues' ? 'Dues Follow up' : (followupContext === 'registration' ? 'Registration Follow up' : 'General Follow up')), 'Target Semester': snoozeData.targetSemester || '', 'Exam Period': 'Registration' };
        const category = currentContext.Category || 'General Follow up';
        const isDefense = category === 'Defense Follow up';
        
        setShowSnoozeForm(false); 
        setIsSaving(true);
        
        if (isDefense && snoozeData.isTrackingUpdate && snoozeData.defenseData) {
            const def = snoozeData.defenseData;
            const packedStatus = [
                def.regFormDate,
                def.defenseStatus,
                def.defenseSupervisor,
                def.defenseType,
                def.reportTitle,
                def.libraryClearance
            ].join(' ;; ');

            try {
                await onSaveStudent(semesterToSave, { 
                    ...student, 
                    'Defense Status': packedStatus 
                } as StudentDataRow);
            } finally {
                setIsSaving(false); 
                setSnoozeContext(null);
            }
            return;
        }

        let personnel = 'System';
        if (snoozeData.contactedBy) { 
            const idMatch = snoozeData.contactedBy.match(/\(([^)]+)\)$/); 
            personnel = idMatch ? idMatch[1] : snoozeData.contactedBy; 
        }
        
        const now = new Date(); 
        const combinedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
        const remarkEntries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);

        const categoricalStatus = snoozeData.status || 'Pending';
        const isDues = category === 'Dues Follow up';
        const savedStatus = isDues ? (snoozeData.amount ? `BDT ${snoozeData.amount}` : categoricalStatus) : categoricalStatus;
        const semanticStatusValue = `Pending: ${categoricalStatus}`;

        if (editingFollowupIndex !== null && editingFollowupIndex >= 0) {
            const originalFields = remarkEntries[editingFollowupIndex].split(FIELD_SEP).map(f => f.trim());
            originalFields[1] = savedStatus;
            originalFields[2] = personnel;
            originalFields[3] = snoozeData.snoozeDate;
            originalFields[5] = snoozeData.remark;
            while (originalFields.length < 9) originalFields.push('');
            originalFields[8] = semanticStatusValue; 

            remarkEntries[editingFollowupIndex] = originalFields.join(FIELD_SEP);
            const finalRemarksStr = deduplicateRemarks(remarkEntries).join(RECORD_SEP);
            await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': finalRemarksStr } as StudentDataRow);
        } else {
            const targetSem = (snoozeData.targetSemester || currentContext['Target Semester'] || '').trim();
            const targetPeriod = (currentContext['Exam Period'] || '').trim();

            const processedRemarks = remarkEntries.map(re => {
                const fields = re.split(FIELD_SEP).map(f => f.trim());
                if (fields[6]?.trim().toLowerCase() === category.toLowerCase() && normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSem) && (fields[7] === targetPeriod) && (fields[8]?.startsWith('Pending') || (!fields[8] && fields[1] === 'Pending'))) {
                    while (fields.length < 9) fields.push(''); 
                    fields[8] = `Done: ${fields[8]?.split(': ')[1] || fields[1]}`; return fields.join(FIELD_SEP);
                }
                return re;
            });

            const interactionFields = [combinedDate, savedStatus, personnel, snoozeData.snoozeDate, targetSem, snoozeData.remark, category, targetPeriod, semanticStatusValue];
            processedRemarks.push(interactionFields.join(FIELD_SEP)); 
            
            const deduplicatedRemarksStr = deduplicateRemarks(processedRemarks).join(RECORD_SEP);
            await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': deduplicatedRemarksStr } as StudentDataRow);
            
            try {
                const globalPayload = { 'uniqueid': `SF-SNZ-${Date.now()}`, 'Date': combinedDate, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'Remark': snoozeData.remark, 'Re-follow up': snoozeData.snoozeDate, 'Target Semester': targetSem, 'Status': savedStatus, 'Contacted By': personnel, 'Category': category, 'Timestamp': new Date().toLocaleString() };
                await submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
                await reloadData('followup', false);
            } catch(e) { console.error("Global log sync failed", e); }
        }
        
        setIsSaving(false); 
        setSnoozeContext(null); 
        setEditingFollowupIndex(null);
    };

    const handleSaveSnoozeClear = useCallback(async (context: any) => {
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave || !context) return;
        setIsSaving(true);
        try {
            const targetSem = (context['Target Semester'] || '').trim();
            const targetPeriod = (context['Exam Period'] || '').trim();
            const category = context.Category || 'General Follow up';

            const remarkEntries = (student['Discussion Remark'] || '').split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            const resolvedRemarks = remarkEntries.map(re => {
                const fields = re.split(FIELD_SEP).map(f => f.trim());
                if (fields[6]?.trim().toLowerCase() === category.toLowerCase() && normalizeSemesterName(fields[4]) === normalizeSemesterName(targetSem) && (fields[7] === targetPeriod) && (fields[8]?.startsWith('Pending') || (!fields[8] && fields[1] === 'Pending'))) {
                    while (fields.length < 9) fields.push(''); 
                    const categoricalStatus = fields[8]?.includes(':') ? fields[8].split(': ')[1] : fields[1];
                    fields[8] = `Done: ${categoricalStatus}`; 
                    return fields.join(FIELD_SEP);
                }
                return re;
            });
            const finalRemarksStr = deduplicateRemarks(resolvedRemarks).join(RECORD_SEP);
            await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': finalRemarksStr } as StudentDataRow);
        } finally { setIsSaving(false); }
    }, [studentSemester, student, onSaveStudent]);

    const handleDeleteFollowup = async (index: number, source: string = 'discussion') => {
        setConfirmDeleteInfo(null);
        const semesterToSave = studentSemester || (student as any)._semester;
        if (!semesterToSave) return;
        setIsSaving(true);
        try {
            let updatedRemarks = student['Discussion Remark'] || '';
            const remarkEntries = updatedRemarks.split(RECORD_SEP).map(s => s.trim()).filter(Boolean);
            if (index >= 0 && index < remarkEntries.length) { 
                remarkEntries.splice(index, 1); 
                updatedRemarks = remarkEntries.join(RECORD_SEP); 
            }
            await onSaveStudent(semesterToSave, { ...student, 'Discussion Remark': updatedRemarks } as StudentDataRow);
        } finally { setIsSaving(false); }
    };

    const handleStatCardClick = useCallback((type: string) => {
        if (type === 'history') { 
            setActivePopup(null); setIsRemarksOpen(false); setFollowupContext('standard'); 
        } else if (type === 'remarks') { 
            setFollowupContext('registration'); setActivePopup(null); setIsRemarksOpen(true); 
        } else if (type === 'remarks-defense') { 
            setFollowupContext('defense'); setActivePopup(null); setIsRemarksOpen(true); 
        } else if (type === 'remarks-dues') { 
            setFollowupContext('dues'); setActivePopup(null); setIsRemarksOpen(true); 
        } else { 
            setActivePopup(type); setIsRemarksOpen(false); setFollowupContext('standard'); 
        }
    }, []);

    const dropInfo = useMemo(() => {
        const classification = student['Dropout Classification'];
        if (!classification || isValEmpty(classification)) return null;
        if (classification.includes('Permanent')) return { label: 'P. Drop', color: 'text-rose-700' };
        if (classification.includes('Temporary')) return { label: 'T. Drop', color: 'text-orange-600' };
        return { label: classification, color: 'text-slate-600' };
    }, [student]);

    const renderInlineEditForm = () => {
        if (!activePopup) return null;

        const handleFieldChange = (key: string, value: string) => {
            setEditFormData((prev: any) => ({ ...prev, [key]: value }));
        };

        const renderField = (label: string, key: string, type: 'text' | 'number' | 'date' | 'select' = 'text', options?: string[]) => (
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">{label}</label>
                {type === 'select' ? (
                    <SearchableSelect 
                        value={editFormData[key] || ''} 
                        onChange={(val) => handleFieldChange(key, val)} 
                        options={options || []} 
                    />
                ) : (
                    <input 
                        type={type} 
                        value={editFormData[key] || ''} 
                        onChange={(e) => handleFieldChange(key, e.target.value)} 
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                )}
            </div>
        );

        return (
            <div className="flex flex-col h-full bg-white">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700 flex items-center">
                        <Pencil className="w-3.5 h-3.5 mr-2 text-blue-600" />
                        Edit {activePopup.charAt(0).toUpperCase() + activePopup.slice(1)}
                    </h4>
                    <button onClick={() => setActivePopup(null)} className="p-1 hover:bg-slate-50 rounded-full text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
                    {activePopup === 'credits' && (
                        <>
                            {renderField('Credit Requirement', 'Credit Requirement', 'number')}
                            {renderField('Credit Completed', 'Credit Completed', 'number')}
                        </>
                    )}
                    {activePopup === 'degree' && (
                        <>
                            {renderField('Degree Status', 'Degree Status', 'select', ['Not Applied', 'Applied', 'Processing', 'Complete'])}
                        </>
                    )}
                    {activePopup === 'mentor' && (
                        <>
                            {renderField('Mentor Name / ID', 'Mentor', 'select', employeeOptions)}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex space-x-2 shrink-0">
                    <button 
                        onClick={() => setActivePopup(null)} 
                        className="flex-1 py-2 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg uppercase hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveInlineForm}
                        disabled={isSaving}
                        className="flex-[1.5] py-2 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </div>
        );
    };

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
                        if ((followupContext as string) === 'defense') {
                            setActiveDefenseMode('tracking'); setSnoozeContext(null); setEditingFollowupIndex(null); setShowSnoozeForm(true);
                        } else if (followupContext !== 'registration' && followupContext !== 'dues') { 
                            const now = new Date(); const datePart = now.toISOString().split('T')[0]; 
                            setFollowupFormData({ Date: datePart, Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '', 'Target Semester': '', Category: (followupContext as string) === 'defense' ? 'Defense Follow up' : '' }); 
                            setEditingFollowupIndex(null); setShowFollowupForm(true); 
                        } 
                    }}
                    onEditFollowup={(item) => { 
                        if (item.SemanticStatus?.startsWith('Pending') || item.SemanticStatus?.startsWith('Done')) { setActiveDefenseMode('snooze'); setEditingFollowupIndex(item._index); setSnoozeContext(item); setShowSnoozeForm(true); }
                        else { const cleanDate = (item.Date || '').split(' ')[0].split('T')[0]; const cleanReFollowup = (item['Re-follow up'] || '').split(' ')[0].split('T')[0]; setFollowupFormData({ Date: cleanDate, Remark: item.Remark, 'Re-follow up': cleanReFollowup, Status: item.Status, 'Contacted By': item['Contacted By'], 'Target Semester': item['Target Semester'], Category: item.Category || '' } as any); setEditingFollowupIndex(item._index); setShowFollowupForm(true); } 
                    }}
                    onDeleteFollowup={(idx, source) => setConfirmDeleteInfo({ index: idx, source })}
                    onSnoozeFollowup={(item, mode) => { 
                        setActiveDefenseMode(mode || 'snooze'); setSnoozeContext(item); setEditingFollowupIndex(null); setShowSnoozeForm(true); 
                    }}
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
            {/* Fix: Use setFollowupFormData instead of undefined setFormData */}
            {showFollowupForm && (<StudentFollowupForm student={student} formData={followupFormData} setFormData={setFollowupFormData} employeeOptions={employeeOptions} statusOptions={statusOptions} isSaving={isSaving} onSave={handleSaveFollowup} onClose={() => setShowFollowupForm(false)} studentSemester={studentSemester} />)}
            {showSnoozeForm && (<StudentSnoozeForm student={student} isSaving={isSaving} onSave={handleSaveSnooze} onClose={() => { setShowSnoozeForm(false); setSnoozeContext(null); setEditingFollowupIndex(null); }} initialData={editingFollowupIndex !== null ? snoozeContext : null} statusOptions={statusOptions} employeeOptions={employeeOptions} isRegistration={followupContext === 'registration'} isDues={followupContext === 'dues'} isDefense={followupContext === 'defense'} defenseMode={activeDefenseMode} studentSemester={studentSemester} />)}
            <ConfirmDialog isOpen={confirmDeleteInfo !== null} title="Delete Record?" message={"This action will permanently remove this history log interaction. This cannot be undone."} onConfirm={() => confirmDeleteInfo !== null && handleDeleteFollowup(confirmDeleteInfo.index, confirmDeleteInfo.source)} onCancel={() => setConfirmDeleteInfo(null)} />
            <ConfirmDialog confirmLabel="Clear" isOpen={confirmClearDisc} title="Clear All Records?" message="Are you sure you want to clear all disciplinary history for this student? This is a permanent action." onConfirm={() => { const semesterToSave = studentSemester || (student as any)._semester; setConfirmClearDisc(false); onSaveStudent(semesterToSave!, { ...student, 'Disciplinary Action': '' } as StudentDataRow); }} onCancel={() => setConfirmClearDisc(false)} />
        </div>
    );
};