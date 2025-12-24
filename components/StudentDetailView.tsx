
import React, { useState, useMemo, useEffect } from 'react';
import { User, GraduationCap, X, Mail, Smartphone, Calendar, Award, Banknote, CalendarCheck, ShieldQuestion, History, Pencil, Undo2, Save, Loader2, ChevronDown, ChevronRight, MessageSquareQuote, MessageSquarePlus, Clock, Phone, Smartphone as MobileIcon, Plus, AlertTriangle, ShieldAlert, CalendarRange } from 'lucide-react';
import { StudentDataRow, ProgramDataRow, DiuEmployeeRow, TeacherDataRow, FacultyLeadershipRow } from '../types';
import { normalizeId, submitSheetData } from '../services/sheetService';
import { SearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { SHEET_NAMES, STUDENT_LINK_SHEET_ID } from '../constants';
import { useSheetData } from '../hooks/useSheetData';

// Helper to format date as MMM DD, YYYY
const formatDisplayDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; 
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: '2-digit', year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

const formatStatus = (status: string | undefined): string => {
    if (!status) return 'Pending';
    const s = status.trim().toLowerCase();
    if (s === 'complete') return 'Complete';
    if (s === 'pending') return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const findInRow = (row: any, patterns: string[]): string => {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (found && !isValEmpty(row[found])) return String(row[found]).trim();
    }
    return '';
};

const DUMMY_COURSE_DETAILS = [
    { code: 'CSE101', title: 'Introduction to Computer Science', section: 'A', gpa: '3.75', attend: '90%', teacher: '71000123' },
    { code: 'CSE102', title: 'Discrete Mathematics', section: 'B', gpa: '3.50', attend: '85%', teacher: '71000456' },
    { code: 'ENG101', title: 'English Composition', section: 'C1', gpa: '4.00', attend: '100%', teacher: '71000789' },
    { code: 'MAT101', title: 'Calculus I', section: 'D', day: 'Sun', gpa: '3.25', attend: '80%', teacher: '71000999' },
    { code: 'PHY101', title: 'Physics I', section: 'L1', gpa: '3.80', attend: '95%', teacher: '71000888' },
];

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
    const { studentFollowupData, loadStudentFollowupData, setStudentFollowupData, reloadData } = useSheetData();
    const [isSaving, setIsSaving] = useState(false);
    
    // UI State
    const [isEditingCredits, setIsEditingCredits] = useState(false);
    const [isCreditsInEditMode, setIsCreditsInEditMode] = useState(false);
    const [isEditingDefense, setIsEditingDefense] = useState(false);
    const [isDefenseInEditMode, setIsDefenseInEditMode] = useState(false); 
    const [isEditingDegree, setIsEditingDegree] = useState(false);
    const [isEditingDues, setIsEditingDues] = useState(false);
    const [isEditingDisc, setIsEditingDisc] = useState(false);
    const [showRegHistory, setShowRegHistory] = useState(false);
    const [showMentorDetails, setShowMentorDetails] = useState(false);
    const [expandedRegSem, setExpandedRegSem] = useState<string | null>(null);
    const [studentEditData, setStudentEditData] = useState<Partial<StudentDataRow>>({});

    // New State for specialized Disciplinary Date Picker
    const [isDiscDatePickerOpen, setIsDiscDatePickerOpen] = useState(false);
    const [discFromDate, setDiscFromDate] = useState('');
    const [discToDate, setDiscToDate] = useState('');
    const [discReason, setDiscReason] = useState('');

    const [showFollowupForm, setShowFollowupForm] = useState(false);
    const [followupFormData, setFollowupFormData] = useState({
        Date: new Date().toISOString().split('T')[0],
        Remark: '',
        'Re-follow up': '',
        Status: 'Call Busy',
        'Contacted By': ''
    });

    const closeAllInfoPanels = () => {
        setIsEditingCredits(false);
        setIsCreditsInEditMode(false);
        setIsEditingDefense(false);
        setIsDefenseInEditMode(false);
        setIsEditingDegree(false);
        setIsEditingDues(false);
        setIsEditingDisc(false);
        setShowRegHistory(false);
        setShowMentorDetails(false);
        setExpandedRegSem(null);
        setIsDiscDatePickerOpen(false);
    };

    useEffect(() => {
        if (student) {
            setStudentEditData({ ...student });
            loadStudentFollowupData();
            
            // Reset disciplinary form fields for the new student
            setDiscReason('');
            setDiscFromDate('');
            setDiscToDate('');
        }
    }, [student, loadStudentFollowupData]);

    const studentFollowupHistory = useMemo(() => {
        const targetId = String(student['Student ID']).trim();
        return studentFollowupData
            .filter(f => String(f['Student ID']).trim() === targetId)
            .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [student, studentFollowupData]);

    const semesterSequence = useMemo(() => {
        if (!registrationLookup) return [];
        const allSems = new Set<string>();
        registrationLookup.forEach(sems => sems.forEach(s => allSems.add(s)));
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        return Array.from(allSems).sort((a: string, b: string) => {
            const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
            const matchA = a.match(regex);
            const matchB = b.match(regex);
            if (!matchA || !matchB) return b.localeCompare(a);
            let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
            let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
            if (yearA !== yearB) return yearA - yearB;
            return (seasonWeight[matchA[1].toLowerCase()] || 0) - (seasonWeight[matchB[1].toLowerCase()] || 0);
        });
    }, [registrationLookup]);

    const registrationHistory = useMemo(() => {
        if (!registrationLookup || !studentSemester) return [];
        const startIndex = semesterSequence.findIndex(s => s === studentSemester);
        if (startIndex === -1) return [];
        return semesterSequence.slice(startIndex).reverse();
    }, [registrationLookup, semesterSequence, studentSemester]);

    const lastRegSemester = useMemo(() => {
        if (!registrationLookup) return 'Never';
        const cleanId = String(student['Student ID']).trim();
        const sems = registrationLookup.get(cleanId);
        if (!sems || sems.size === 0) return 'Never';
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const sortedSems = Array.from(sems).sort((a: string, b: string) => {
            const matchA = a.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            const matchB = b.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!matchA || !matchB) return b.localeCompare(a);
            let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
            let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
            if (yearA !== yearB) return yearB - yearA;
            return (seasonWeight[matchB[1].toLowerCase()] || 0) - (seasonWeight[matchA[1].toLowerCase()] || 0);
        });
        return sortedSems[0];
    }, [student, registrationLookup]);

    const mentorFullInfo = useMemo(() => {
        if (!student?.Mentor) return null;
        const normId = normalizeId(student.Mentor);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) return { ...emp, type: 'employee' };
        const teach = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teach) {
            return {
                'Employee ID': teach['Employee ID'], 'Employee Name': teach['Employee Name'], 'Academic Designation': teach.Designation, 'Administrative Designation': '',
                'Mobile': teach['Mobile Number'], 'E-mail': teach.Email, 'Photo': findInRow(teach, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']), 'Department': teach.Department, type: 'teacher'
            };
        }
        return null;
    }, [student, diuEmployeeData, teacherData]);

    const supervisorFullInfo = useMemo(() => {
        const supervisorRaw = studentEditData['Defense Supervisor'] || student?.['Defense Supervisor'];
        if (!supervisorRaw) return null;
        let idToLookup = supervisorRaw;
        const idMatch = supervisorRaw.match(/\(([^)]+)\)$/);
        if (idMatch) idToLookup = idMatch[1].trim();
        const normId = normalizeId(idToLookup);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) return { ...emp, type: 'employee' };
        const teach = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teach) {
            return {
                'Employee ID': teach['Employee ID'], 'Employee Name': teach['Employee Name'], 'Academic Designation': teach.Designation, 'Administrative Designation': '',
                'Mobile': teach['Mobile Number'], 'E-mail': teach.Email, 'Photo': findInRow(teach, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']), 'Department': teach.Department, type: 'teacher'
            };
        }
        return null;
    }, [student, studentEditData['Defense Supervisor'], diuEmployeeData, teacherData]);

    const handleSaveStudentEdit = async () => {
        if (!studentSemester) return;
        setIsSaving(true);
        try {
            const payload = { ...studentEditData };
            if (payload['Defense Supervisor'] && typeof payload['Defense Supervisor'] === 'string' && payload['Defense Supervisor'].includes('(')) {
                const idMatch = payload['Defense Supervisor'].match(/\(([^)]+)\)$/);
                if (idMatch) payload['Defense Supervisor'] = idMatch[1].trim();
            }
            await onSaveStudent(studentSemester, payload as StudentDataRow);
            setIsEditingCredits(false); setIsCreditsInEditMode(false); setIsEditingDefense(false); setIsDefenseInEditMode(false); setIsEditingDegree(false); setIsEditingDues(false); setIsEditingDisc(false);
            setIsDiscDatePickerOpen(false);
        } catch (e) { console.error("Failed to save student profile", e); }
        finally { setIsSaving(false); }
    };

    const handleSaveDisciplinary = async () => {
        if (!studentSemester) return;
        if (!discReason || !discFromDate) {
            alert("Please provide at least a reason and start date.");
            return;
        }

        let formatted = '';
        if (discFromDate && discToDate) {
            formatted = `${discReason} from ${discFromDate} to ${discToDate}`;
        } else {
            formatted = `${discFromDate} (Permanent ${discReason})`;
        }

        // Close immediately for a faster UI feel
        setIsDiscDatePickerOpen(false);
        setIsSaving(true);
        
        try {
            const payload = { ...studentEditData, 'Disciplinary Action': formatted };
            await onSaveStudent(studentSemester, payload as StudentDataRow);
            setStudentEditData(payload);
        } catch (e) { 
            console.error("Failed to save disciplinary action", e); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleSaveFollowup = async () => {
        if (!followupFormData.Date || !followupFormData.Status || !followupFormData.Remark) {
            alert("Please fill in required fields."); return;
        }
        setIsSaving(true);
        const now = new Date();
        const datePart = now.toISOString().split('T')[0];
        const timePart = now.toTimeString().split(' ')[0];
        const payload = { ...followupFormData, 'Student ID': student['Student ID'], 'Student Name': student['Student Name'], 'uniqueid': `SF-${Date.now()}-${Math.floor(Math.random() * 1000)}`, Timestamp: `${datePart} ${timePart}` };
        setStudentFollowupData(prev => [payload, ...prev]);
        setShowFollowupForm(false);
        setFollowupFormData({ Date: datePart, Remark: '', 'Re-follow up': '', Status: 'Call Busy', 'Contacted By': '' });
        try {
            const result = await submitSheetData('add', SHEET_NAMES.FOLLOWUP, payload, 'uniqueid', undefined, STUDENT_LINK_SHEET_ID);
            if (result.result !== 'success') { setStudentFollowupData(prev => prev.filter(f => f.uniqueid !== payload.uniqueid)); }
            else { reloadData('followup', false); }
        } catch (e) { setStudentFollowupData(prev => prev.filter(f => f.uniqueid !== payload.uniqueid)); }
        finally { setIsSaving(false); }
    };

    const historyWithDummy = useMemo(() => {
        const cleanId = String(student['Student ID']).trim();
        const registeredSems = registrationLookup?.get(cleanId);
        return registrationHistory.map(sem => {
            const isRegistered = registeredSems?.has(sem) || false;
            const seed = sem.length + sem.charCodeAt(0);
            const data = isRegistered ? { taken: 12 + (seed % 7), complete: 12 + (seed % 7) - (seed % 2), sgpa: (3.0 + (seed % 10) / 10).toFixed(2), dues: (seed % 8 === 0) ? (seed * 15) : 0 } : { taken: 0, complete: 0, sgpa: '-', dues: 0 };
            return { semester: sem, isRegistered, ...data };
        });
    }, [registrationHistory, registrationLookup, student]);

    const isCreditsMet = parseFloat(student['Credit Completed'] || '0') >= parseFloat(student['Credit Requirement'] || '0');
    const isDegreeDone = student['Degree Status']?.toLowerCase() === 'complete';
    const isDefenseSuccess = student['Defense Status']?.toLowerCase() === 'complete' && !isValEmpty(student['Defense Registration']);
    const isDefenseDirty = (studentEditData['Defense Registration'] !== student['Defense Registration'] || studentEditData['Defense Status'] !== student['Defense Status'] || studentEditData['Defense Supervisor'] !== student['Defense Supervisor']);
    const isDiscActive = !isValEmpty(student['Disciplinary Action']);
    const anyPopupOpen = showRegHistory || showMentorDetails || isEditingCredits || isEditingDefense || isEditingDegree || isEditingDues || isEditingDisc || isDiscDatePickerOpen;

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/10 font-sans">
            {/* 1. Header Profile Summary - Fixed height */}
            <div className="bg-white border-b border-slate-100 p-5 shadow-sm shrink-0">
                <div className="flex items-start space-x-5">
                    <div className="w-16 h-16 rounded-full border-2 border-white shadow-md flex items-center justify-center bg-blue-50 ring-1 ring-blue-100 overflow-hidden shrink-0">
                        <User className="w-8 h-8 text-blue-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 leading-tight tracking-tight truncate">{student['Student Name']}</h2>
                            {isDiscActive && (
                                <button onClick={() => { closeAllInfoPanels(); setIsEditingDisc(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors animate-pulse">
                                    <ShieldAlert className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        {/* Student ID Line - Now Static as requested */}
                        <div className="flex items-center mt-1">
                            <p className="text-[10px] font-mono font-bold text-blue-600">
                                {student['Student ID']}
                            </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 mt-1.5 truncate">{program['Program Full Name']}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5 truncate uppercase tracking-tighter">{program['Faculty Full Name']}</p>
                        
                        {/* Disciplinary Action displayed under Faculty name - Now handles 'No Disciplinary Action' and is the Trigger */}
                        <div 
                            className="mt-1 flex items-center group cursor-pointer"
                            onClick={() => {
                                closeAllInfoPanels();
                                setIsDiscDatePickerOpen(!isDiscDatePickerOpen);
                            }}
                        >
                            <p className={`text-[10px] font-bold italic transition-colors ${isDiscActive ? 'text-red-600 animate-pulse' : 'text-slate-400 hover:text-blue-500'}`}>
                                {isDiscActive ? student['Disciplinary Action'] : 'No Disciplinary Action'}
                            </p>
                            <Pencil className="w-2.5 h-2.5 ml-1.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mt-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div onClick={() => { closeAllInfoPanels(); setIsEditingCredits(true); }} className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isEditingCredits ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isCreditsMet ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center space-x-1 mb-1.5"><GraduationCap className={`w-3 h-3 ${isCreditsMet ? 'text-emerald-500' : 'text-red-500'}`} /><span className={`text-[10px] uppercase font-bold tracking-tight ${isCreditsMet ? 'text-emerald-600' : 'text-red-600'}`}>Credits</span></div>
                            <div className={`text-sm font-bold leading-none ${isCreditsMet ? 'text-emerald-800' : 'text-red-800'}`}>{student['Credit Completed'] || '0'}<span className="text-[10px] font-normal mx-0.5 opacity-60">/</span>{student['Credit Requirement'] || '0'}</div>
                        </div>
                        <div onClick={() => { closeAllInfoPanels(); setIsEditingDefense(true); }} className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isEditingDefense ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isDefenseSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center space-x-1 mb-1.5"><Calendar className={`w-3 h-3 ${isDefenseSuccess ? 'text-emerald-500' : 'text-red-500'}`} /><span className={`text-[10px] uppercase font-bold tracking-tight ${isDefenseSuccess ? 'text-emerald-600' : 'text-red-600'}`}>Defense</span></div>
                            <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDefenseSuccess ? 'text-emerald-800' : 'text-red-800'}`}>{formatStatus(student['Defense Status'])}</div>
                        </div>
                        <div onClick={() => { closeAllInfoPanels(); setIsEditingDegree(true); }} className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isEditingDegree ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isDegreeDone ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center space-x-1 mb-1.5"><Award className={`w-3 h-3 ${isDegreeDone ? 'text-emerald-500' : 'text-red-500'}`} /><span className={`text-[10px] uppercase font-bold tracking-tight ${isDegreeDone ? 'text-emerald-600' : 'text-red-600'}`}>Degree</span></div>
                            <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDegreeDone ? 'text-emerald-800' : 'text-red-800'}`}>{formatStatus(student['Degree Status'])}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div onClick={() => { closeAllInfoPanels(); setIsEditingDues(true); }} className={`bg-amber-50 border border-amber-100 rounded p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isEditingDues ? 'shadow-lg ring-2 ring-amber-500/20' : 'shadow-sm hover:shadow-md'}`}>
                            <div className="flex items-center space-x-1 mb-1.5"><Banknote className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] uppercase font-bold tracking-tight text-amber-600">Dues</span></div>
                            <div className="text-sm font-bold text-amber-800 leading-none truncate w-full text-center">{student['Dues'] || '0'}</div>
                        </div>
                        <div onClick={() => { closeAllInfoPanels(); setShowRegHistory(true); }} className={`bg-emerald-50 border border-emerald-100 rounded p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer ${showRegHistory ? 'shadow-lg ring-2 ring-emerald-500/20' : 'shadow-sm hover:shadow-md'}`}>
                            <div className="flex items-center space-x-1 mb-1.5"><CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] uppercase font-bold tracking-tight text-emerald-600">Last Reg</span></div>
                            <div className="text-[11px] font-bold text-emerald-800 leading-none truncate w-full text-center">{lastRegSemester}</div>
                        </div>
                        <div onClick={() => { closeAllInfoPanels(); setShowMentorDetails(true); }} className={`bg-blue-50 border border-blue-100 rounded p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer ${showMentorDetails ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'}`}>
                            <div className="flex items-center space-x-1 mb-1.5"><ShieldQuestion className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] uppercase font-bold tracking-tight text-blue-600">Mentor</span></div>
                            <div className={`text-[11px] font-bold leading-none truncate w-full text-center ${mentorFullInfo ? 'text-emerald-700' : 'text-red-600'}`}>{mentorFullInfo ? 'Assigned' : 'Unassigned'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Workspace Area - This takes all remaining height */}
            <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
                
                {/* Fixed Overlay Container for History/KPI Edits */}
                {anyPopupOpen && (
                    <div className="absolute inset-0 z-[60] bg-white flex flex-col p-3 animate-in fade-in duration-200">
                        {/* New Disciplinary Date Form (Triggered by ID Click) */}
                        {isDiscDatePickerOpen && (
                            <div className="bg-red-50 rounded-xl shadow-lg border border-red-200 overflow-visible flex flex-col p-5 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between border-b border-red-200 pb-2">
                                    <h4 className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center">
                                        <CalendarRange className="w-4 h-4 mr-2" /> Disciplinary Action Dates
                                    </h4>
                                    <button onClick={() => setIsDiscDatePickerOpen(false)} className="text-red-400 hover:text-red-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-3 relative">
                                    <div className="relative z-[70]">
                                        <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Explanation / Action Type</label>
                                        <SearchableSelect 
                                            value={discReason} 
                                            onChange={(val) => setDiscReason(val)} 
                                            options={['Probation', 'Suspension', 'Expulsion', 'Warning', 'Fine Paid', 'Investigation Pending']} 
                                            placeholder="Select or add action type" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Effective From</label>
                                            <input 
                                                type="date" 
                                                value={discFromDate} 
                                                onChange={e => setDiscFromDate(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-100 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Effective To (Optional)</label>
                                            <input 
                                                type="date" 
                                                value={discToDate} 
                                                onChange={e => setDiscToDate(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-100 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-red-500 italic bg-white/50 p-2 rounded border border-red-100">
                                        Note: If "Effective To" is empty, it will be marked as Permanent.
                                    </p>
                                </div>
                                <div className="flex space-x-3 pt-2">
                                    <button onClick={() => setIsDiscDatePickerOpen(false)} className="flex-1 py-2.5 text-xs font-bold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors">Cancel</button>
                                    <button 
                                        onClick={handleSaveDisciplinary} 
                                        disabled={isSaving}
                                        className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md flex items-center justify-center"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Apply Action
                                    </button>
                                </div>
                            </div>
                        )}

                        {showRegHistory && (
                            <div className="bg-white rounded-xl shadow-lg border border-emerald-100 overflow-hidden flex flex-col h-full">
                                <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between shrink-0">
                                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center">
                                        <History className="w-3.5 h-3.5 mr-1.5" /> Registration History
                                    </h4>
                                    <button onClick={() => setShowRegHistory(false)} className="text-emerald-500 hover:text-emerald-700 p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto thin-scrollbar relative bg-white">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-700 sticky top-0 z-20 shadow-sm">
                                            <tr>
                                                <th className="px-3 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600">Semester</th>
                                                <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">Taken</th>
                                                <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">Complete</th>
                                                <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">SGPA</th>
                                                <th className="px-2 py-2 text-[9px] font-black text-white uppercase text-center">Dues</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyWithDummy.map(row => { 
                                                const isExpanded = expandedRegSem === row.semester; 
                                                return ( 
                                                    <React.Fragment key={row.semester}>
                                                        <tr onClick={() => row.isRegistered && setExpandedRegSem(isExpanded ? null : row.semester)} className={`transition-colors h-[32px] ${row.isRegistered ? 'hover:bg-emerald-50/40 cursor-pointer' : 'opacity-60 bg-gray-50'}`}>
                                                            <td className={`px-3 py-2 text-[11px] font-bold border-r border-slate-50 flex items-center ${row.isRegistered ? 'text-green-600' : 'text-red-500'}`}>
                                                                {row.isRegistered && <ChevronRight className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                                                                {row.semester}
                                                            </td>
                                                            <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-medium text-gray-700">{row.taken || '-'}</td>
                                                            <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-medium text-gray-700">{row.complete || '-'}</td>
                                                            <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-bold text-blue-600">{row.sgpa}</td>
                                                            <td className={`px-2 py-2 text-[11px] text-center font-bold ${row.dues > 0 ? 'text-red-600' : 'text-green-600'}`}>{row.dues > 0 ? row.dues : '0'}</td>
                                                        </tr>
                                                        {isExpanded && ( 
                                                            <tr>
                                                                <td colSpan={5} className="p-0 bg-white">
                                                                    <div className="p-2 border-b border-emerald-100 bg-slate-50/50">
                                                                        <table className="w-full text-left border-collapse bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                                            <thead className="bg-slate-100">
                                                                                <tr>
                                                                                    <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200">Code</th>
                                                                                    <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200">Title</th>
                                                                                    <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200 text-center">Sec</th>
                                                                                    <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200 text-center">GPA</th>
                                                                                    <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase text-center">Attend</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100">
                                                                                {DUMMY_COURSE_DETAILS.map((course, cIdx) => ( 
                                                                                    <tr key={cIdx} className="hover:bg-slate-50 transition-colors text-[10px] h-[28px]">
                                                                                        <td className="px-2 py-1 font-bold text-blue-600 border-r border-slate-100">{course.code}</td>
                                                                                        <td className="px-2 py-1 text-slate-700 border-r border-slate-100 truncate max-w-[120px]" title={course.title}>{course.title}</td>
                                                                                        <td className="px-2 py-1 text-center font-bold text-slate-600 border-r border-slate-100">{course.section}</td>
                                                                                        <td className="px-2 py-1 text-center font-black text-emerald-600 border-r border-slate-100">{course.gpa}</td>
                                                                                        <td className="px-2 py-1 text-center text-slate-500">{course.attend}</td>
                                                                                    </tr> 
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
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
                            </div>
                        )}

                        {showMentorDetails && (
                            <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
                                    <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center"><ShieldQuestion className="w-3.5 h-3.5 mr-1.5" /> Mentor Info</h4>
                                    <button onClick={() => setShowMentorDetails(false)} className="text-blue-500 hover:text-blue-700"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="p-4">{mentorFullInfo ? (<div className="flex items-start space-x-4"><div className="w-16 h-16 rounded border-2 border-slate-50 overflow-hidden shrink-0">{getImageUrl(mentorFullInfo.Photo) ? <img src={getImageUrl(mentorFullInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User className="w-8 h-8" /></div>}</div><div className="min-w-0 flex-1"><h3 className="text-[14px] font-bold text-slate-900 truncate">{mentorFullInfo['Employee Name']}</h3><p className="text-[10px] font-medium text-blue-600 mt-1 truncate">{[mentorFullInfo['Academic Designation'], mentorFullInfo['Administrative Designation']].filter(Boolean).join(' / ')}</p><div className="mt-3 space-y-1.5"><div className="flex items-center text-slate-600"><Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" /><p className="text-[10px] font-mono font-bold truncate">{mentorFullInfo.Mobile || '-'}</p></div><div className="flex items-center text-slate-600"><Mail className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" /><p className="text-[10px] font-medium truncate">{mentorFullInfo['E-mail'] || '-'}</p></div></div></div></div>) : (<p className="text-xs text-gray-400 italic">No mentor assigned</p>)}</div>
                            </div>
                        )}

                        {(isEditingCredits || isEditingDefense || isEditingDegree || isEditingDues || isEditingDisc) && (
                            <div className="bg-slate-50 rounded p-4 shadow-lg border border-slate-200 h-full overflow-y-auto thin-scrollbar">
                                {isEditingCredits && (
                                    <div className="space-y-4">
                                        <div className="flex items-end space-x-3">
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <div><label className="text-[9px] font-bold text-slate-500 uppercase">Requirement</label><input type="number" value={studentEditData['Credit Requirement'] || ''} onChange={e => setStudentEditData({...studentEditData, 'Credit Requirement': e.target.value})} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                                <div><label className="text-[9px] font-bold text-slate-500 uppercase">Completed</label><input type="number" value={studentEditData['Credit Completed'] || ''} onChange={e => setStudentEditData({...studentEditData, 'Credit Completed': e.target.value})} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                            </div>
                                            <button onClick={handleSaveStudentEdit} className="p-2 bg-blue-600 text-white rounded"><Save className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )}
                                {isEditingDefense && (
                                    <div className="space-y-4">
                                        {!isDefenseInEditMode ? (
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <div className="bg-white p-2 rounded border border-slate-100 shadow-sm text-center">
                                                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Registration</span>
                                                            <span className="text-xs font-bold text-slate-700">{formatDisplayDate(studentEditData['Defense Registration'])}</span>
                                                        </div>
                                                        <div className="bg-white p-2 rounded border border-slate-100 shadow-sm text-center">
                                                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Status</span>
                                                            <span className={`text-[10px] font-bold ${studentEditData['Defense Status']?.toLowerCase() === 'complete' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                {formatStatus(studentEditData['Defense Status'])}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setIsDefenseInEditMode(true)} className="ml-3 p-2 text-blue-600 bg-white border border-blue-200 rounded shadow-sm hover:bg-blue-50 transition-colors">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="bg-white p-2.5 rounded border border-slate-100 shadow-sm flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded border border-slate-100 shadow-sm overflow-hidden bg-gray-50 shrink-0">
                                                        {supervisorFullInfo && getImageUrl(supervisorFullInfo.Photo) ? (
                                                            <img src={getImageUrl(supervisorFullInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                <User className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Supervisor</p>
                                                        <h4 className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                                                            {supervisorFullInfo?.['Employee Name'] || student?.['Defense Supervisor'] || 'Not Assigned'}
                                                        </h4>
                                                        {supervisorFullInfo && (
                                                            <p className="text-[9px] font-medium text-blue-600 truncate leading-none mt-0.5">
                                                                {[supervisorFullInfo['Academic Designation'], supervisorFullInfo['Administrative Designation']].filter(Boolean).join(' / ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Reg Date</label>
                                                        <input type="date" value={studentEditData['Defense Registration'] || ''} onChange={e => setStudentEditData({...studentEditData, 'Defense Registration': e.target.value})} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:border-blue-500 outline-none shadow-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Status</label>
                                                        <select value={studentEditData['Defense Status'] || 'Pending'} onChange={e => setStudentEditData({...studentEditData, 'Defense Status': e.target.value})} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:border-blue-500 outline-none shadow-sm bg-white">
                                                            <option value="Pending">Pending</option>
                                                            <option value="Complete">Complete</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Supervisor</label>
                                                    <SearchableSelect 
                                                        value={studentEditData['Defense Supervisor'] || ''} 
                                                        onChange={val => setStudentEditData({...studentEditData, 'Defense Supervisor': val})} 
                                                        options={employeeOptions} 
                                                        placeholder="Search Supervisor" 
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between pt-2 space-x-2">
                                                    <button onClick={() => { setIsDefenseInEditMode(false); setStudentEditData({ ...student }); }} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded shadow-sm">Cancel</button>
                                                    <button onClick={handleSaveStudentEdit} disabled={isSaving || !isDefenseDirty} className={`flex-1 py-2 text-xs font-bold text-white rounded shadow-md transition-all ${isDefenseDirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}>
                                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Save Changes'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isEditingDegree && (
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Degree Status</label><select value={studentEditData['Degree Status'] || 'Pending'} onChange={e => setStudentEditData({...studentEditData, 'Degree Status': e.target.value})} className="w-full px-2 py-1 text-xs border rounded"><option value="Pending">Pending</option><option value="Complete">Complete</option></select></div>
                                        <button onClick={handleSaveStudentEdit} className="p-2 bg-blue-600 text-white rounded mt-4"><Save className="w-4 h-4" /></button>
                                    </div>
                                )}
                                {isEditingDues && (
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Total Dues</label><input type="number" value={studentEditData['Dues'] || ''} onChange={e => setStudentEditData({...studentEditData, 'Dues': e.target.value})} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                        <button onClick={handleSaveStudentEdit} className="p-2 bg-blue-600 text-white rounded mt-4"><Save className="w-4 h-4" /></button>
                                    </div>
                                )}
                                {isEditingDisc && (
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2 text-red-600 border-b border-red-100 pb-1.5 mb-1.5">
                                            <ShieldAlert className="w-4 h-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Disciplinary Record</h4>
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <textarea 
                                                value={studentEditData['Disciplinary Action'] || ''} 
                                                onChange={e => setStudentEditData({...studentEditData, 'Disciplinary Action': e.target.value})} 
                                                className="w-full px-3 py-2 text-xs border border-red-200 rounded-lg focus:ring-2 focus:ring-red-100 outline-none min-h-[100px] resize-none"
                                                placeholder="Describe disciplinary actions or restrictions..."
                                            />
                                            <div className="flex space-x-2 pt-2">
                                                <button onClick={() => setIsEditingDisc(false)} className="flex-1 py-2 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded uppercase">Cancel</button>
                                                <button onClick={handleSaveStudentEdit} className="flex-1 py-2 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-sm flex items-center justify-center uppercase">
                                                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save Record
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Floating Follow-up Form */}
                {showFollowupForm && (
                    <div className="absolute inset-x-3 top-3 bottom-3 z-[50] bg-white border border-rose-100 rounded-xl flex flex-col shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-top-2">
                        <div className="flex flex-col space-y-3 border-b border-rose-100/50 p-4 shrink-0">
                            <div className="flex items-center space-x-2">
                                <MessageSquarePlus className="w-4 h-4 text-rose-500" />
                                <h5 className="text-[10px] font-black text-rose-700 uppercase tracking-tight">New Conversation</h5>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Student</span>
                                    <span className="text-[14px] font-black text-slate-800 font-mono leading-tight">{student.Mobile || '-'}</span>
                                </div>
                                <div className="flex flex-col border-l border-slate-100 pl-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Father</span>
                                    <span className="text-[14px] font-black text-slate-800 font-mono leading-tight">{student['Father Name'] || '-'}</span>
                                </div>
                                <div className="flex flex-col border-l border-slate-100 pl-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Mother</span>
                                    <span className="text-[14px] font-black text-slate-800 font-mono leading-tight">{student['Mother Name'] || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-rose-600 uppercase">Contact Date *</label>
                                    <input required type="date" value={followupFormData.Date} onChange={e => setFollowupFormData({...followupFormData, Date: e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-rose-600 uppercase">Contacted By</label>
                                    <SearchableSelect value={followupFormData['Contacted By']} onChange={v => setFollowupFormData({...followupFormData, 'Contacted By': v})} options={employeeOptions} placeholder="Select Employee" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-rose-600 uppercase">Response Status *</label>
                                    <SearchableSelect value={followupFormData.Status} onChange={v => setFollowupFormData({...followupFormData, Status: v})} options={['Call Busy', 'Switched Off', 'Not Reachable', 'Department Change', 'University Change']} placeholder="Status" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-rose-600 uppercase">Re-follow up Date</label>
                                    <input type="date" value={followupFormData['Re-follow up']} onChange={e => setFollowupFormData({...followupFormData, 'Re-follow up': e.target.value})} className="w-full px-2 py-1.5 text-xs border rounded font-bold" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-rose-600 uppercase">Discussion Remark *</label>
                                <textarea required value={followupFormData.Remark} onChange={e => setFollowupFormData({...followupFormData, Remark: e.target.value})} rows={3} className="w-full px-3 py-2 text-xs border rounded font-medium resize-none" placeholder="Enter conversation details..." />
                            </div>
                        </div>

                        <div className="p-4 pt-2 flex space-x-2 shrink-0 border-t bg-rose-50/10">
                            <button onClick={() => setShowFollowupForm(false)} className="flex-1 py-2 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded uppercase">Cancel</button>
                            <button onClick={handleSaveFollowup} disabled={isSaving} className="flex-[1.5] py-2 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-sm flex items-center justify-center uppercase">
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                Save Record
                            </button>
                        </div>
                    </div>
                )}

                {/* Default Remarks View */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[40] px-3 py-2 border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
                        <div className="flex items-center">
                            <MessageSquareQuote className="w-3.5 h-3.5 mr-2 text-blue-600" />
                            <div className="flex flex-col">
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Remarks</h4>
                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{studentFollowupHistory.length} Records</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => { if (!showFollowupForm) { closeAllInfoPanels(); } setShowFollowupForm(!showFollowupForm); }}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-md border transition-all ${showFollowupForm ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-600 text-white border-blue-700 shadow-sm hover:bg-blue-700'}`}
                        >
                            {showFollowupForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            <span className="text-[9px] font-bold uppercase tracking-tight">{showFollowupForm ? 'Close' : 'Add Follow-up'}</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 thin-scrollbar space-y-3 pb-8 bg-slate-50/20">
                        {/* Notice for Disciplinary Action at the top of remarks if active */}
                        {isDiscActive && !showFollowupForm && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm mb-2 animate-in slide-in-from-top-2">
                                <div className="flex items-center space-x-2 text-red-700 mb-1.5">
                                    <ShieldAlert className="w-4 h-4" />
                                    <h4 className="text-[11px] font-black uppercase tracking-wider">Disciplinary Notice</h4>
                                </div>
                                <p className="text-[11px] text-red-600 leading-relaxed font-bold italic">{student['Disciplinary Action']}</p>
                                <button onClick={() => { closeAllInfoPanels(); setIsEditingDisc(true); }} className="mt-2 text-[9px] font-bold text-red-700 uppercase hover:underline">Modify Record</button>
                            </div>
                        )}

                        {studentFollowupHistory.length > 0 ? (
                            studentFollowupHistory.map((item, idx) => (
                                <div key={item.uniqueid || idx} className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm group hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-800">{formatDisplayDate(item.Date)}</span>
                                            <div className="flex items-center text-[8px] text-slate-400 font-bold uppercase mt-0.5"><User className="w-2.5 h-2.5 mr-1" />{item['Contacted By'] || 'System'}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${item.Status?.toLowerCase() === 'complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{item.Status || 'Pending'}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic border-l-2 border-slate-200 pl-2">{item.Remark}</p>
                                    {item['Re-follow up'] && (
                                        <div className="flex items-center text-blue-600 bg-blue-50/50 rounded px-2 py-1 mt-2"><Clock className="w-3 h-3 mr-1.5" /><span className="text-[9px] font-bold uppercase">Next: {formatDisplayDate(item['Re-follow up'])}</span></div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center opacity-40">
                                <MessageSquareQuote className="w-10 h-10 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest">No remarks recorded</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
