import React, { useState, useMemo, useEffect } from 'react';
/* Added Loader2 to imports from lucide-react */
import { Users, User, ShieldCheck, GraduationCap, Plus, Edit2, Save, Undo2, X, Eye, Phone, Mail, School, ClipboardList, BookCheck, UserRound, Pencil, Check, Smartphone, Info, ShieldQuestion, Award, Calendar, UsersRound, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
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
    onCloseStudent
}) => {
    const [view, setView] = useState<PanelView>('details');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<DiuEmployeeRow | null>(null);
    const [returnView, setReturnView] = useState<PanelView | null>(null);

    // Student Profile Edit States
    const [isEditingCredits, setIsEditingCredits] = useState(false);
    const [isEditingDefense, setIsEditingDefense] = useState(false);
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
            setIsEditingDefense(false);
        }
    }, [selectedStudent]);

    const classDuration = parseMetric(program['Class Duration']);
    const classRequirement = parseMetric(program['Class Requirement']);

    // Helper to find student's faculty
    const studentFaculty = useMemo(() => {
        if (!selectedStudent || !facultyLeadershipData) return '-';
        return program['Faculty Full Name'] || '-';
    }, [selectedStudent, program, facultyLeadershipData]);

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
        if (!selectedStudent?.['Defense Supervisor']) return null;
        const normId = normalizeId(selectedStudent['Defense Supervisor']);
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

    const handleSaveStudentEdit = async () => {
        if (!selectedStudent || !studentSemester || !onSaveStudent) return;
        setIsSaving(true);
        try {
            const payload = { ...studentEditData };
            // Extract ID from supervisor searchable select if needed
            if (payload['Defense Supervisor'] && typeof payload['Defense Supervisor'] === 'string' && payload['Defense Supervisor'].includes('(')) {
                const idMatch = payload['Defense Supervisor'].match(/\(([^)]+)\)$/);
                if (idMatch) {
                    payload['Defense Supervisor'] = idMatch[1].trim();
                }
            }
            await onSaveStudent(studentSemester, payload as StudentDataRow);
            setIsEditingCredits(false);
            setIsEditingDefense(false);
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
                            <div key={idx} className={`flex items-center group relative bg-white p-2 rounded-lg border transition-all duration-200 ${isMissing ? 'bg-red-50 border-red-200 hover:border-red-400' : 'border-slate-100 hover:border-blue-200 hover:shadow-sm'}`}>
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
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-4">
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
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mt-3">
                                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                                    <div className="flex flex-col items-center"><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Class Duration</span><div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800"><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Theory</span>{classDuration.theory}m</div><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Lab</span>{classDuration.lab}m</div></div></div>
                                    <div className="flex flex-col items-center"><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Requirement</span><div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800"><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Theory</span>{classRequirement.theory}m</div><div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Lab</span>{classRequirement.lab}m</div></div></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 space-y-3 bg-slate-50/20">
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
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
                                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-lg"><p className="text-[10px] font-bold text-slate-300 uppercase">No Records</p></div>
                                )}
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
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
                                    <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-lg"><p className="text-[10px] font-bold text-slate-300 uppercase">No Records</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Employee Details Overlay */}
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

            {/* Student Details Overlay */}
            {selectedStudent && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl overflow-hidden">
                    {/* Header - Compact */}
                    <div className="px-4 py-2 border-b border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest flex items-center">
                            <UserRound className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                            Student Profile
                        </h3>
                        <button onClick={onCloseStudent} className="p-1 hover:bg-white rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Identity Section - Sticky */}
                    <div className="bg-white border-b border-slate-100 p-4 shadow-sm shrink-0 z-10">
                        <div className="flex items-start space-x-4">
                            {/* Photo area */}
                            <div className="w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center bg-blue-50 ring-1 ring-blue-100 overflow-hidden shrink-0">
                                <User className="w-8 h-8 text-blue-200" />
                            </div>
                            
                            {/* Identity Info stack */}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight truncate" title={selectedStudent['Student Name']}>
                                    {selectedStudent['Student Name']}
                                </h2>
                                <p className="text-[10px] font-mono font-bold text-blue-600 mt-0.5">
                                    {selectedStudent['Student ID']}
                                </p>
                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-tight mt-1 truncate">
                                    {program['Program Full Name']}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-none mt-0.5 truncate">
                                    {studentFaculty}
                                </p>
                            </div>
                        </div>

                        {/* Metrics Row - Clickable Data Values */}
                        <div className="flex items-center space-x-6 mt-3 pt-3 border-t border-slate-50">
                            {/* Credit Progress Metric */}
                            <div className="flex flex-col">
                                <div className="flex items-center space-x-1.5 mb-1">
                                    <GraduationCap className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="text-[9px] uppercase text-slate-400 font-black tracking-tighter leading-none">Credit Progress</span>
                                </div>
                                <div 
                                    className="flex items-center cursor-pointer group/val"
                                    onClick={() => { setIsEditingCredits(!isEditingCredits); setIsEditingDefense(false); }}
                                >
                                    <span className="text-xs font-black text-slate-800 leading-none group-hover/val:text-blue-600 transition-colors">
                                        {selectedStudent['Credit Completed'] || '0'}<span className="text-[10px] text-slate-400 font-bold mx-1">/</span>{selectedStudent['Credit Requirement'] || '0'} <span className="text-[9px] text-slate-400 font-bold">Cr.</span>
                                    </span>
                                </div>
                            </div>
                            
                            {/* Defense Metric */}
                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center space-x-1.5 mb-1">
                                    <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span className="text-[9px] uppercase text-slate-400 font-black tracking-tighter leading-none">Def. Registration</span>
                                </div>
                                <div 
                                    className="flex items-center cursor-pointer group/val"
                                    onClick={() => { setIsEditingDefense(!isEditingDefense); setIsEditingCredits(false); }}
                                >
                                    <div className="flex items-center space-x-1.5 min-w-0 group-hover/val:text-blue-600 transition-colors">
                                        <span className="text-xs font-bold text-slate-800 leading-none truncate group-hover/val:text-blue-600 transition-colors">
                                            {formatDisplayDate(selectedStudent['Defense Registration'])}
                                        </span>
                                        {selectedStudent['Defense Status'] === 'Complete' ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" title="Complete" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" title="Pending" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Animated Collapsible Edit Areas - Buttons on the right, Slow Transition */}
                        {(isEditingCredits || isEditingDefense) && (
                            <div className="mt-3 pt-3 border-t border-blue-50 bg-blue-50/20 rounded-lg p-3 animate-in slide-in-from-top fade-in duration-700 ease-in-out">
                                {isEditingCredits && (
                                    <div className="flex items-end space-x-2">
                                        {/* Input Fields Group */}
                                        <div className="flex-1 flex items-center space-x-2">
                                            <div className="flex-1 space-y-1">
                                                <label className="block text-[8px] font-black text-blue-600 uppercase leading-none">Requirement</label>
                                                <input 
                                                    type="number" 
                                                    value={studentEditData['Credit Requirement'] || ''} 
                                                    onChange={e => setStudentEditData(prev => ({ ...prev, 'Credit Requirement': e.target.value }))}
                                                    className="w-full px-2 py-1.5 text-xs font-bold border border-blue-100 rounded focus:border-blue-500 outline-none shadow-sm h-8"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="block text-[8px] font-black text-blue-600 uppercase leading-none">Completed</label>
                                                <input 
                                                    type="number" 
                                                    value={studentEditData['Credit Completed'] || ''} 
                                                    onChange={e => setStudentEditData(prev => ({ ...prev, 'Credit Completed': e.target.value }))}
                                                    className="w-full px-2 py-1.5 text-xs font-bold border border-blue-100 rounded focus:border-blue-500 outline-none shadow-sm h-8"
                                                />
                                            </div>
                                        </div>
                                        {/* Actions Group - Right Aligned */}
                                        <div className="flex items-center space-x-1 shrink-0 h-8">
                                            <button 
                                                onClick={() => { setIsEditingCredits(false); setStudentEditData({ ...selectedStudent }); }} 
                                                className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                                                title="Cancel"
                                            >
                                                <Undo2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={handleSaveStudentEdit} 
                                                disabled={isSaving}
                                                className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                                title="Save"
                                            >
                                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {isEditingDefense && (
                                    <div className="flex items-end space-x-2">
                                        {/* Input Fields Group */}
                                        <div className="flex-1 flex items-center space-x-2">
                                            <div className="flex-1 space-y-1">
                                                <label className="block text-[8px] font-black text-purple-600 uppercase leading-none">Reg Date</label>
                                                <input 
                                                    type="date" 
                                                    value={studentEditData['Defense Registration'] || ''} 
                                                    onChange={e => setStudentEditData(prev => ({ ...prev, 'Defense Registration': e.target.value }))}
                                                    className="w-full px-2 py-1.5 text-xs font-bold border border-purple-100 rounded focus:border-purple-500 outline-none shadow-sm h-8"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="block text-[8px] font-black text-purple-600 uppercase leading-none">Status</label>
                                                <div className="flex bg-white rounded border border-purple-100 p-0.5 h-8">
                                                    {['Complete', 'Pending'].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => setStudentEditData(prev => ({ ...prev, 'Defense Status': status }))}
                                                            className={`flex-1 py-0.5 text-[8px] font-black rounded transition-all uppercase ${studentEditData['Defense Status'] === status ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Actions Group - Right Aligned */}
                                        <div className="flex items-center space-x-1 shrink-0 h-8">
                                            <button 
                                                onClick={() => { setIsEditingDefense(false); setStudentEditData({ ...selectedStudent }); }} 
                                                className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                                                title="Cancel"
                                            >
                                                <Undo2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={handleSaveStudentEdit} 
                                                disabled={isSaving}
                                                className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                                title="Save"
                                            >
                                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sticky Contact Row */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 space-x-2">
                             <div className="flex items-center text-blue-600 overflow-hidden max-w-[65%]">
                                 <Mail className="w-3.5 h-3.5 mr-2 shrink-0 text-blue-400" />
                                 <p className="text-[11px] font-bold truncate leading-none" title={selectedStudent.Email}>
                                     {selectedStudent.Email || '-'}
                                 </p>
                             </div>
                             <div className="flex items-center text-emerald-600 shrink-0">
                                 <Smartphone className="w-3.5 h-3.5 mr-2 shrink-0 text-emerald-400" />
                                 <p className="text-[11px] font-mono font-black leading-none">
                                     {selectedStudent.Mobile || '-'}
                                 </p>
                             </div>
                        </div>
                    </div>

                    {/* Content Section - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar bg-slate-50/10">
                        <div className="space-y-3">
                            {/* Group: Academic Overview - Keeping only Supervisor and Degree Status */}
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm relative overflow-hidden transition-all duration-300">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between border-b border-slate-50 pb-1.5">
                                    <div className="flex items-center">
                                        <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Academic Overview
                                    </div>
                                </h4>
                                
                                <div className="space-y-2.5">
                                    {/* Supervisor Section - Horizontal Left Aligned */}
                                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 relative group">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Defense Supervisor</p>
                                        </div>
                                        {supervisorFullInfo ? (
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 shrink-0">
                                                    {getImageUrl(supervisorFullInfo.Photo) ? (
                                                        <img src={getImageUrl(supervisorFullInfo.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <User className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-[11px] font-black text-slate-900 leading-tight truncate">{supervisorFullInfo['Employee Name']}</h3>
                                                    <p className="text-[9px] font-bold text-blue-600 mt-0.5 leading-tight truncate">
                                                        {[supervisorFullInfo['Academic Designation'], supervisorFullInfo['Administrative Designation']].filter(Boolean).join(' / ') || 'Supervisor'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] font-bold text-slate-400 italic py-1">
                                                {selectedStudent['Defense Supervisor'] || 'Not Assigned'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Degree Status Highlight */}
                                    <div className="mt-1 p-2 bg-yellow-50/50 rounded-lg border border-yellow-100 flex items-center">
                                        <Award className="w-3.5 h-3.5 text-yellow-600 mr-2 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-bold text-yellow-700 uppercase tracking-tighter leading-none mb-1">Degree Status</p>
                                            <p className="text-[10px] font-black text-slate-800 uppercase truncate">{selectedStudent['Degree Status'] || 'In Progress'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Group: Academic Mentor */}
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center border-b border-slate-50 pb-1.5">
                                    <ShieldQuestion className="w-3 h-3 mr-1.5 text-blue-600" /> Academic Mentor
                                </h4>

                                {mentorFullInfo ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-full border-2 border-slate-100 p-0.5 bg-slate-50 overflow-hidden shrink-0 shadow-sm">
                                                {getImageUrl(mentorFullInfo.Photo) ? (
                                                    <img src={getImageUrl(mentorFullInfo.Photo)} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[11px] font-black text-slate-900 leading-tight truncate">{mentorFullInfo['Employee Name']}</h3>
                                                <p className="text-[9px] font-bold text-blue-600 mt-0.5 leading-tight truncate">
                                                    {mentorFullInfo['Academic Designation'] || mentorFullInfo['Administrative Designation'] || 'Mentor'}
                                                </p>
                                                <p className="text-[8px] font-mono font-bold text-slate-400 mt-1 uppercase">
                                                    ({mentorFullInfo['Employee ID']})
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-2.5">
                                            <div className="flex items-center space-x-2">
                                                <Phone className="w-3 h-3 text-slate-300 shrink-0" />
                                                <p className="text-[10px] font-mono font-bold text-slate-700 truncate">{mentorFullInfo.Mobile || '-'}</p>
                                            </div>
                                            <div className="flex items-center space-x-2 border-l border-slate-100 pl-3 min-w-0">
                                                <Mail className="w-3 h-3 text-slate-300 shrink-0" />
                                                <p className="text-[10px] font-medium text-slate-700 truncate" title={mentorFullInfo['E-mail']}>
                                                    {mentorFullInfo['E-mail'] || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4 text-center border border-dashed border-slate-100 rounded-lg">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase">Not Assigned</p>
                                    </div>
                                )}
                            </div>

                            {/* Group: Guardian Contact - Moved to Bottom */}
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center border-b border-slate-50 pb-1.5">
                                    <UsersRound className="w-3 h-3 mr-1.5 text-emerald-600" /> Guardian Contact
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Father Name</p>
                                        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{selectedStudent['Father Name'] || '-'}</p>
                                    </div>
                                    <div className="border-l border-slate-100 pl-3 flex flex-col justify-center">
                                        <div className="flex items-center">
                                            <Phone className="w-3 h-3 text-slate-300 mr-2 shrink-0" />
                                            <p className="text-[11px] font-mono font-bold text-emerald-600 leading-tight">{selectedStudent['Father Mobile'] || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-2">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Mother Name</p>
                                        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{selectedStudent['Mother Name'] || '-'}</p>
                                    </div>
                                    <div className="border-l border-slate-100 pl-3 flex flex-col justify-center">
                                        <div className="flex items-center">
                                            <Phone className="w-3 h-3 text-slate-300 mr-2 shrink-0" />
                                            <p className="text-[11px] font-mono font-bold text-emerald-600 leading-tight">{selectedStudent['Mother Mobile'] || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-8 shrink-0" />
                    </div>
                </div>
            )}
        </div>
    );
};