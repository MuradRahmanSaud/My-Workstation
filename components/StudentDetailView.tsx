import React, { useState, useMemo, useEffect } from 'react';
import { X, Pencil, Save, MessageSquareQuote, Plus, Clock, AlertTriangle, ShieldAlert, User, Mail, Phone, History, ChevronDown, ChevronUp, CalendarX, CheckCircle, Info, PowerOff, ShieldMinus, CalendarDays, UserCircle2, Trash2, Loader2, Calculator, ShieldCheck, GraduationCap, Banknote, UserPlus, Briefcase, Hash, PlusCircle } from 'lucide-react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow, StudentFollowupRow } from '../types';
import { normalizeId, submitSheetData, extractSheetIdAndGid } from '../services/sheetService';
import { SearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { useSheetData } from '../hooks/useSheetData';

// Sub-components
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentRegistrationHistory } from './StudentRegistrationHistory';
import { StudentDisciplinaryForm } from './StudentDisciplinaryForm';
import { StudentFollowupForm } from './StudentFollowupForm';

// Delimiters for structured storage in Discussion Remark
const RECORD_SEP = ' || ';
const FIELD_SEP = ' ;; ';

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

// Helper to check if a disciplinary record is expired
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
    const [isSaving, setIsSaving] = useState(false);
    
    // UI Popups State
    const [activePopup, setActivePopup] = useState<string | null>(null);
    const [isDiscFormOpen, setIsDiscFormOpen] = useState(false);
    const [isDiscHistoryOpen, setIsDiscHistoryOpen] = useState(false);
    const [showFollowupForm, setShowFollowupForm] = useState(false);
    
    // Quick Edit Local States
    const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});
    
    // Defense Type Dynamic Options
    const [defenseTypeOptions, setDefenseTypeOptions] = useState(['Thesis', 'Project', 'Internship']);
    const [isAddingNewType, setIsAddingNewType] = useState(false);
    const [newTypeInput, setNewTypeInput] = useState('');

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
    const [editingFollowupIndex, setEditingFollowupIndex] = useState<number | null>(null);

    // Sync Buffer on popup open
    useEffect(() => {
        if (activePopup) {
            const getFormattedLabel = (id: string | undefined) => {
                if (!id || id === 'TBA') return id || '';
                const normId = normalizeId(id);
                const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
                if (emp) return `${emp['Employee Name']} - ${emp['Academic Designation'] || emp['Administrative Designation']} (${id})`;
                const teacher = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
                if (teacher) return `${teacher['Employee Name']} - ${teacher.Designation} (${id})`;
                return id;
            };

            setEditBuffer({
                'Credit Requirement': student['Credit Requirement'] || '',
                'Credit Completed': student['Credit Completed'] || '',
                'Defense Registration': student['Defense Registration'] || '',
                'Defense Status': student['Defense Status'] || '',
                'Defense Type': student['Defense Type'] || '',
                'Defense Supervisor': getFormattedLabel(student['Defense Supervisor']),
                'Degree Status': student['Degree Status'] || '',
                'Dues': student['Dues'] || '',
                'Middle Name': student['Middle Name'] || '', 
                'Mentor': getFormattedLabel(student['Mentor']),
                'Discussion Remark': student['Discussion Remark'] || ''
            });

            if (student['Defense Type']) {
                const types = student['Defense Type'].split(',').map(t => t.trim()).filter(Boolean);
                setDefenseTypeOptions(prev => {
                    const newOptions = [...prev];
                    types.forEach(t => {
                        if (!newOptions.includes(t)) newOptions.push(t);
                    });
                    return newOptions;
                });
            }
        }
    }, [activePopup, student, diuEmployeeData, teacherData]);

    const closeAll = () => { 
        setActivePopup(null); 
        setIsDiscFormOpen(false); 
        setIsDiscHistoryOpen(false);
        setShowFollowupForm(false); 
        setEditingDiscIndex(null);
        setEditingFollowupIndex(null);
        setIsAddingNewType(false);
        setNewTypeInput('');
    };

    const toggleRemarkExpansion = (uid: string) => {
        setExpandedRemarks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) newSet.delete(uid);
            else newSet.add(uid);
            return newSet;
        });
    };

    // HISTORY LOGIC: Parse the history from 'Discussion Remark' column
    const historyRemarks = useMemo((): (StudentFollowupRow & { _index: number })[] => {
        const raw = student['Discussion Remark'];
        if (isValEmpty(raw)) return [];
        
        const entries = raw!.split(RECORD_SEP).filter(Boolean);
        return entries.map((entry, idx) => {
            const fields = entry.split(FIELD_SEP);
            return {
                Date: fields[0] || '',
                Status: fields[1] || '',
                'Contacted By': fields[2] || '',
                'Re-follow up': fields[3] || '',
                Remark: fields[4] || '',
                'Student ID': student['Student ID'],
                'Student Name': student['Student Name'],
                'uniqueid': `local-${idx}`,
                _index: idx
            };
        }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [student]);

    const dropStatus = useMemo(() => {
        const mainDropClass = student['Dropout Classification'];
        if (!isValEmpty(mainDropClass)) {
            if (mainDropClass?.includes('Permanent Drop')) return { type: 'Permanent', label: 'P. Drop', color: 'text-red-600' };
            if (mainDropClass?.includes('Temporary Drop')) return { type: 'Temporary', label: 'T. Drop', color: 'text-orange-500' };
        }
        if (historyRemarks.length === 0) return null;
        const latestWithDrop = historyRemarks.find(r => r.Status?.includes('Drop'));
        if (!latestWithDrop) return null;
        if (latestWithDrop.Status.includes('Permanent Drop')) return { type: 'Permanent', label: 'P. Drop', color: 'text-red-600' };
        if (latestWithDrop.Status.includes('Temporary Drop')) return { type: 'Temporary', label: 'T. Drop', color: 'text-orange-500' };
        return null;
    }, [student, historyRemarks]);

    const discRecords = useMemo(() => {
        const raw = student['Disciplinary Action'];
        if (!raw || isValEmpty(raw)) return [];
        if (raw.includes('||')) return raw.split('||').map(r => r.trim()).filter(Boolean);
        return [raw.trim()];
    }, [student['Disciplinary Action']]);

    const discStatus = useMemo(() => {
        if (discRecords.length === 0) return { isActive: false, isExpired: false, message: 'No Disciplinary Action' };
        const lastAction = discRecords[discRecords.length - 1];
        const isExpired = checkRecordExpiry(lastAction);
        return { isActive: true, isExpired: isExpired, message: lastAction };
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

        return Array.from(registeredSems)
            .sort((a, b) => {
                const pa = parseSem(a), pb = parseSem(b);
                if (pa.year !== pb.year) return pb.year - pa.year;
                return pb.season - pa.season;
            })
            .map(sem => ({
                semester: sem,
                isRegistered: true,
                taken: 0, complete: 0, sgpa: '-', dues: 0
            }));
    }, [student, registrationLookup]);

    const resolveEmployeeFromValue = (val: string | undefined) => {
        if (!val) return null;
        const match = val.match(/\(([^)]+)\)$/);
        const id = match ? match[1].trim() : val.trim();
        const normId = normalizeId(id);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) return emp;
        const teacher = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teacher) {
            return {
                'Employee ID': teacher['Employee ID'],
                'Employee Name': teacher['Employee Name'],
                'Academic Designation': teacher.Designation,
                'Administrative Designation': '',
                'Mobile': teacher['Mobile Number'] || '',
                'E-mail': teacher.Email || '',
                'Photo': teacher.Photo || '',
                'Department': teacher.Department || '',
            } as any as DiuEmployeeRow;
        }
        return null;
    };

    const handleSaveQuickEdit = async () => {
        if (!studentSemester) return;
        const sanitizeValue = (val: string | undefined) => {
            if (!val) return '';
            const match = val.match(/\(([^)]+)\)$/);
            return match ? match[1].trim() : val.trim();
        };
        const sanitizedBuffer = { ...editBuffer };
        if (sanitizedBuffer['Defense Supervisor']) sanitizedBuffer['Defense Supervisor'] = sanitizeValue(sanitizedBuffer['Defense Supervisor']);
        if (sanitizedBuffer['Mentor']) sanitizedBuffer['Mentor'] = sanitizeValue(sanitizedBuffer['Mentor']);
        const payload = { ...student, ...sanitizedBuffer } as StudentDataRow;
        closeAll();
        onSaveStudent(studentSemester, payload).catch(console.error);
    };

    const handleEditDisc = (index: number) => {
        const record = discRecords[index];
        const rangeMatch = record.match(/(.+) from ([A-Z][a-z]{2} \d{1,2}, \d (?:[0-9]{2,4})) to ([A-Z][a-z]{2} \d{1,2}, \d (?:[0-9]{2,4}))/);
        if (rangeMatch) {
            setDiscReason(rangeMatch[1].trim());
            setDiscFromDate(parseToIsoDate(rangeMatch[2]));
            setDiscToDate(parseToIsoDate(rangeMatch[3]));
        } else {
            setDiscReason(record);
            setDiscFromDate('');
            setDiscToDate('');
        }
        setEditingDiscIndex(index);
        setIsDiscFormOpen(true);
    };

    const handleAddDisc = () => {
        setDiscReason('');
        setDiscFromDate(new Date().toISOString().split('T')[0]);
        setDiscToDate('');
        setEditingDiscIndex(null);
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
            finalNotice = discRecords.length > 0 ? `${student['Disciplinary Action']} || ${formattedNewNotice}` : formattedNewNotice;
        }
        closeAll();
        onSaveStudent(studentSemester, { ...student, 'Disciplinary Action': finalNotice } as StudentDataRow);
    };

    // FOLLOW-UP LOGIC: Save history into 'Discussion Remark' column
    const handleSaveFollowup = async (finalData?: any) => {
        if (!studentSemester) return;
        const dataToUse = finalData || followupFormData;
        if (!dataToUse.Remark.trim()) { alert("Please enter a remark."); return; }
        
        // Build the structured entry string
        const entryStr = [
            dataToUse.Date,
            dataToUse.Status,
            dataToUse['Contacted By'],
            dataToUse['Re-follow up'],
            dataToUse.Remark.replace(/\r?\n/g, ' ') // Flatten multi-line remarks for sheet storage
        ].join(FIELD_SEP);

        const currentRemarkHistory = student['Discussion Remark'] || '';
        const entries = currentRemarkHistory.split(RECORD_SEP).filter(Boolean);
        
        let newRemarkHistory = '';
        if (editingFollowupIndex !== null) {
            // Edit existing entry
            entries[editingFollowupIndex] = entryStr;
            newRemarkHistory = entries.join(RECORD_SEP);
        } else {
            // Add new entry
            newRemarkHistory = currentRemarkHistory 
                ? `${currentRemarkHistory}${RECORD_SEP}${entryStr}` 
                : entryStr;
        }

        // Close form and save student
        closeAll();
        onSaveStudent(studentSemester, { ...student, 'Discussion Remark': newRemarkHistory } as StudentDataRow);
    };

    const handleEditFollowup = (item: StudentFollowupRow & { _index: number }) => {
        setFollowupFormData({ 
            Date: parseToIsoDate(item.Date), 
            Remark: item.Remark, 
            'Re-follow up': parseToIsoDate(item['Re-follow up']), 
            Status: item.Status, 
            'Contacted By': item['Contacted By'] 
        } as any);
        setEditingFollowupIndex(item._index);
        setShowFollowupForm(true);
    };

    const handleDeleteFollowup = async (index: number) => {
        if (!window.confirm("Remove this conversation entry from history?")) return;
        const raw = student['Discussion Remark'] || '';
        const entries = raw.split(RECORD_SEP).filter(Boolean);
        entries.splice(index, 1);
        const newRaw = entries.join(RECORD_SEP);
        onSaveStudent(studentSemester!, { ...student, 'Discussion Remark': newRaw } as StudentDataRow);
    };

    const handleQuickDropUpdate = async (type: string) => {
        if (!studentSemester) { alert("Unable to identify student semester."); return; }
        closeAll();
        onSaveStudent(studentSemester, { ...student, 'Dropout Classification': type } as StudentDataRow);
    };

    const resolvedDefenseEmp = useMemo(() => resolveEmployeeFromValue(editBuffer['Defense Supervisor']), [editBuffer['Defense Supervisor'], diuEmployeeData, teacherData]);
    const resolvedMentorEmp = useMemo(() => resolveEmployeeFromValue(editBuffer['Mentor']), [editBuffer['Mentor'], diuEmployeeData, teacherData]);

    const renderResolvedEmployeeCard = (emp: DiuEmployeeRow | null) => {
        if (!emp) return null;
        const photo = getImageUrl(emp.Photo);
        return (
            <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100 shadow-inner flex items-center space-x-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-50 shrink-0">
                    {photo ? <img src={photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-6 h-6 m-3 text-slate-200" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black text-slate-800 leading-tight truncate uppercase tracking-tighter">{emp['Employee Name']}</div>
                    <div className="text-[9px] font-bold text-blue-600 leading-tight truncate uppercase tracking-widest">{emp['Academic Designation'] || emp['Administrative Designation'] || 'Officer'}</div>
                    <div className="flex items-center space-x-3 mt-1">
                        <div className="flex items-center text-[9px] text-slate-500 font-medium"><Mail className="w-2.5 h-2.5 mr-1" />{emp['E-mail'] || '-'}</div>
                        <div className="flex items-center text-[9px] text-slate-500 font-medium"><Phone className="w-2.5 h-2.5 mr-1" />{emp.Mobile || '-'}</div>
                    </div>
                </div>
            </div>
        );
    };

    const handleAddNewDefenseType = () => {
        const newVal = newTypeInput.trim();
        if (newVal) {
            if (!defenseTypeOptions.includes(newVal)) setDefenseTypeOptions(prev => [...prev, newVal]);
            const currentTypes = editBuffer['Defense Type'] ? editBuffer['Defense Type'].split(',').map(t => t.trim()).filter(Boolean) : [];
            if (!currentTypes.includes(newVal)) setEditBuffer(prev => ({ ...prev, 'Defense Type': [...currentTypes, newVal].join(', ') }));
        }
        setIsAddingNewType(false);
        setNewTypeInput('');
    };

    const handleToggleDefenseType = (type: string) => {
        const currentTypes = editBuffer['Defense Type'] ? editBuffer['Defense Type'].split(',').map(t => t.trim()).filter(Boolean) : [];
        let updatedTypes = currentTypes.includes(type) ? currentTypes.filter(t => t !== type) : [...currentTypes, type];
        setEditBuffer(prev => ({ ...prev, 'Defense Type': updatedTypes.join(', ') }));
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
                lastRegSemester={historyData.length > 0 ? historyData[0].semester : 'None'}
                mentorAssigned={!isValEmpty(student?.Mentor)}
                onCardClick={(type) => { closeAll(); setActivePopup(type); }}
                activePopup={activePopup}
            />

            <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
                {activePopup === 'history' && <div className="absolute inset-0 z-[60] p-3 bg-white"><StudentRegistrationHistory historyData={historyData} onClose={closeAll} /></div>}
                
                {activePopup === 'dropout' && (
                    <div className="absolute inset-0 z-[150] bg-black/5 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-xs space-y-4">
                            <div className="flex items-center justify-between border-b pb-2"><h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center"><ShieldMinus className="w-3.5 h-3.5 mr-2 text-blue-600" /> Drop Classification</h4><button onClick={closeAll} className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button></div>
                            <div className="flex flex-col space-y-2">
                                <button onClick={() => handleQuickDropUpdate('Permanent Drop')} className={`flex items-center space-x-3 p-3 rounded-xl border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 transition-all`}><div className="p-2 rounded-lg bg-white shadow-sm"><PowerOff className="w-4 h-4" /></div><span className="text-xs font-black uppercase tracking-tight">Permanent Drop</span></button>
                                <button onClick={() => handleQuickDropUpdate('Temporary Drop')} className={`flex items-center space-x-3 p-3 rounded-xl border border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all`}><div className="p-2 rounded-lg bg-white shadow-sm"><Clock className="w-4 h-4" /></div><span className="text-xs font-black uppercase tracking-tight">Temporary Drop</span></button>
                                <button onClick={() => handleQuickDropUpdate('')} className={`flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all`}><div className="p-2 rounded-lg bg-white shadow-sm text-slate-400"><Trash2 className="w-4 h-4" /></div><span className="text-xs font-black uppercase tracking-tight">Clear Classification</span></button>
                            </div>
                        </div>
                    </div>
                )}

                {(activePopup === 'credits' || activePopup === 'defense' || activePopup === 'degree' || activePopup === 'dues' || activePopup === 'mentor') && (
                    <div className="absolute inset-0 z-[150] bg-black/5 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-sm md:max-w-md space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center">
                                    {activePopup === 'credits' && <><Calculator className="w-3.5 h-3.5 mr-2 text-blue-600" /> Credit Details</>}
                                    {activePopup === 'defense' && <><ShieldCheck className="w-3.5 h-3.5 mr-2 text-purple-600" /> Defense Info</>}
                                    {activePopup === 'degree' && <><GraduationCap className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Degree Status</>}
                                    {activePopup === 'dues' && <><Banknote className="w-3.5 h-3.5 mr-2 text-amber-600" /> Account Dues</>}
                                    {activePopup === 'mentor' && <><UserPlus className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Mentor Assignment</>}
                                </h4>
                                <button onClick={closeAll} className="p-1 hover:bg-slate-200 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="space-y-3">
                                {activePopup === 'credits' && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Requirement</label><input type="number" value={editBuffer['Credit Requirement']} onChange={e => setEditBuffer({...editBuffer, 'Credit Requirement': e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                        <div><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Completed</label><input type="number" value={editBuffer['Credit Completed']} onChange={e => setEditBuffer({...editBuffer, 'Credit Completed': e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                    </div>
                                )}
                                {activePopup === 'defense' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Supervisor</label>
                                            <SearchableSelect value={editBuffer['Defense Supervisor']} onChange={v => setEditBuffer({...editBuffer, 'Defense Supervisor': v})} options={employeeOptions} />
                                            {renderResolvedEmployeeCard(resolvedDefenseEmp)}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Registration Date</label>
                                                <input type="date" value={parseToIsoDate(editBuffer['Defense Registration'])} onChange={e => setEditBuffer({...editBuffer, 'Defense Registration': formatDisplayDate(e.target.value)})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Defense Status</label>
                                                <SearchableSelect value={editBuffer['Defense Status']} onChange={v => setEditBuffer({...editBuffer, 'Defense Status': v})} options={['Pending', 'In Progress', 'In Review', 'Complete']} />
                                            </div>
                                        </div>
                                        <div className="pt-1">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                                                <span>Defense Type</span>
                                                <button onClick={() => setIsAddingNewType(!isAddingNewType)} className="p-0.5 hover:bg-slate-200 rounded text-blue-600 transition-colors"><PlusCircle className="w-3 h-3" /></button>
                                            </label>
                                            {isAddingNewType && (
                                                <div className="flex space-x-1 mb-2 animate-in slide-in-from-top-1 duration-200">
                                                    <input autoFocus value={newTypeInput} onChange={e => setNewTypeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewDefenseType()} placeholder="Type new category..." className="flex-1 px-2 py-1 text-[11px] border border-blue-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 shadow-sm" />
                                                    <button onClick={handleAddNewDefenseType} className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700">Add</button>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {defenseTypeOptions.map((type) => {
                                                    const currentTypes = editBuffer['Defense Type'] ? editBuffer['Defense Type'].split(',').map(t => t.trim()).filter(Boolean) : [];
                                                    const isActive = currentTypes.includes(type);
                                                    return (<button key={type} onClick={() => handleToggleDefenseType(type)} className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tight transition-all border shadow-sm ${isActive ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50'}`}>{type}</button>);
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activePopup === 'degree' && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200"><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Final Status</label><SearchableSelect value={editBuffer['Degree Status']} onChange={v => setEditBuffer({...editBuffer, 'Degree Status': v})} options={['Incomplete', 'Complete', 'Hold', 'Processing']} /></div>
                                )}
                                {activePopup === 'dues' && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200"><label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Current Balance</label><input type="number" value={editBuffer['Dues']} onChange={e => setEditBuffer({...editBuffer, 'Dues': e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-amber-500" /></div>
                                )}
                                {activePopup === 'mentor' && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Assigned Mentor</label>
                                            <SearchableSelect value={editBuffer['Mentor']} onChange={v => setEditBuffer({...editBuffer, 'Mentor': v})} options={employeeOptions} />
                                            {renderResolvedEmployeeCard(resolvedMentorEmp)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-2 pt-2">
                                <button onClick={closeAll} className="flex-1 py-2 text-[10px] font-bold text-slate-600 border rounded-lg hover:bg-slate-100 uppercase tracking-widest transition-colors">Cancel</button>
                                <button onClick={handleSaveQuickEdit} className="flex-1 py-2 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md flex items-center justify-center uppercase tracking-widest transition-all active:scale-95"><Save className="w-3.5 h-3.5 mr-1.5" /> Save</button>
                            </div>
                        </div>
                    </div>
                )}

                {isDiscFormOpen && (
                    <div className="absolute inset-0 z-[80] p-3 bg-white/95 backdrop-blur-sm overflow-y-auto">
                        <StudentDisciplinaryForm discReason={discReason} setDiscReason={setDiscReason} discFromDate={discFromDate} setDiscFromDate={setDiscFromDate} discToDate={discToDate} setDiscToDate={setDiscToDate} isExpired={discStatus.isExpired} isSaving={isSaving} onSave={handleSaveDisc} onClose={() => setIsDiscFormOpen(false)} />
                    </div>
                )}
                
                {showFollowupForm && (
                    <StudentFollowupForm 
                        student={student} 
                        formData={followupFormData} 
                        setFormData={setFollowupFormData} 
                        employeeOptions={employeeOptions} 
                        isSaving={isSaving} 
                        onSave={handleSaveFollowup} 
                        onClose={closeAll} 
                    />
                )}

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
                                <button onClick={handleAddDisc} className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700 transition-colors"><Plus className="w-3 h-3" /><span className="text-[9px] font-bold uppercase">Add Disciplinary</span></button>
                            )}
                            <button onClick={() => { setFollowupFormData({ Date: new Date().toISOString().split('T')[0], Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '' }); setEditingFollowupIndex(null); setShowFollowupForm(true); }} className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-blue-600 text-white border-blue-700 shadow-sm hover:bg-blue-700 transition-colors"><Plus className="w-3 h-3" /><span className="text-[9px] font-bold uppercase">Add Follow-up</span></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                        {discStatus.isActive && (
                            <div className="space-y-1.5 animate-in fade-in duration-300">
                                <div className={`border rounded-lg p-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${isDiscHistoryOpen ? 'bg-red-100 border-red-300 ring-2 ring-red-500/10' : (discStatus.isExpired ? 'bg-yellow-100 border-yellow-200' : 'bg-red-50 border-red-200')}`} onClick={() => setIsDiscHistoryOpen(!isDiscHistoryOpen)}>
                                    <div className={`flex items-center justify-between mb-1.5 ${discStatus.isExpired ? 'text-yellow-700' : 'text-red-700'}`}>
                                        <div className="flex items-center space-x-2"><ShieldAlert className="w-4 h-4" /><h4 className="text-[11px] font-black uppercase tracking-wider">Latest Disciplinary Status</h4></div>
                                        <div className="flex items-center space-x-2"><button onClick={handleAddDisc} className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mr-1 shadow-sm"><Plus className="w-3 h-3" /></button><span className="text-[8px] font-bold bg-white/60 px-1 py-0.5 rounded border border-current opacity-60">{discRecords.length} LOGS</span>{isDiscHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</div>
                                    </div>
                                    <p className={`text-[11px] leading-relaxed font-bold italic ${discStatus.isExpired ? 'text-yellow-800' : 'text-red-600'}`}>{discStatus.message}</p>
                                </div>
                                {isDiscHistoryOpen && (
                                    <div className="bg-red-50/30 rounded-lg border border-red-200 p-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        {discRecords.slice().reverse().map((record, idx) => {
                                            const actualIdx = discRecords.length - 1 - idx; const isExpired = checkRecordExpiry(record);
                                            return (
                                                <div key={actualIdx} className={`rounded-md border p-2.5 flex items-start justify-between shadow-sm transition-all group ${isExpired ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' : 'bg-white border-red-100 hover:border-red-200'}`}>
                                                    <div className="flex-1 min-w-0 mr-3"><div className="flex items-center space-x-2 mb-1">{actualIdx === discRecords.length - 1 && <span className={`${isExpired ? 'bg-yellow-600' : 'bg-red-600'} text-white text-[7px] font-black px-1 py-0.5 rounded tracking-widest shadow-sm`}>CURRENT</span>}{isExpired && (<span className="bg-yellow-100 text-yellow-800 text-[7px] font-black px-1 py-0.5 rounded border border-yellow-300 flex items-center"><CalendarX className="w-2.5 h-2.5 mr-0.5" /> EXPIRED</span>)}<span className={`text-[9px] font-bold uppercase tracking-tight ${isExpired ? 'text-yellow-600' : 'text-red-300'}`}>Record #{actualIdx + 1}</span></div><p className={`text-[10px] md:text-[11px] font-bold italic leading-relaxed ${isExpired ? 'text-yellow-900' : 'text-red-900'}`}>{record}</p></div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditDisc(actualIdx); }} className={`p-1.5 rounded-md transition-colors shrink-0 border border-transparent ${isExpired ? 'text-yellow-600 hover:bg-yellow-100' : 'text-red-500 hover:bg-red-50'}`}><Pencil className="w-3 h-3" /></button>
                                                </div>
                                            );
                                        })}
                                        <button onClick={handleRemoveDisc} className="w-full py-1 text-[8px] font-black text-red-400 hover:text-red-600 transition-colors uppercase border border-dashed border-red-200 rounded mt-1">Clear All Logged Records</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2 pt-1">
                            <div className="flex items-center px-1 mb-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conversation Timeline</span><div className="h-px bg-slate-100 flex-1 ml-3"></div></div>
                            {historyRemarks.length > 0 ? (
                                historyRemarks.map((item) => {
                                    const statusStr = item.Status || ''; 
                                    const match = statusStr.match(/^(.+?)\s*\((.+?)\)$/); 
                                    const responseStatus = match ? match[1] : (statusStr || 'Contacted'); 
                                    const dropType = match ? match[2] : null; 
                                    const uid = item.uniqueid; 
                                    const isExpanded = expandedRemarks.has(uid!);
                                    return (
                                        <div key={uid} className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="p-1 rounded bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><CalendarDays className="w-3 h-3" /></div>
                                                        <span className="text-[10px] font-black text-slate-800 tracking-tight">{formatDisplayDate(item.Date)}</span>
                                                        {item['Re-follow up'] && (
                                                            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[8px] font-bold text-emerald-700 uppercase tracking-tighter shadow-sm animate-in fade-in slide-in-from-left-1">
                                                                <CalendarX className="w-2.5 h-2.5 mr-1 text-emerald-500" />
                                                                Next: {formatDisplayDate(item['Re-follow up'])}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-1 pl-7">
                                                        By {item['Contacted By'] || 'System'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => handleEditFollowup(item)} className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded"><Pencil className="w-3 h-3" /></button>
                                                        <button onClick={() => handleDeleteFollowup(item._index)} className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="relative pl-3 mb-2.5 cursor-pointer select-none active:opacity-70 mt-1" onClick={() => toggleRemarkExpansion(uid!)}>
                                                <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${dropType ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                                                <p className={`text-[11px] text-slate-700 font-medium leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>{item.Remark}</p>
                                                
                                                {/* Response Status moved below Remark */}
                                                <div className="mt-2 flex">
                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-700 uppercase tracking-tighter shadow-sm">
                                                        <Info className="w-2.5 h-2.5 mr-1 text-blue-500" />
                                                        {responseStatus}
                                                    </div>
                                                </div>
                                            </div>
                                            {dropType && (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-50">
                                                    <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter ${dropType.includes('Permanent') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                        {dropType.includes('Permanent') ? <PowerOff className="w-2.5 h-2.5 mr-1" /> : <Clock className="w-2.5 h-2.5 mr-1" />}
                                                        {dropType}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center opacity-40"><MessageSquareQuote className="w-10 h-10 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-center">No remarks recorded</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};