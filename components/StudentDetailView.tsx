import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, MessageSquareQuote, Save, ArrowLeft, Loader2, Plus, User, Mail, Phone, Hash, Briefcase, Trash2 } from 'lucide-react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow } from '../types';
import { isValEmpty, getImageUrl } from '../views/EmployeeView';
import { useSheetData } from '../hooks/useSheetData';
import { submitSheetData } from '../services/sheetService';
import { SHEET_NAMES, STUDENT_LINK_SHEET_ID } from '../constants';

// Refactored Sub-components
import { StudentIdentity } from './StudentProfile/StudentIdentity';
import { StudentStatsGrid } from './StudentProfile/StudentStatsGrid';
import { StudentDropoutControl } from './StudentProfile/StudentDropoutControl';
import { StudentRemarksPanel } from './StudentProfile/StudentRemarksPanel';
import { StudentRegistrationHistory } from './StudentRegistrationHistory';
import { StudentDisciplinaryForm } from './StudentDisciplinaryForm';
import { StudentFollowupForm } from './StudentFollowupForm';
import { SearchableSelect } from './EditEntryModal';

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
        // Returns local ISO format suitable for date inputs (YYYY-MM-DD)
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

// Helper to find employee details from the formatted option string
const resolveEmployeeFromOption = (option: string | undefined, diuEmployeeData: DiuEmployeeRow[], teacherData: TeacherDataRow[]) => {
    if (!option) return null;
    const match = option.match(/\(([^)]+)\)$/);
    const id = match ? match[1].trim().toLowerCase() : option.trim().toLowerCase();
    
    // Check main employee DB
    const emp = diuEmployeeData.find(e => e['Employee ID'].trim().toLowerCase() === id);
    if (emp) return emp;

    // Check teacher DB and map to common format
    const teacher = teacherData.find(t => t['Employee ID'].trim().toLowerCase() === id);
    if (teacher) {
        return {
            'Employee ID': teacher['Employee ID'],
            'Employee Name': teacher['Employee Name'],
            'Academic Designation': teacher['Designation'],
            'Administrative Designation': '',
            'Mobile': teacher['Mobile Number'],
            'E-mail': teacher['Email'],
            'Photo': teacher['Photo'] || '',
            'Department': teacher['Department'] || ''
        } as any;
    }
    return null;
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
    const [isDiscFormOpen, setIsDiscFormOpen] = useState(false);
    const [showFollowupForm, setShowFollowupForm] = useState(false);
    const [isDiscHistoryOpen, setIsDiscHistoryOpen] = useState(false);
    const [expandedRemarks, setExpandedRemarks] = useState<Set<string>>(new Set());

    // Effect to handle initial open state for remarks
    useEffect(() => {
        if (initialRemarksOpen) {
            setIsRemarksOpen(true);
        }
    }, [student['Student ID'], initialRemarksOpen]);

    // Inline form state
    const [editFormData, setEditFormData] = useState<any>({});
    const [defenseTypes, setDefenseTypes] = useState(['Thesis', 'Project', 'Internship']);
    const [showAddDefenseType, setShowAddDefenseType] = useState(false);
    const [newDefenseType, setNewDefenseType] = useState('');

    const historyRemarks = useMemo(() => {
        const raw = student['Discussion Remark'];
        if (isValEmpty(raw)) return [];
        return raw!.split(RECORD_SEP).filter(Boolean).map((entry, idx) => {
            const fields = entry.split(FIELD_SEP);
            return {
                Date: fields[0] || '', Status: fields[1] || '', 'Contacted By': fields[2] || '', 'Re-follow up': fields[3] || '', Remark: fields[4] || '',
                'Student ID': student['Student ID'], 'Student Name': student['Student Name'],
                'uniqueid': `local-${idx}`, _index: idx
            };
        }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [student['Discussion Remark']]);

    // Compute dynamic Response Status options from history and defaults
    const statusOptions = useMemo(() => {
        const defaults = ['Call Busy', 'Switch Off', 'Department Change', 'University Change', 'Not Reachable', 'Passed Away'];
        const used = new Set<string>();
        
        // Collect from global followup tracking (cross-student suggestions)
        studentFollowupData.forEach(f => {
            if (f.Status && f.Status.trim()) used.add(f.Status.trim());
        });

        // Also collect from this student's specific history to include local new items immediately
        historyRemarks.forEach(r => {
            if (r.Status && r.Status.trim()) used.add(r.Status.trim());
        });

        return Array.from(new Set([...defaults, ...used])).sort();
    }, [studentFollowupData, historyRemarks]);

    // Sync form data when a card is clicked
    useEffect(() => {
        if (activePopup && activePopup !== 'dropout') {
            const initialData = { ...student };
            // Ensure dates are parsed to ISO for input[type="date"]
            if (activePopup === 'defense') {
                initialData['Defense Registration'] = parseToIsoDate(student['Defense Registration']);
            }
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
        
        const allSemesters = uniqueSemesters
            .filter(s => s !== 'All')
            .map(s => ({ original: s, ...parseSem(s) }))
            .sort((a, b) => a.year !== b.year ? b.year - a.year : b.season - a.season);

        return allSemesters
            .filter(sem => {
                if (sem.year > enrollmentParsed.year) return true;
                if (sem.year === enrollmentParsed.year && sem.season >= enrollmentParsed.season) return true;
                return false;
            })
            .map(sem => {
                const isRegistered = registeredSems.has(sem.original);
                return {
                    semester: sem.original,
                    isRegistered: isRegistered,
                    taken: isRegistered ? 15 : null,
                    complete: isRegistered ? 15 : null,
                    sgpa: isRegistered ? (3.2 + Math.random() * 0.7).toFixed(2) : null,
                    dues: 0
                };
            })
            .sort((a, b) => {
                const pa = parseSem(a.semester), pb = parseSem(b.semester);
                if (pa.year !== pb.year) return pb.year - pa.year;
                return pb.season - pa.season;
            });
    }, [student, registrationLookup, studentSemester, uniqueSemesters]);

    const handleQuickUpdate = useCallback(async (newData: any) => {
        if (!studentSemester) return;
        setIsSaving(true);
        setActivePopup(null);
        try {
            // Formatting dates back to display format if needed
            const payload = { ...newData };
            if (activePopup === 'defense' && payload['Defense Registration']) {
                payload['Defense Registration'] = formatDisplayDate(payload['Defense Registration'], false).split(',')[0];
            }
            await onSaveStudent(studentSemester, { ...student, ...payload } as StudentDataRow);
        } finally {
            setIsSaving(false);
        }
    }, [studentSemester, student, onSaveStudent, activePopup]);

    const handleSaveInlineForm = () => {
        handleQuickUpdate(editFormData);
    };

    const handleSaveDisc = async () => {
        if (!studentSemester || !discReason || !discFromDate) return;
        const notice = discToDate 
            ? `${discReason} from ${formatDisplayDate(discFromDate, false).split(',')[0]} to ${formatDisplayDate(discToDate, false).split(',')[0]}` 
            : `${formatDisplayDate(discFromDate, false).split(',')[0]} (Permanent ${discReason})`;
        const updated = editingDiscIndex !== null ? [...discRecords] : [...discRecords, notice];
        if (editingDiscIndex !== null) updated[editingDiscIndex] = notice;
        setIsDiscFormOpen(false);
        onSaveStudent(studentSemester!, { ...student, 'Disciplinary Action': updated.join(' || ') } as StudentDataRow);
    };

    const [discReason, setDiscReason] = useState('');
    const [discFromDate, setDiscFromDate] = useState('');
    const [discToDate, setDiscToDate] = useState('');
    const [editingDiscIndex, setEditingDiscIndex] = useState<number | null>(null);
    const [followupFormData, setFollowupFormData] = useState({ Date: '', Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '' });
    const [editingFollowupIndex, setEditingFollowupIndex] = useState<number | null>(null);

    const handleSaveFollowup = async (finalData?: any) => {
        if (!studentSemester) return;
        setIsSaving(true);
        const d = finalData || followupFormData;
        
        // Combined Contact Date with current time
        const now = new Date();
        const timePart = now.toTimeString().split(' ')[0];
        const combinedDate = `${d.Date} ${timePart}`;

        // Ensure Re-follow up remains strictly YYYY-MM-DD
        const reFollowupDate = (d['Re-follow up'] || '').split(' ')[0].split('T')[0];

        // Extract ID only from 'Contacted By' display string
        const contactedByText = d['Contacted By'] || '';
        const idMatch = contactedByText.match(/\(([^)]+)\)$/);
        const contactedById = idMatch ? idMatch[1] : contactedByText;

        const entryStr = [combinedDate, d.Status, contactedById, reFollowupDate, d.Remark.replace(/\n/g, ' ')].join(FIELD_SEP);
        const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).filter(Boolean);
        if (editingFollowupIndex !== null) entries[editingFollowupIndex] = entryStr;
        else entries.push(entryStr);
        
        setShowFollowupForm(false);
        
        try {
            // Step 1: Update the student's local remark field
            await onSaveStudent(studentSemester!, { ...student, 'Discussion Remark': entries.join(RECORD_SEP) } as StudentDataRow);

            // Step 2: Sync to Global Followup_DB
            const globalPayload = {
                'uniqueid': `SF-AUTO-${Date.now()}`,
                'Date': combinedDate,
                'Student ID': student['Student ID'],
                'Student Name': student['Student Name'],
                'Remark': d.Remark,
                'Re-follow up': reFollowupDate,
                'Status': d.Status,
                'Contacted By': contactedById,
                'Timestamp': new Date().toLocaleString()
            };

            await submitSheetData('add', SHEET_NAMES.FOLLOWUP, globalPayload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
            
            // Step 3: Silent reload
            reloadData('followup', false);
        } catch (e) {
            console.error("Failed to sync followup globally", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteFollowup = async (index: number) => {
        if (!window.confirm("Delete this entry?")) return;
        const entries = (student['Discussion Remark'] || '').split(RECORD_SEP).filter(Boolean);
        entries.splice(index, 1);
        onSaveStudent(studentSemester!, { ...student, 'Discussion Remark': entries.join(RECORD_SEP) } as StudentDataRow);
    };

    const isEditViewActive = activePopup && ['credits', 'defense', 'degree', 'dues', 'mentor', 'history'].includes(activePopup);

    const renderEmployeeCard = (employee: any) => {
        if (!employee) return null;
        const photo = getImageUrl(employee.Photo);
        return (
            <div className="mt-3 bg-blue-50/50 rounded-xl border border-blue-100 p-3 flex items-start space-x-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 shrink-0">
                    {photo ? <img src={photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-black text-blue-900 truncate leading-tight">{employee['Employee Name']}</h5>
                    <p className="text-[9px] font-bold text-blue-600/70 uppercase tracking-tighter truncate mt-0.5">{[employee['Academic Designation'], employee['Administrative Designation']].filter(Boolean).join(' / ')}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-100/50">
                        <div className="flex items-center text-[9px] text-gray-500 truncate"><Mail className="w-2.5 h-2.5 mr-1 text-blue-400" /> {employee['E-mail'] || '-'}</div>
                        <div className="flex items-center text-[9px] text-gray-500"><Phone className="w-2.5 h-2.5 mr-1 text-blue-400" /> {employee.Mobile || '-'}</div>
                        <div className="flex items-center text-[9px] text-gray-500 font-mono"><Hash className="w-2.5 h-2.5 mr-1 text-blue-400" /> {employee['Employee ID']}</div>
                        <div className="flex items-center text-[9px] text-gray-500"><Briefcase className="w-2.5 h-2.5 mr-1 text-blue-400" /> {employee.Department || '-'}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderInlineEditForm = () => {
        if (!activePopup) return null;

        let title = "";
        let content = null;
        const showBack = false;

        switch (activePopup) {
            case 'credits':
                title = "Credit Information";
                content = (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Credit Requirement</label>
                            <input type="number" value={editFormData['Credit Requirement'] || ''} onChange={(e) => setEditFormData({...editFormData, 'Credit Requirement': e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Credit Completed</label>
                            <input type="number" value={editFormData['Credit Completed'] || ''} onChange={(e) => setEditFormData({...editFormData, 'Credit Completed': e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none" />
                        </div>
                    </div>
                );
                break;
            case 'defense':
                title = "Defense Details";
                const selectedSupervisor = resolveEmployeeFromOption(editFormData['Defense Supervisor'], diuEmployeeData, teacherData);
                
                // Multi-select Logic for tabs
                const currentDefenseTypeStr = editFormData['Defense Type'] || '';
                const selectedTypesArray = currentDefenseTypeStr.split(',').map((t: string) => t.trim()).filter(Boolean);
                
                const effectiveTypes = Array.from(new Set([...defenseTypes, ...selectedTypesArray].filter(Boolean)));

                content = (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Def. Registration</label>
                                <input type="date" value={editFormData['Defense Registration'] || ''} onChange={(e) => setEditFormData({...editFormData, 'Defense Registration': e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Def. Status</label>
                                <SearchableSelect value={editFormData['Defense Status'] || ''} onChange={(v) => setEditFormData({...editFormData, 'Defense Status': v})} options={['Not Registered', 'Ongoing', 'Complete', 'Deferred']} />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Defense Type (Multi-select)</label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {effectiveTypes.map(type => {
                                    const isTypeSelected = selectedTypesArray.includes(type);
                                    return (
                                        <button 
                                            key={type}
                                            onClick={() => {
                                                const newTypes = isTypeSelected 
                                                    ? selectedTypesArray.filter((t: string) => t !== type)
                                                    : [...selectedTypesArray, type];
                                                setEditFormData({...editFormData, 'Defense Type': newTypes.join(', ')});
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${isTypeSelected ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                                        >
                                            {type}
                                        </button>
                                    );
                                })}
                                <button 
                                    onClick={() => setShowAddDefenseType(true)}
                                    className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {showAddDefenseType && (
                                <div className="flex items-center space-x-2 animate-in slide-in-from-left-2 duration-200">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={newDefenseType} 
                                        onChange={(e) => setNewDefenseType(e.target.value)} 
                                        className="flex-1 p-2 text-[10px] border border-blue-200 rounded outline-none focus:ring-1 focus:ring-blue-400" 
                                        placeholder="Enter custom type..."
                                    />
                                    <button 
                                        onClick={() => {
                                            const trimmedNew = newDefenseType.trim();
                                            if (trimmedNew) {
                                                setDefenseTypes(prev => [...prev, trimmedNew]);
                                                if (!selectedTypesArray.includes(trimmedNew)) {
                                                    const newTypes = [...selectedTypesArray, trimmedNew];
                                                    setEditFormData({...editFormData, 'Defense Type': newTypes.join(', ')});
                                                }
                                            }
                                            setNewDefenseType('');
                                            setShowAddDefenseType(false);
                                        }}
                                        className="px-3 py-2 bg-blue-600 text-white text-[10px] font-bold rounded"
                                    >
                                        Add
                                    </button>
                                    <button onClick={() => setShowAddDefenseType(false)} className="p-2 text-slate-400"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Defense Supervisor</label>
                            <SearchableSelect value={editFormData['Defense Supervisor'] || ''} onChange={(v) => setEditFormData({...editFormData, 'Defense Supervisor': v})} options={employeeOptions} placeholder="Search employees..." />
                            {renderEmployeeCard(selectedSupervisor)}
                        </div>
                    </div>
                );
                break;
            case 'degree':
                title = "Degree Status";
                content = (
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Current Status</label>
                        <SearchableSelect value={editFormData['Degree Status'] || ''} onChange={(v) => setEditFormData({...editFormData, 'Degree Status': v})} options={['Incomplete', 'Complete', 'Withdrawn', 'Certificate Issued']} />
                    </div>
                );
                break;
            case 'dues':
                title = "Accounts & Dues";
                content = (
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Total Dues (BDT)</label>
                        <input type="number" value={editFormData['Dues'] || ''} onChange={(e) => setEditFormData({...editFormData, 'Dues': e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono font-bold text-red-600" />
                    </div>
                );
                break;
            case 'mentor':
                title = "Student Mentor";
                const selectedMentor = resolveEmployeeFromOption(editFormData['Mentor'], diuEmployeeData, teacherData);
                content = (
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Assign Mentor</label>
                        <SearchableSelect value={editFormData['Mentor'] || ''} onChange={(v) => setEditFormData({...editFormData, 'Mentor': v})} options={employeeOptions} placeholder="Search employees..." />
                        {renderEmployeeCard(selectedMentor)}
                    </div>
                );
                break;
            default:
                return null;
        }

        return (
            <div className="flex flex-col h-full bg-white animate-in slide-in-from-right-2 duration-300">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center">
                        {showBack && (
                            <button onClick={() => setActivePopup(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 mr-2 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</h4>
                    </div>
                    {!showBack && (
                        <button onClick={() => setActivePopup(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-5 thin-scrollbar">
                    {content}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex space-x-2">
                    <button onClick={() => setActivePopup(null)} className="flex-1 py-2.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg uppercase hover:bg-slate-100">Cancel</button>
                    <button onClick={handleSaveInlineForm} disabled={isSaving} className="flex-[1.5] py-2.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save Changes
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-white font-sans">
            <div className="bg-white border-b border-slate-100 p-5 shadow-sm shrink-0">
                <StudentIdentity student={student} program={program} dropInfo={null} onDropClick={() => setActivePopup('dropout')} />
                <StudentStatsGrid 
                    student={student} activePopup={activePopup} onCardClick={setActivePopup}
                    isCreditsMet={parseFloat(student['Credit Completed'] || '0') >= parseFloat(student['Credit Requirement'] || '0')}
                    isDefenseSuccess={student['Defense Status']?.toLowerCase() === 'complete'}
                    isDegreeDone={student['Degree Status']?.toLowerCase() === 'complete'}
                    lastRegSemester={historyData.length > 0 ? historyData[0].semester : 'None'}
                    mentorAssigned={!isValEmpty(student?.Mentor)}
                />
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
                <div className={`absolute inset-0 z-10 p-2 transition-all duration-300 ${isRemarksOpen || (isEditViewActive && activePopup !== 'history') ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                    <StudentRegistrationHistory historyData={historyData} />
                </div>

                {isEditViewActive && activePopup !== 'history' && (
                    <div className="absolute inset-0 z-20 p-2">
                        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-full relative">
                            {renderInlineEditForm()}
                        </div>
                    </div>
                )}

                <StudentRemarksPanel 
                    isOpen={isRemarksOpen} onClose={() => setIsRemarksOpen(false)}
                    historyRemarks={historyRemarks} expandedRemarks={expandedRemarks} 
                    toggleRemarkExpansion={(uid) => setExpandedRemarks(prev => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; })}
                    formatDate={formatDisplayDate} onAddFollowup={() => { 
                        const now = new Date();
                        const datePart = now.toISOString().split('T')[0];
                        setFollowupFormData({ Date: datePart, Remark: '', 'Re-follow up': '', Status: '', 'Contacted By': '' }); 
                        setEditingFollowupIndex(null); 
                        setShowFollowupForm(true); 
                    }}
                    onEditFollowup={(item) => { 
                        // Clean Contact Date for input
                        const cleanDate = (item.Date || '').split(' ')[0].split('T')[0];
                        // Clean Re-follow up for input
                        const cleanReFollowup = (item['Re-follow up'] || '').split(' ')[0].split('T')[0];
                        setFollowupFormData({ 
                            Date: cleanDate, 
                            Remark: item.Remark, 
                            'Re-follow up': cleanReFollowup, 
                            Status: item.Status, 
                            'Contacted By': item['Contacted By'] 
                        } as any); 
                        setEditingFollowupIndex(item._index); 
                        setShowFollowupForm(true); 
                    }}
                    onDeleteFollowup={handleDeleteFollowup}
                    discStatus={discStatus} discRecords={discRecords} isDiscHistoryOpen={isDiscHistoryOpen} toggleDiscHistory={() => setIsDiscHistoryOpen(!isDiscHistoryOpen)}
                    onAddDisc={() => { setDiscReason(''); setDiscFromDate(new Date().toISOString().split('T')[0]); setDiscToDate(''); setEditingDiscIndex(null); setIsDiscFormOpen(true); }}
                    onEditDisc={(idx) => { const r = discRecords[idx]; const m = r.match(/(.+) from ([A-Z][a-z]{2} \d{1,2}, \d (?:[0-9]{2,4})) to ([A-Z][a-z]{2} \d{1,2}, \d (?:[0-9]{2,4}))/); if(m){ setDiscReason(m[1].trim()); setDiscFromDate(parseToIsoDate(m[2])); setDiscToDate(parseToIsoDate(m[3])); } else { setDiscReason(r); } setEditingDiscIndex(idx); setIsDiscFormOpen(true); }}
                    onRemoveAllDisc={() => window.confirm("Clear all?") && onSaveStudent(studentSemester!, { ...student, 'Disciplinary Action': '' } as StudentDataRow)}
                    checkRecordExpiry={checkRecordExpiry}
                />

                {activePopup === 'dropout' && <StudentDropoutControl onClose={() => setActivePopup(null)} onUpdate={(type) => handleQuickUpdate({ 'Dropout Classification': type })} />}
                
                {isDiscFormOpen && (
                    <div className="absolute inset-0 z-[150] p-3 bg-white/95 backdrop-blur-sm">
                        <StudentDisciplinaryForm discReason={discReason} setDiscReason={setDiscReason} discFromDate={discFromDate} setDiscFromDate={setDiscFromDate} discToDate={discToDate} setDiscToDate={setDiscToDate} isExpired={discStatus.isExpired} isSaving={isSaving} onSave={handleSaveDisc} onClose={() => setIsDiscFormOpen(false)} />
                    </div>
                )}
                
                {showFollowupForm && (
                    <StudentFollowupForm student={student} formData={followupFormData} setFormData={setFollowupFormData} employeeOptions={employeeOptions} statusOptions={statusOptions} isSaving={isSaving} onSave={handleSaveFollowup} onClose={() => setShowFollowupForm(false)} />
                )}

                {!isRemarksOpen && !showFollowupForm && (
                    <button onClick={() => setIsRemarksOpen(true)} className="fixed bottom-6 right-6 md:absolute md:bottom-8 md:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-[110]" title="Remarks & History">
                        <MessageSquareQuote className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white">{historyRemarks.length}</span>
                    </button>
                )}
            </div>
        </div>
    );
};