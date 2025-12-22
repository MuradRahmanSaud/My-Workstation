import React, { useState, useMemo, useEffect } from 'react';
import { Users, User, ShieldCheck, GraduationCap, Plus, Edit2, Save, Undo2, X, Eye, Phone, Mail, School, ClipboardList, BookCheck, UserRound, Pencil, Check, Smartphone, Info, ShieldQuestion, Award, Calendar, UsersRound, CheckCircle, AlertCircle, Clock, Loader2, Banknote, ChevronDown, CalendarCheck, ArrowLeft, History, BookOpen, ChevronRight } from 'lucide-react';
import { ProgramDataRow, DiuEmployeeRow, TeacherDataRow, FacultyLeadershipRow, StudentDataRow } from '../types';
import { normalizeId } from '../services/sheetService';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { EmployeeDetailsPanel } from './EmployeeDetailsPanel';

// Helper to format date as MMM DD, YYYY
const formatDisplayDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; 
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

// Helper for title casing Status
const formatStatus = (status: string | undefined): string => {
    if (!status) return 'Pending';
    const s = status.trim().toLowerCase();
    if (s === 'complete') return 'Complete';
    if (s === 'pending') return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

// Robust field discovery
const findInRow = (row: any, patterns: string[]): string => {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (found && !isValEmpty(row[found])) return String(row[found]).trim();
    }
    return '';
};

interface ProgramRightPanelProps {
    program: ProgramDataRow;
    facultyLeadership?: FacultyLeadershipRow;
    facultyLeadershipData: FacultyLeadershipRow[];
    diuEmployeeData: DiuEmployeeRow[];
    teacherData: TeacherDataRow[];
    employeeOptions: string[];
    employeeFieldOptions: any;
    onSaveFacultyLeadership: (data: any) => Promise<void>;
    onSaveProgramLeadership: (data: any) => Promise<void>;
    onSaveProgramData: (data: any) => Promise<void>;
    onSaveEmployee: (data: any, persist?: boolean) => Promise<void>;
    onSaveStudent?: (semester: string, student: StudentDataRow) => Promise<void>;
    forceEditTrigger?: number;
    selectedStudent?: StudentDataRow | null;
    studentSemester?: string;
    onCloseStudent?: () => void;
    registrationLookup?: Map<string, Set<string>>; // New Prop for history lookup
}

type PanelView = 'details' | 'edit-faculty' | 'edit-program' | 'edit-employee' | 'edit-program-leadership';

const resolveEmployees = (idsStr: string | undefined, employeeData: DiuEmployeeRow[], teacherData: TeacherDataRow[]) => {
    if (!idsStr) return [];
    const parts = idsStr.split(',').map(s => s.trim()).filter(Boolean);
    
    return parts.map(part => {
        const idMatch = part.match(/\(([^)]+)\)$/);
        const extractedId = idMatch ? idMatch[1].trim() : part;
        const normId = normalizeId(extractedId);
        const emp = employeeData.find(e => normalizeId(e['Employee ID']) === normId);
        const teacherMatch = !emp ? teacherData.find(t => normalizeId(t['Employee ID']) === normId) : null;
        
        return { 
            id: extractedId, 
            emp, 
            teacher: teacherMatch, 
            raw: part,
            isMissing: !emp 
        };
    });
};

const parseMetric = (str: string | undefined) => {
    if (!str) return { theory: '-', lab: '-' };
    const theoryMatch = str.match(/Theory\s+(\d+)/i);
    const labMatch = str.match(/Lab\s+(\d+)/i);
    return {
        theory: theoryMatch ? theoryMatch[1] : '-',
        lab: labMatch ? labMatch[1] : '-'
    };
};

// Dummy Data for Semester Course Details
const DUMMY_COURSE_DETAILS = [
    { code: 'CSE101', title: 'Introduction to Computer Science', section: 'A', gpa: '3.75', attend: '90%', teacher: '71000123' },
    { code: 'CSE102', title: 'Discrete Mathematics', section: 'B', gpa: '3.50', attend: '85%', teacher: '71000456' },
    { code: 'ENG101', title: 'English Composition', section: 'C1', gpa: '4.00', attend: '100%', teacher: '71000789' },
    { code: 'MAT101', title: 'Calculus I', section: 'D', gpa: '3.25', attend: '80%', teacher: '71000999' },
    { code: 'PHY101', title: 'Physics I', section: 'L1', gpa: '3.80', attend: '95%', teacher: '71000888' },
    { code: 'CSE103', title: 'Programming in C', section: 'E', gpa: '3.65', attend: '88%', teacher: '71000777' },
    { code: 'GED101', title: 'Bangladesh Studies', section: 'F', gpa: '3.90', attend: '92%', teacher: '71000666' },
];

export const ProgramRightPanel: React.FC<ProgramRightPanelProps> = ({ 
    program, 
    facultyLeadership, 
    facultyLeadershipData,
    diuEmployeeData, 
    teacherData,
    employeeOptions,
    employeeFieldOptions,
    onSaveFacultyLeadership,
    onSaveProgramLeadership,
    onSaveProgramData,
    onSaveEmployee,
    onSaveStudent,
    forceEditTrigger = 0,
    selectedStudent,
    studentSemester,
    onCloseStudent,
    registrationLookup
}) => {
    const [view, setView] = useState<PanelView>('details');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<DiuEmployeeRow | null>(null);
    const [returnView, setReturnView] = useState<PanelView | null>(null);

    // Student Profile Edit States
    const [isEditingCredits, setIsEditingCredits] = useState(false);
    const [isCreditsInEditMode, setIsCreditsInEditMode] = useState(false);
    const [isEditingDefense, setIsEditingDefense] = useState(false);
    const [isDefenseInEditMode, setIsDefenseInEditMode] = useState(false); // Sub-state for defense editing
    const [isEditingDegree, setIsEditingDegree] = useState(false);
    const [isEditingDues, setIsEditingDues] = useState(false);
    const [showRegHistory, setShowRegHistory] = useState(false);
    const [showMentorDetails, setShowMentorDetails] = useState(false);
    const [expandedRegSem, setExpandedRegSem] = useState<string | null>(null);
    const [studentEditData, setStudentEditData] = useState<Partial<StudentDataRow>>({});

    useEffect(() => {
        setView('details');
        setSelectedEmployeeForDetails(null);
    }, [program.PID]);

    useEffect(() => {
        if (forceEditTrigger > 0) {
            handleEditProgram();
        }
    }, [forceEditTrigger]);

    // Handle Student selection changes
    useEffect(() => {
        if (selectedStudent) {
            setStudentEditData({ ...selectedStudent });
            setIsEditingCredits(false);
            setIsCreditsInEditMode(false);
            setIsEditingDefense(false);
            setIsDefenseInEditMode(false);
            setIsEditingDegree(false);
            setIsEditingDues(false);
            setShowRegHistory(false);
            setShowMentorDetails(false);
            setExpandedRegSem(null);
        }
    }, [selectedStudent]);

    const classDuration = parseMetric(program['Class Duration']);
    const classRequirement = parseMetric(program['Class Requirement']);

    // Helper to find student's faculty
    const studentFaculty = useMemo(() => {
        if (!selectedStudent || !facultyLeadershipData) return '-';
        return program['Faculty Full Name'] || '-';
    }, [selectedStudent, program, facultyLeadershipData]);

    // Calculate Last Registration Semester & Full History (from Enrollment to Recent)
    const semesterSequence = useMemo(() => {
        if (!registrationLookup) return [];
        const allSems = new Set<string>();
        registrationLookup.forEach(sems => {
            sems.forEach(s => allSems.add(s));
        });
        
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        
        const sorted = Array.from(allSems).sort((a: any, b: any) => {
            const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
            const matchA = (a as string).match(regex);
            const matchB = (b as string).match(regex);
            if (!matchA || !matchB) return (b as string).localeCompare(a as string);

            let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
            const seasonA = matchA[1].toLowerCase(); 
            let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
            const seasonB = matchB[1].toLowerCase();
            
            if (yearA !== yearB) return yearA - yearB;
            return (seasonWeight[seasonA] || 0) - (seasonWeight[seasonB] || 0);
        });

        return sorted;
    }, [registrationLookup]);

    const registrationHistory = useMemo(() => {
        if (!selectedStudent || !registrationLookup || !studentSemester) return [];
        
        // Find index of student's enrollment semester
        const startIndex = semesterSequence.findIndex(s => s === studentSemester);
        if (startIndex === -1) return [];

        // Show from enrollment to latest
        return semesterSequence.slice(startIndex).reverse();
    }, [selectedStudent, registrationLookup, semesterSequence, studentSemester]);

    const lastRegSemester = useMemo(() => {
        if (!selectedStudent || !registrationLookup) return 'Never';
        const cleanId = String(selectedStudent['Student ID']).trim();
        const sems = registrationLookup.get(cleanId);
        if (!sems || sems.size === 0) return 'Never';

        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const sortedSems = Array.from(sems).sort((a: any, b: any) => {
            const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
            const matchA = (a as string).match(regex);
            const matchB = (b as string).match(regex);
            if (!matchA || !matchB) return (b as string).localeCompare(a as string);
            let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
            let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
            if (yearA !== yearB) return yearB - yearA;
            return (seasonWeight[matchB[1].toLowerCase()] || 0) - (seasonWeight[matchA[1].toLowerCase()] || 0);
        });
        return sortedSems[0];
    }, [selectedStudent, registrationLookup]);

    // Helper to resolve full mentor object
    const mentorFullInfo = useMemo(() => {
        if (!selectedStudent?.Mentor) return null;
        const normId = normalizeId(selectedStudent.Mentor);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) return { ...emp, type: 'employee' };
        
        const teach = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
        if (teach) {
            return {
                'Employee ID': teach['Employee ID'],
                'Employee Name': teach['Employee Name'],
                'Academic Designation': teach.Designation,
                'Administrative Designation': '',
                'Mobile': teach['Mobile Number'],
                'E-mail': teach.Email,
                'Photo': findInRow(teach, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']),
                'Department': teach.Department,
                type: 'teacher'
            };
        }
        return null;
    }, [selectedStudent, diuEmployeeData, teacherData]);

    // Helper to resolve defense supervisor object
    const supervisorFullInfo = useMemo(() => {
        const supervisorRaw = studentEditData['Defense Supervisor'] || selectedStudent?.['Defense Supervisor'];
        if (!supervisorRaw) return null;
        
        let idToLookup = supervisorRaw;
        const idMatch = supervisorRaw.match(/\(([^)]+)\)$/);
        if (idMatch) idToLookup = idMatch[1].trim();

        const normId = normalizeId(idToLookup);
        const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
        if (emp) return { ...emp, type: 'employee' };
        
        const teach = teacherData.find(t => normalizeId(t['Employee ID']) === normId) ;
        if (teach) {
            return {
                'Employee ID': teach['Employee ID'],
                'Employee Name': teach['Employee Name'],
                'Academic Designation': teach.Designation,
                'Administrative Designation': '',
                'Mobile': teach['Mobile Number'],
                'E-mail': teach.Email,
                'Photo': findInRow(teach, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']),
                'Department': teach.Department,
                type: 'teacher'
            };
        }
        return null;
    }, [selectedStudent, studentEditData['Defense Supervisor'], diuEmployeeData, teacherData]);

    const handleSaveStudentEdit = async () => {
        if (!selectedStudent || !studentSemester || !onSaveStudent) return;
        setIsSaving(true);
        try {
            const payload = { ...studentEditData };
            if (payload['Defense Supervisor'] && typeof payload['Defense Supervisor'] === 'string' && payload['Defense Supervisor'].includes('(')) {
                const idMatch = payload['Defense Supervisor'].match(/\(([^)]+)\)$/);
                if (idMatch) {
                    payload['Defense Supervisor'] = idMatch[1].trim();
                }
            }
            await onSaveStudent(studentSemester, payload as StudentDataRow);
            setIsEditingCredits(false);
            setIsCreditsInEditMode(false);
            setIsEditingDefense(false);
            setIsDefenseInEditMode(false);
            setIsEditingDegree(false);
            setIsEditingDues(false);
        } catch (e) {
            console.error("Failed to save student profile updates", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditFaculty = () => {
        const existing = facultyLeadership;
        setFormData({
            'Faculty Short Name': program['Faculty Short Name'],
            'Faculty Full Name': program['Faculty Full Name'],
            'Dean': formatIdsForForm(existing?.Dean),
            'Associate Dean': formatIdsForForm(existing?.['Associate Dean']),
            'Administration': formatIdsForForm(existing?.Administration)
        });
        setView('edit-faculty');
    };

    const formatIdsForForm = (idsStr: string | undefined) => {
        if (!idsStr) return '';
        return idsStr.split(',').map(id => {
            const trimmedId = id.trim();
            const normId = normalizeId(trimmedId);
            const emp = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normId);
            if (emp) {
                const desig = [emp['Academic Designation'], emp['Administrative Designation']].filter(Boolean).join('/');
                return `${emp['Employee Name']} - ${desig} (${emp['Employee ID']})`;
            }
            const teach = teacherData.find(t => normalizeId(t['Employee ID']) === normId) ;
            if (teach) return `${teach['Employee Name']} - ${teach.Designation} (${teach['Employee ID']})`;
            return trimmedId;
        }).join(', ');
    };

    const handleEditProgram = () => {
        const dur = classDuration;
        const req = classRequirement;
        const semDurStr = program['Semester Duration'] || '';
        setFormData({
            ...program,
            'Theory Duration': dur.theory !== '-' ? dur.theory : '90',
            'Lab Duration': dur.lab !== '-' ? dur.lab : '120',
            'Theory Requirement': req.theory !== '-' ? req.theory : '0',
            'Lab Requirement': req.lab !== '-' ? req.lab : '0',
            'Semester Duration Num': (semDurStr.match(/(\d+)/) || [])[1] || '4',
        });
        setView('edit-program');
    };

    const handleSave = () => {
        const currentView = view;
        const dataToSave = { ...formData };
        setIsSaving(true);
        (async () => {
            try {
                if (currentView === 'edit-faculty') await onSaveFacultyLeadership(dataToSave);
                else if (currentView === 'edit-program') await onSaveProgramData(dataToSave);
                else if (currentView === 'edit-employee') await onSaveEmployee(dataToSave);
                else if (currentView === 'edit-program-leadership') await onSaveProgramLeadership(dataToSave);
            } catch (error) { console.error("Save error:", error); }
            finally { setIsSaving(false); }
        })();
        if (currentView === 'edit-employee' && returnView) { setView(returnView); setReturnView(null); }
        else { setView('details'); setReturnView(null); }
    };

    const renderPersonnelSection = (title: string, idsStr: string | undefined) => {
        const list = resolveEmployees(idsStr, diuEmployeeData, teacherData);
        if (list.length === 0) return null;
        return (
            <div className="mb-2.5 last:mb-0">
                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center px-1">
                    <User className="w-2.5 h-2.5 mr-1" />
                    {title}
                </h5>
                <div className="space-y-1.5">
                    {list.map(({ id, emp, teacher, raw, isMissing }, idx) => {
                        const displayName = emp?.['Employee Name'] || teacher?.['Employee Name'] || (raw.includes('(') ? raw.split('(')[0].trim() : 'Unknown Name');
                        const displayDesig = emp ? [emp['Academic Designation'], emp['Administrative Designation']].filter(Boolean).join(', ') : (teacher?.Designation || 'Registration Required');
                        const rawPhoto = (!isValEmpty(emp?.Photo)) ? emp!.Photo : findInRow(teacher, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']);
                        const photoUrl = getImageUrl(rawPhoto);
                        return (
                            <div key={idx} className={`flex items-center group relative bg-white p-2 rounded border transition-all duration-200 ${isMissing ? 'bg-red-50 border-red-200 hover:border-red-400' : 'border-slate-100 hover:border-blue-200 hover:shadow-sm'}`}>
                                <div className={`w-8 h-8 rounded-full shrink-0 mr-3 border overflow-hidden flex items-center justify-center bg-gray-50 ${isMissing ? 'border-red-200' : 'border-slate-100 shadow-sm'}`}>
                                    {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className={`w-4 h-4 ${isMissing ? 'text-red-300' : 'text-slate-300'}`} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-[11px] font-bold leading-tight ${isMissing ? 'text-red-700' : 'text-slate-800'}`}>{displayName}</div>
                                    <div className={`text-[9px] truncate leading-tight ${isMissing ? 'text-red-500 font-medium' : 'text-slate-500'}`}>{displayDesig}</div>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        <div className={`text-[9px] font-bold ${isMissing ? 'text-red-600' : 'text-gray-500'}`}>{emp?.Mobile || teacher?.['Mobile Number'] || '-'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { if (emp) setSelectedEmployeeForDetails(emp); }} className={`p-1.5 rounded-full transition-all ${isMissing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="View Details"><Eye className="w-3 h-3" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Helper for deterministic dummy data generation
    const getDummyHistoryData = (sem: string, isRegistered: boolean) => {
        if (!isRegistered) return { taken: 0, complete: 0, sgpa: '-', dues: 0 };
        const seed = sem.length + sem.charCodeAt(0);
        const taken = 12 + (seed % 7); // 12-18
        const complete = taken - (seed % 2); // mostly complete
        const sgpa = (3.0 + (seed % 10) / 10).toFixed(2);
        const dues = (seed % 8 === 0) ? (seed * 15) : 0;
        return { taken, complete, sgpa, dues };
    };

    const historyWithDummy = useMemo(() => {
        if (!selectedStudent || !registrationLookup) return [];
        const cleanId = String(selectedStudent['Student ID']).trim();
        const registeredSems = registrationLookup.get(cleanId);

        return registrationHistory.map(sem => {
            const isRegistered = registeredSems?.has(sem) || false;
            return {
                semester: sem,
                isRegistered,
                ...getDummyHistoryData(sem, isRegistered)
            };
        });
    }, [registrationHistory, registrationLookup, selectedStudent]);

    const historyTotals = useMemo(() => {
        const baseTotals = historyWithDummy.reduce((acc, row) => {
            if (row.isRegistered) {
                acc.taken += row.taken;
                acc.complete += row.complete;
                acc.dues += row.dues;
                const sgpaVal = parseFloat(row.sgpa);
                if (!isNaN(sgpaVal)) {
                    acc.sgpaSum += sgpaVal;
                    acc.sgpaCount += 1;
                }
            }
            return acc;
        }, { taken: 0, complete: 0, dues: 0, sgpaSum: 0, sgpaCount: 0 });

        return {
            taken: baseTotals.taken,
            complete: baseTotals.complete,
            dues: baseTotals.dues,
            sgpaAvg: baseTotals.sgpaCount > 0 ? (baseTotals.sgpaSum / baseTotals.sgpaCount).toFixed(2) : '-'
        };
    }, [historyWithDummy]);

    if (view !== 'details') {
        return (
            <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-white border-l border-slate-100 shrink-0 overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {view === 'edit-faculty' ? 'Faculty Leadership' : view === 'edit-program' ? 'Edit Program' : 'Program Leadership'}
                    </h3>
                    <button onClick={() => { setView('details'); }} className="p-1.5 hover:bg-white rounded-full text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar bg-slate-50/30">
                    {(view === 'edit-faculty' || view === 'edit-program-leadership') && (
                        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm space-y-4">
                            {['Head', 'Associate Head', 'Administration', 'Dean', 'Associate Dean'].filter(col => {
                                if (view === 'edit-faculty') return ['Dean', 'Associate Dean', 'Administration'].includes(col);
                                return ['Head', 'Associate Head', 'Administration'].includes(col);
                            }).map(col => (
                                <div key={col}>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{col}</label>
                                    <MultiSearchableSelect value={formData[col] || ''} onChange={(v) => setFormData({...formData, [col]: v})} options={employeeOptions} placeholder={`Select ${col}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex space-x-2 shrink-0 pb-8 md:pb-4">
                    <button onClick={() => { setView('details'); }} className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-gray-200 rounded hover:bg-slate-100">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">{isSaving ? 'Saving...' : 'Save'}</button>
                </div>
            </div>
        );
    }

    const hasFacultyLeadership = !!facultyLeadership && (facultyLeadership.Dean || facultyLeadership['Associate Dean'] || facultyLeadership.Administration);
    const hasProgramLeadership = !!(program.Head || program['Associate Head'] || program.Administration);

    const isCreditsMet = selectedStudent ? (parseFloat(selectedStudent['Credit Completed'] || '0') >= parseFloat(selectedStudent['Credit Requirement'] || '0')) : false;
    const isDegreeDone = selectedStudent ? (selectedStudent['Degree Status']?.toLowerCase() === 'complete') : false;
    
    const isDefenseSuccess = useMemo(() => {
        if (!selectedStudent) return false;
        const status = selectedStudent['Defense Status']?.toLowerCase() || 'pending';
        const hasRegistration = !isValEmpty(selectedStudent['Defense Registration']);
        return status !== 'pending' && hasRegistration;
    }, [selectedStudent]);

    const isDefenseDirty = useMemo(() => {
        if (!selectedStudent) return false;
        return (
            studentEditData['Defense Registration'] !== selectedStudent['Defense Registration'] ||
            studentEditData['Defense Status'] !== selectedStudent['Defense Status'] ||
            studentEditData['Defense Supervisor'] !== selectedStudent['Defense Supervisor']
        );
    }, [studentEditData, selectedStudent]);

    return (
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-white overflow-hidden border-l border-slate-100 shrink-0 relative">
            <div className="flex-1 overflow-y-auto thin-scrollbar">
                {!selectedStudent && (
                    <div className="pt-5 pb-3 bg-white">
                        <div className="text-center px-4 space-y-1.5 relative group">
                            <button onClick={handleEditProgram} className="absolute top-0 right-4 p-1.5 bg-blue-50 text-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Edit Program Data"><Edit2 className="w-3.5 h-3.5" /></button>
                            <h1 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">{program['Program Full Name'] || 'Program Full Name'}</h1>
                            <h2 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{program['Faculty Full Name'] || 'Faculty Full Name'}</h2>
                            <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter pt-0.5"><span>{program['Semester Type'] || '-'}</span><span className="text-slate-200">|</span><span>{program['Program Type'] || '-'}</span></div>
                            <div className="bg-slate-50 border border-slate-100 rounded p-2 mt-3">
                                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                                    <div className="flex flex-col items-center"><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Class Duration</span><div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800"><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Theory</span>{classDuration.theory}m</div><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Lab</span>{classDuration.lab}m</div></div></div>
                                    <div className="flex flex-col items-center"><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Requirement</span><div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800"><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Theory</span>{classRequirement.theory}m</div><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Lab</span>{classRequirement.lab}m</div></div></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 space-y-3 bg-slate-50/20">
                            <div className="bg-white rounded border border-slate-200 p-3">
                                <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5 flex items-center justify-between uppercase tracking-widest">
                                    <div className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1.5 text-blue-600" />Faculty Leadership</div>
                                    <button onClick={handleEditFaculty} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-blue-600" title="Edit Faculty Leadership"><Plus className="w-3 h-3" /></button>
                                </h4>
                                {hasFacultyLeadership ? (
                                    <div className="space-y-1">
                                        {renderPersonnelSection('Dean', facultyLeadership?.Dean)}
                                        {renderPersonnelSection('Associate Dean', facultyLeadership?.['Associate Dean'])}
                                        {renderPersonnelSection('Administration', facultyLeadership?.Administration)}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded"><p className="text-[10px] font-bold text-slate-300 uppercase">No Records</p></div>
                                )}
                            </div>
                            <div className="bg-white rounded border border-slate-200 p-3">
                                <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5 flex items-center justify-between uppercase tracking-widest">
                                    <div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1.5 text-indigo-600" />Program Leadership</div>
                                    <button onClick={() => { setFormData({...program}); setView('edit-program-leadership'); }} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-blue-600" title="Edit Program Leadership"><Plus className="w-3 h-3" /></button>
                                </h4>
                                {hasProgramLeadership ? (
                                    <div className="space-y-1">
                                        {renderPersonnelSection('Head', program.Head)}
                                        {renderPersonnelSection('Associate Head', program['Associate Head'])}
                                        {renderPersonnelSection('Administration', program.Administration)}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded"><p className="text-[10px] font-bold text-slate-300 uppercase">No Records</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedEmployeeForDetails && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                    <div className="flex flex-col h-full overflow-hidden">
                        <EmployeeDetailsPanel 
                            employee={selectedEmployeeForDetails} 
                            onClose={() => setSelectedEmployeeForDetails(null)} 
                            onUpdate={(updatedData) => {
                                onSaveEmployee(updatedData);
                                setSelectedEmployeeForDetails(updatedData);
                            }} 
                            fieldOptions={employeeFieldOptions} 
                            isInline={true} 
                        />
                    </div>
                </div>
            )}

            {selectedStudent && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl overflow-hidden font-sans">
                    {/* Header - Compact */}
                    <div className="px-4 py-2 border-b border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest flex items-center">
                            <UserRound className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                            Student Profile
                        </h3>
                        <button onClick={onCloseStudent} className="p-1 hover:bg-white rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <div className="bg-white border-b border-slate-100 p-5 shadow-sm shrink-0 z-10">
                            <div className="flex items-start space-x-5">
                                <div className="w-16 h-16 rounded-full border-2 border-white shadow-md flex items-center justify-center bg-blue-50 ring-1 ring-blue-100 overflow-hidden shrink-0">
                                    <User className="w-8 h-8 text-blue-200" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-slate-900 leading-tight tracking-tight truncate" title={selectedStudent['Student Name']}>
                                        {selectedStudent['Student Name']}
                                    </h2>
                                    <p className="text-[10px] font-mono font-bold text-blue-600 mt-1">
                                        {selectedStudent['Student ID']}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 mt-1.5 truncate">
                                        {program['Program Full Name']}
                                    </p>
                                    <p className="text-xs font-medium text-slate-400 mt-0.5 truncate uppercase tracking-tighter">
                                        {studentFaculty}
                                    </p>

                                    <div className="mt-3 flex items-center gap-3 bg-slate-50/70 p-2 rounded border border-slate-100">
                                        <div className="flex items-center text-blue-600 overflow-hidden flex-1">
                                            <Mail className="w-3.5 h-3.5 mr-1.5 shrink-0 text-blue-400" />
                                            <p className="text-xs font-medium truncate" title={selectedStudent.Email}>
                                                {selectedStudent.Email || '-'}
                                            </p>
                                        </div>
                                        <div className="w-px h-3 bg-slate-200 shrink-0" />
                                        <div className="flex items-center text-emerald-600 shrink-0">
                                            <Smartphone className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-400" />
                                            <p className="text-xs font-mono font-bold">
                                                {selectedStudent.Mobile || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <div 
                                        className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/card ${isEditingCredits ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isCreditsMet ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                                        onClick={() => { setIsEditingCredits(!isEditingCredits); setIsCreditsInEditMode(false); setIsEditingDefense(false); setIsDefenseInEditMode(false); setIsEditingDegree(false); setIsEditingDues(false); setShowRegHistory(false); setShowMentorDetails(false); }}
                                    >
                                        <div className="flex items-center space-x-1 mb-1.5">
                                            <GraduationCap className={`w-3 h-3 ${isCreditsMet ? 'text-emerald-500' : 'text-red-500'}`} />
                                            <span className={`text-[10px] uppercase font-bold tracking-tight ${isCreditsMet ? 'text-emerald-600' : 'text-red-600'}`}>Credits</span>
                                        </div>
                                        <div className={`text-sm font-bold leading-none ${isCreditsMet ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {selectedStudent['Credit Completed'] || '0'}<span className="text-[10px] font-normal mx-0.5 opacity-60">/</span>{selectedStudent['Credit Requirement'] || '0'}
                                        </div>
                                    </div>
                                    
                                    <div 
                                        className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/card ${isEditingDefense ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isDefenseSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                                        onClick={() => { setIsEditingDefense(!isEditingDefense); setIsDefenseInEditMode(false); setIsEditingCredits(false); setIsCreditsInEditMode(false); setIsEditingDegree(false); setIsEditingDues(false); setShowRegHistory(false); setShowMentorDetails(false); }}
                                    >
                                        <div className="flex items-center space-x-1 mb-1.5">
                                            <Calendar className={`w-3 h-3 ${isDefenseSuccess ? 'text-emerald-500' : 'text-red-500'}`} />
                                            <span className={`text-[10px] uppercase font-bold tracking-tight ${isDefenseSuccess ? 'text-emerald-600' : 'text-red-600'}`}>Defense</span>
                                        </div>
                                        <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDefenseSuccess ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {formatStatus(selectedStudent['Defense Status'])}
                                        </div>
                                    </div>

                                    <div 
                                        className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/card ${isEditingDegree ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isDegreeDone ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                                        onClick={() => { setIsEditingDegree(!isEditingDegree); setIsEditingCredits(false); setIsCreditsInEditMode(false); setIsEditingDefense(false); setIsDefenseInEditMode(false); setIsEditingDues(false); setShowRegHistory(false); setShowMentorDetails(false); }}
                                    >
                                        <div className="flex items-center space-x-1 mb-1.5">
                                            <Award className={`w-3 h-3 ${isDegreeDone ? 'text-emerald-500' : 'text-red-500'}`} />
                                            <span className={`text-[10px] uppercase font-bold tracking-tight ${isDegreeDone ? 'text-emerald-600' : 'text-red-600'}`}>Degree</span>
                                        </div>
                                        <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDegreeDone ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {formatStatus(selectedStudent['Degree Status'])}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div 
                                        className={`bg-amber-50 border border-amber-100 rounded p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/card ${isEditingDues ? 'shadow-lg ring-2 ring-amber-500/20' : 'shadow-sm hover:shadow-md'}`}
                                        onClick={() => { setIsEditingDues(!isEditingDues); setIsEditingCredits(false); setIsCreditsInEditMode(false); setIsEditingDefense(false); setIsDefenseInEditMode(false); setIsEditingDegree(false); setShowRegHistory(false); setShowMentorDetails(false); }}
                                    >
                                        <div className="flex items-center space-x-1 mb-1.5">
                                            <Banknote className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[10px] uppercase font-bold tracking-tight text-amber-600">Dues</span>
                                        </div>
                                        <div className="text-sm font-bold text-amber-800 leading-none truncate w-full text-center">
                                            {selectedStudent['Dues'] || '0'}
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => { setShowRegHistory(!showRegHistory); setIsEditingDues(false); setIsEditingCredits(false); setIsCreditsInEditMode(false); setIsEditingDefense(false); setIsDefenseInEditMode(false); setIsEditingDegree(false); setShowMentorDetails(false); }}
                                        className={`bg-emerald-50 border border-emerald-100 rounded p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer group/reg ${showRegHistory ? 'shadow-lg ring-2 ring-emerald-500/20' : 'shadow-sm hover:shadow-md'}`}
                                    >
                                        <div className="flex items-center space-x-1 mb-1.5">
                                            <CalendarCheck className="w-3.5 h-3.5 text-emerald-500 group-hover/reg:scale-110 transition-transform" />
                                            <span className="text-[10px] uppercase font-bold tracking-tight text-emerald-600">Last Reg</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-emerald-800 leading-none truncate w-full text-center" title={lastRegSemester}>
                                            {lastRegSemester}
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => { setShowMentorDetails(!showMentorDetails); setShowRegHistory(false); setIsEditingDues(false); setIsEditingCredits(false); setIsCreditsInEditMode(false); setIsEditingDefense(false); setIsDefenseInEditMode(false); setIsEditingDegree(false); }}
                                        className={`bg-blue-50 border border-blue-100 rounded p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer group/mentor ${showMentorDetails ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'}`}
                                    >
                                        <div className="flex items-center space-x-1 mb-1.5">
                                            <ShieldQuestion className="w-3.5 h-3.5 text-blue-500 group-hover/mentor:scale-110 transition-transform" />
                                            <span className="text-[10px] uppercase font-bold tracking-tight text-blue-600">Mentor</span>
                                        </div>
                                        <div className={`text-[11px] font-bold leading-none truncate w-full text-center ${mentorFullInfo ? 'text-emerald-700' : 'text-red-600'}`}>
                                            {mentorFullInfo ? 'Assigned' : 'Unassigned'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {showRegHistory && (
                                <div className="mt-4 pt-4 border-t border-slate-50 bg-white rounded shadow-lg border border-emerald-100 overflow-hidden animate-in slide-in-from-top fade-in duration-500">
                                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center">
                                            <History className="w-3.5 h-3.5 mr-1.5" /> Registration History
                                        </h4>
                                        <button onClick={() => setShowRegHistory(false)} className="text-emerald-500 hover:text-emerald-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-[400px] overflow-auto thin-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-700 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-3 py-2 text-[9px] font-black text-white uppercase tracking-wider border-r border-slate-600">Registration</th>
                                                    <th className="px-2 py-2 text-[9px] font-black text-white uppercase tracking-wider border-r border-slate-600 text-center">Taken</th>
                                                    <th className="px-2 py-2 text-[9px] font-black text-white uppercase tracking-wider border-r border-slate-600 text-center">Complete</th>
                                                    <th className="px-2 py-2 text-[9px] font-black text-white uppercase tracking-wider border-r border-slate-600 text-center">SGPA</th>
                                                    <th className="px-3 py-2 text-[9px] font-black text-white uppercase tracking-wider text-center">Dues</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {historyWithDummy.map((row) => {
                                                    const isExpanded = expandedRegSem === row.semester;
                                                    return (
                                                        <React.Fragment key={row.semester}>
                                                            <tr 
                                                                onClick={() => row.isRegistered && setExpandedRegSem(isExpanded ? null : row.semester)}
                                                                className={`transition-colors border-l-4 ${isExpanded ? 'border-emerald-500 bg-emerald-50/60' : 'border-transparent'} ${row.isRegistered ? 'hover:bg-emerald-50/40 cursor-pointer' : 'opacity-60 bg-gray-50'}`}
                                                            >
                                                                <td className={`px-3 py-2 text-[11px] font-bold border-r border-slate-50 flex items-center ${row.isRegistered ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {row.isRegistered && <ChevronRight className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                                                                    {row.semester}
                                                                </td>
                                                                <td className="px-2 py-2 text-[11px] border-r border-slate-50 text-center font-medium text-gray-700">{row.taken || '-'}</td>
                                                                <td className="px-2 py-2 text-[11px] border-r border-slate-50 text-center font-medium text-gray-700">{row.complete || '-'}</td>
                                                                <td className="px-2 py-2 text-[11px] border-r border-slate-50 text-center font-bold text-blue-600">{row.sgpa}</td>
                                                                <td className={`px-3 py-2 text-[11px] text-center font-bold ${row.dues > 0 ? 'text-red-600' : 'text-green-600'}`}>{row.dues > 0 ? row.dues : '0'}</td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={5} className="p-0 bg-white">
                                                                        <div className="p-2 border-b border-emerald-100 bg-slate-50/50 animate-in slide-in-from-top-1 duration-200">
                                                                            <table className="w-full text-left border-collapse bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                                                                <thead className="bg-slate-100">
                                                                                    <tr>
                                                                                        <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200">Code</th>
                                                                                        <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200">Title</th>
                                                                                        <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200 text-center">Sec</th>
                                                                                        <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200 text-center">GPA</th>
                                                                                        <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase border-r border-slate-200 text-center">Attend</th>
                                                                                        <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase text-center">Teacher</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100">
                                                                                    {DUMMY_COURSE_DETAILS.map((course, cIdx) => (
                                                                                        <tr key={cIdx} className="hover:bg-slate-50 transition-colors">
                                                                                            <td className="px-2 py-1 text-[10px] font-mono font-bold text-blue-600 border-r border-slate-100">{course.code}</td>
                                                                                            <td className="px-2 py-1 text-[10px] text-slate-700 border-r border-slate-100 truncate max-w-[120px]" title={course.title}>{course.title}</td>
                                                                                            <td className="px-2 py-1 text-[10px] text-center font-bold text-slate-600 border-r border-slate-100">{course.section}</td>
                                                                                            <td className="px-2 py-1 text-[10px] text-center font-black text-emerald-600 border-r border-slate-100">{course.gpa}</td>
                                                                                            <td className="px-2 py-1 text-[10px] text-center text-slate-500 border-r border-slate-100">{course.attend}</td>
                                                                                            <td className="px-2 py-1 text-[10px] text-center text-slate-400 font-mono">{course.teacher}</td>
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
                                                {registrationHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic text-[11px]">
                                                            No records found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr className="bg-slate-100 font-black border-t border-slate-300">
                                                        <td className="px-3 py-2 text-[10px] uppercase text-gray-600 text-right tracking-widest border-r border-slate-50">Total</td>
                                                        <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50">{historyTotals.taken}</td>
                                                        <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50">{historyTotals.complete}</td>
                                                        <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-bold text-blue-700">{historyTotals.sgpaAvg}</td>
                                                        <td className={`px-3 py-2 text-[11px] text-center ${historyTotals.dues > 0 ? 'text-red-700' : 'text-green-700'}`}>{historyTotals.dues}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {showMentorDetails && (
                                <div className="mt-4 pt-4 border-t border-slate-50 bg-white rounded shadow-lg border border-blue-100 overflow-hidden animate-in slide-in-from-top fade-in duration-500">
                                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center">
                                            <ShieldQuestion className="w-3.5 h-3.5 mr-1.5" /> Academic Mentor Details
                                        </h4>
                                        <button onClick={() => setShowMentorDetails(false)} className="text-blue-500 hover:text-blue-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-4 bg-white">
                                        {mentorFullInfo ? (
                                            <div className="flex items-start space-x-4">
                                                <div className="w-16 h-16 rounded border-2 border-slate-50 shadow-sm overflow-hidden bg-slate-50 shrink-0">
                                                    {getImageUrl(mentorFullInfo.Photo) ? (
                                                        <img src={getImageUrl(mentorFullInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <User className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{mentorFullInfo['Employee Name']}</h3>
                                                    <p className="text-[11px] font-medium text-blue-600 mt-1 leading-tight truncate">
                                                        {[mentorFullInfo['Academic Designation'], mentorFullInfo['Administrative Designation']].filter(Boolean).join(' / ')}
                                                    </p>
                                                    <div className="mt-3 space-y-1.5">
                                                        <div className="flex items-center text-slate-600">
                                                            <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                                                            <p className="text-[11px] font-mono font-bold truncate">{mentorFullInfo.Mobile || '-'}</p>
                                                        </div>
                                                        <div className="flex items-center text-slate-600">
                                                            <Mail className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                                                            <p className="text-[11px] font-medium truncate" title={mentorFullInfo['E-mail']}>{mentorFullInfo['E-mail'] || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded">
                                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No Mentor Assigned</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(isEditingCredits || isEditingDefense || isEditingDegree || isEditingDues) && (
                                <div className="mt-4 pt-4 border-t border-slate-50 bg-slate-50/50 rounded p-4 animate-in slide-in-from-top fade-in duration-500 ease-out shadow-lg border border-white">
                                    {isEditingCredits && (
                                        <div className="space-y-4">
                                            {!isCreditsInEditMode ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                                        <div className="bg-white p-2 rounded border border-blue-100 shadow-sm text-center">
                                                            <span className="block text-[8px] font-black text-blue-400 uppercase leading-none mb-1">Requirement</span>
                                                            <span className="text-xs font-bold text-blue-700">{studentEditData['Credit Requirement'] || '0'}</span>
                                                        </div>
                                                        <div className="bg-white p-2 rounded border border-emerald-100 shadow-sm text-center">
                                                            <span className="block text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">Complete</span>
                                                            <span className="text-xs font-bold text-emerald-700">{studentEditData['Credit Completed'] || '0'}</span>
                                                        </div>
                                                        <div className="bg-white p-2 rounded border border-amber-100 shadow-sm text-center">
                                                            <span className="block text-[8px] font-black text-amber-400 uppercase leading-none mb-1">Pending</span>
                                                            <span className="text-xs font-bold text-amber-700">
                                                                {Math.max(0, parseFloat(studentEditData['Credit Requirement'] || '0') - parseFloat(studentEditData['Credit Completed'] || '0'))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-3">
                                                        <button 
                                                            onClick={() => setIsCreditsInEditMode(true)}
                                                            className="p-2 text-blue-600 bg-white border border-blue-200 rounded shadow-sm hover:bg-blue-50 transition-colors"
                                                            title="Edit Credits"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-end space-x-3">
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Requirement</label>
                                                            <input 
                                                                type="number" 
                                                                value={studentEditData['Credit Requirement'] || ''} 
                                                                onChange={e => setStudentEditData(prev => ({ ...prev, 'Credit Requirement': e.target.value }))}
                                                                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none shadow-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Completed</label>
                                                            <input 
                                                                type="number" 
                                                                value={studentEditData['Credit Completed'] || ''} 
                                                                onChange={e => setStudentEditData(prev => ({ ...prev, 'Credit Completed': e.target.value }))}
                                                                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none shadow-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-1.5 pb-0.5">
                                                        <button onClick={() => { setIsCreditsInEditMode(false); setStudentEditData({ ...selectedStudent }); }} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded shadow-sm"><Undo2 className="w-4 h-4" /></button>
                                                        <button onClick={handleSaveStudentEdit} disabled={isSaving} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isEditingDefense && (
                                        <div className="space-y-4">
                                            {!isDefenseInEditMode ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                                            <div className="bg-white p-2 rounded border border-slate-100 shadow-sm text-center">
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Registration</span>
                                                                <span className="text-xs font-bold text-slate-700">{formatDisplayDate(studentEditData['Defense Registration'])}</span>
                                                            </div>
                                                            <div className="bg-white p-2 rounded border border-slate-100 shadow-sm text-center">
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Status</span>
                                                                <span className={`text-[10px] font-bold ${studentEditData['Defense Status']?.toLowerCase() === 'complete' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {formatStatus(studentEditData['Defense Status'])}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="ml-3 pt-1">
                                                            <button 
                                                                onClick={() => setIsDefenseInEditMode(true)}
                                                                className="p-2 text-blue-600 bg-white border border-blue-200 rounded shadow-sm hover:bg-blue-50 transition-colors"
                                                                title="Edit Defense Data"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-2.5 rounded border border-slate-100 shadow-sm flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded border border-slate-100 shadow-sm overflow-hidden bg-gray-50 shrink-0">
                                                            {supervisorFullInfo && getImageUrl(supervisorFullInfo.Photo) ? (
                                                                <img src={getImageUrl(supervisorFullInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-200"><User className="w-5 h-5" /></div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Supervisor</p>
                                                            <h4 className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                                                                {supervisorFullInfo?.['Employee Name'] || selectedStudent?.['Defense Supervisor'] || 'Not Assigned'}
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
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Reg Date</label>
                                                            <input 
                                                                type="date" 
                                                                value={studentEditData['Defense Registration'] || ''} 
                                                                onChange={e => setStudentEditData(prev => ({ ...prev, 'Defense Registration': e.target.value }))}
                                                                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none shadow-sm cursor-pointer"
                                                                title="Click to open calendar"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Status</label>
                                                            <div className="relative">
                                                                <select 
                                                                    value={formatStatus(studentEditData['Defense Status'])} 
                                                                    onChange={e => setStudentEditData(prev => ({ ...prev, 'Defense Status': e.target.value }))}
                                                                    className="w-full appearance-none px-3 py-2 text-xs font-bold border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none shadow-sm cursor-pointer pr-8 text-slate-700"
                                                                >
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Complete">Complete</option>
                                                                </select>
                                                                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Supervisor</label>
                                                        <SearchableSelect 
                                                            value={studentEditData['Defense Supervisor'] || ''} 
                                                            onChange={val => setStudentEditData(prev => ({ ...prev, 'Defense Supervisor': val }))} 
                                                            options={employeeOptions} 
                                                            placeholder="Search Supervisor"
                                                        />
                                                    </div>

                                                    <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100 shadow-inner flex items-center space-x-3 mt-1">
                                                        <div className="w-10 h-10 rounded border-2 border-white shadow-sm overflow-hidden bg-white shrink-0">
                                                            {supervisorFullInfo && getImageUrl(supervisorFullInfo.Photo) ? (
                                                                <img src={getImageUrl(supervisorFullInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-200"><User className="w-5 h-5" /></div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-[11px] font-bold text-blue-900 leading-tight truncate">
                                                                {supervisorFullInfo?.['Employee Name'] || 'Selecting Supervisor...'}
                                                            </h4>
                                                            {supervisorFullInfo && (
                                                                <p className="text-[9px] font-medium text-blue-600 truncate leading-none mt-0.5">
                                                                    {[supervisorFullInfo['Academic Designation'], supervisorFullInfo['Administrative Designation']].filter(Boolean).join(' / ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2">
                                                        <button 
                                                            onClick={() => { setIsDefenseInEditMode(false); setStudentEditData({ ...selectedStudent }); }} 
                                                            className="flex items-center justify-center py-2 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 transition-all"
                                                        >
                                                            <Undo2 className="w-3.5 h-3.5 mr-2" /> Cancel
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={handleSaveStudentEdit} 
                                                            disabled={isSaving || !isDefenseDirty} 
                                                            className={`flex items-center justify-center py-2 px-6 text-xs font-bold text-white rounded shadow-md transition-all active:scale-95 ${
                                                                isDefenseDirty 
                                                                ? 'bg-blue-600 hover:bg-blue-700' 
                                                                : 'bg-slate-300 cursor-not-allowed grayscale'
                                                            }`}
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                                            ) : (
                                                                <Save className="w-3.5 h-3.5 mr-2" />
                                                            )} 
                                                            Save Changes
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isEditingDegree && (
                                        <div className="flex items-end space-x-3">
                                            <div className="flex-1 space-y-1.5">
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Degree Status</label>
                                                <div className="flex bg-white rounded border border-slate-200 p-0.5 h-[34px]">
                                                    {['Complete', 'Pending'].map(status => (
                                                        <button key={status} onClick={() => setStudentEditData(prev => ({ ...prev, 'Degree Status': status }))} className={`flex-1 py-1 text-[10px] font-bold rounded transition-all ${studentEditData['Degree Status'] === status ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>{status}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex space-x-1.5 pb-0.5">
                                                <button onClick={() => { setIsEditingDegree(false); setStudentEditData({ ...selectedStudent }); }} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded shadow-sm"><Undo2 className="w-4 h-4" /></button>
                                                <button onClick={handleSaveStudentEdit} disabled={isSaving} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
                                            </div>
                                        </div>
                                    )}
                                    {isEditingDues && (
                                        <div className="flex items-end space-x-3">
                                            <div className="flex-1 space-y-1.5">
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Current Dues</label>
                                                <input 
                                                    type="number" 
                                                    value={studentEditData['Dues'] || ''} 
                                                    onChange={e => setStudentEditData(prev => ({ ...prev, 'Dues': e.target.value }))}
                                                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none shadow-sm"
                                                    placeholder="Enter amount"
                                                />
                                            </div>
                                            <div className="flex space-x-1.5 pb-0.5">
                                                <button onClick={() => { setIsEditingDues(false); setStudentEditData({ ...selectedStudent }); }} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded shadow-sm"><Undo2 className="w-4 h-4" /></button>
                                                <button onClick={handleSaveStudentEdit} disabled={isSaving} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar bg-slate-50/10">
                            {/* Large bottom sections removed as requested */}
                            <div className="h-10 shrink-0" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};