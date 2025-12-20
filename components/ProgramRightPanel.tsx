import React, { useState, useMemo, useEffect } from 'react';
import { Users, User, ShieldCheck, GraduationCap, Plus, Edit2, AlertCircle, Save, Undo2, X, ChevronDown, Check, Facebook, Linkedin, Image as ImageIcon, Eye, UserPlus, Info, ExternalLink, Contact, Hash, MapPin, Mail, Phone, Briefcase } from 'lucide-react';
import { ProgramDataRow, DiuEmployeeRow, TeacherDataRow, FacultyLeadershipRow, StudentDataRow } from '../types';
import { normalizeId } from '../services/sheetService';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { EmployeeDetailsPanel } from './EmployeeDetailsPanel';
import { EmployeeAddEditModal } from './EmployeeAddEditModal';

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
    forceEditTrigger?: number;
    selectedStudent?: StudentDataRow | null;
    onClearStudent?: () => void;
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
    forceEditTrigger = 0,
    selectedStudent,
    onClearStudent
}) => {
    const [view, setView] = useState<PanelView>('details');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<DiuEmployeeRow | null>(null);
    const [returnView, setReturnView] = useState<PanelView | null>(null);

    // Registration Flow State
    const [isEmployeeRegModalOpen, setIsEmployeeRegModalOpen] = useState(false);
    const [pendingRegField, setPendingRegField] = useState<string | null>(null);
    const [initialRegData, setInitialRegData] = useState<any>(null);

    useEffect(() => {
        setView('details');
        setSelectedEmployeeForDetails(null);
    }, [program.PID]);

    useEffect(() => {
        if (forceEditTrigger > 0) {
            handleEditProgram();
        }
    }, [forceEditTrigger]);

    const classDuration = parseMetric(program['Class Duration']);
    const classRequirement = parseMetric(program['Class Requirement']);

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
            const teach = teacherData.find(t => normalizeId(t['Employee ID']) === normId);
            if (teach) return `${teach['Employee Name']} - ${teach.Designation} (${teach['Employee ID']})`;
            return trimmedId;
        }).join(', ');
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

    const handleOpenRegistration = (fieldName: string, searchValue: string) => {
        setPendingRegField(fieldName);
        setInitialRegData({ 'Employee Name': searchValue });
        setIsEmployeeRegModalOpen(true);
    };

    const handleRegistrationSuccess = (newEmp: DiuEmployeeRow) => {
        const desig = [newEmp['Academic Designation'], newEmp['Administrative Designation']].filter(Boolean).join('/');
        const selectionStr = `${newEmp['Employee Name']} - ${desig} (${newEmp['Employee ID']})`;
        if (pendingRegField) {
            const currentVal = formData[pendingRegField] || '';
            const updatedVal = currentVal ? `${currentVal}, ${selectionStr}` : selectionStr;
            setFormData(prev => ({ ...prev, [pendingRegField]: updatedVal }));
        }
        onSaveEmployee(newEmp, false);
        setIsEmployeeRegModalOpen(false);
        setPendingRegField(null);
        setInitialRegData(null);
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

    useEffect(() => {
        if (view === 'edit-program') {
            const short = formData['Faculty Short Name'];
            const found = facultyLeadershipData.find(f => f['Faculty Short Name'] === short);
            if (found && formData['Faculty Full Name'] !== found['Faculty Full Name']) {
                setFormData(prev => ({ ...prev, 'Faculty Full Name': found['Faculty Full Name'] }));
            }
        }
    }, [formData['Faculty Short Name'], view, facultyLeadershipData]);

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
                        const displayId = emp?.['Employee ID'] || teacher?.['Employee ID'] || id;
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
                                        {emp?.['IP-Ext'] && <><span className="text-gray-300 text-[9px]">|</span><div className="text-[9px] font-bold text-blue-600">Ext: {emp['IP-Ext']}</div></>}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { if (emp) setSelectedEmployeeForDetails(emp); else { const tempEmp: any = { 'Employee ID': displayId, 'Employee Name': displayName, 'Academic Designation': teacher?.Designation || '', 'Administrative Designation': '', 'Department': teacher?.Department || '', 'Mobile': teacher?.['Mobile Number'] || '', 'E-mail': teacher?.Email || '', 'Photo': rawPhoto || '', 'Status': 'Unregistered' }; setSelectedEmployeeForDetails(tempEmp as DiuEmployeeRow); } }} className={`p-1.5 rounded-full transition-all ${isMissing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="View Details"><Eye className="w-3 h-3" /></button>
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
            <div className="w-full lg:w-[320px] xl:w-[350px] flex flex-col bg-white border-l border-slate-100 shrink-0 overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {view === 'edit-faculty' ? 'Faculty Leadership' : view === 'edit-program' ? 'Edit Program' : view === 'edit-program-leadership' ? 'Program Leadership' : 'Employee Registration'}
                        </h3>
                    </div>
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
                                    <MultiSearchableSelect value={formData[col] || ''} onChange={(v) => setFormData({...formData, [col]: v})} options={employeeOptions} placeholder={`Select ${col}`} onAddNew={(searchVal) => handleOpenRegistration(col, searchVal)} />
                                </div>
                            ))}
                        </div>
                    )}
                    {view === 'edit-program' && (
                        <div className="space-y-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1.5">Faculty Association</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Faculty (Short)</label>
                                        <select value={formData['Faculty Short Name'] || ''} onChange={(e) => setFormData({...formData, 'Faculty Short Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none bg-white">
                                            {facultyLeadershipData.map(f => (<option key={f['Faculty Short Name']} value={f['Faculty Short Name']}>{f['Faculty Short Name']}</option>))}
                                        </select>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Faculty (Full)</label>
                                        <input type="text" value={formData['Faculty Full Name'] || ''} onChange={(e) => setFormData({...formData, 'Faculty Full Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" title="Editing this will update Faculty database" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1.5">Program Details</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Short Name</label>
                                        <input type="text" value={formData['Program Short Name'] || ''} onChange={e => setFormData({...formData, 'Program Short Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Full Name</label>
                                        <input type="text" value={formData['Program Full Name'] || ''} onChange={e => setFormData({...formData, 'Program Full Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Department Name</label>
                                    <input type="text" value={formData['Department Name'] || ''} onChange={e => setFormData({...formData, 'Department Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Program Type</label>
                                        <SearchableSelect value={formData['Program Type'] || ''} onChange={v => setFormData({...formData, 'Program Type': v})} options={['Graduate', 'Undergraduate']} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Semester Type</label>
                                        <SearchableSelect value={formData['Semester Type'] || ''} onChange={v => setFormData({...formData, 'Semester Type': v})} options={['Bi-Semester', 'Tri-Semester']} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1.5">Class Duration Configuration</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Semester</label>
                                        <div className="relative"><input type="number" value={formData['Semester Duration Num'] || ''} onChange={e => setFormData({...formData, 'Semester Duration Num': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 pr-12 focus:border-blue-500 outline-none" /><span className="absolute right-2 top-2.5 text-[8px] font-bold text-slate-400 uppercase">Months</span></div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Theory</label>
                                        <div className="relative"><input type="number" value={formData['Theory Duration'] || ''} onChange={e => setFormData({...formData, 'Theory Duration': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 pr-8 focus:border-blue-500 outline-none" /><span className="absolute right-2 top-2.5 text-[8px] font-bold text-slate-400 uppercase">Min</span></div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Lab</label>
                                        <div className="relative"><input type="number" value={formData['Lab Duration'] || ''} onChange={e => setFormData({...formData, 'Lab Duration': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 pr-8 focus:border-blue-500 outline-none" /><span className="absolute right-2 top-2.5 text-[8px] font-bold text-slate-400 uppercase">Min</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex space-x-2 shrink-0 pb-8 md:pb-4">
                    <button onClick={() => { setView('details'); }} disabled={isSaving} className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50"><Undo2 className="w-3.5 h-3.5 mr-1.5" />Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm active:scale-95 disabled:opacity-50">{isSaving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />Saving...</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}</button>
                </div>
                <EmployeeAddEditModal isOpen={isEmployeeRegModalOpen} onClose={() => { setIsEmployeeRegModalOpen(false); setPendingRegField(null); }} mode="add" initialData={initialRegData} fieldOptions={employeeFieldOptions} onSuccess={handleRegistrationSuccess} />
            </div>
        );
    }

    const hasFacultyLeadership = !!facultyLeadership && (facultyLeadership.Dean || facultyLeadership['Associate Dean'] || facultyLeadership.Administration);
    const hasProgramLeadership = !!(program.Head || program['Associate Head'] || program.Administration);

    return (
        <div className="w-full lg:w-[320px] xl:w-[350px] flex flex-col bg-white overflow-hidden border-l border-slate-100 shrink-0 relative">
            <div className="flex-1 overflow-y-auto thin-scrollbar">
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
                </div>
                <div className="p-3 space-y-3 bg-slate-50/20">
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5 flex items-center justify-between uppercase tracking-widest"><div className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1.5 text-blue-600" />Faculty Leadership</div><button onClick={handleEditFaculty} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-blue-600" title="Edit Faculty Leadership"><Plus className="w-3 h-3" /></button></h4>
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
                        <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5 flex items-center justify-between uppercase tracking-widest"><div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1.5 text-indigo-600" />Program Leadership</div><button onClick={() => { setFormData({...program}); setView('edit-program-leadership'); }} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-blue-600" title="Edit Program Leadership"><Plus className="w-3 h-3" /></button></h4>
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

            {selectedEmployeeForDetails && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                    <EmployeeDetailsPanel employee={selectedEmployeeForDetails} onClose={() => setSelectedEmployeeForDetails(null)} onUpdate={(updatedData) => { onSaveEmployee(updatedData); setSelectedEmployeeForDetails(updatedData); }} fieldOptions={employeeFieldOptions} isInline={true} />
                </div>
            )}

            {selectedStudent && (
                <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                    <div className="flex-1 flex flex-col overflow-hidden font-sans">
                        <div className="px-5 py-4 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
                            <h3 className="text-base md:text-sm font-bold text-gray-800 uppercase tracking-wide">Student Profile</h3>
                            <button onClick={onClearStudent} className="p-2 md:p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X className="w-6 h-6 md:w-5 md:h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 thin-scrollbar">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white mb-3 relative flex items-center justify-center shrink-0 ring-1 ring-gray-100">
                                    <User className="w-12 h-12 text-slate-300" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{selectedStudent['Student Name']}</h2>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-tighter">PID: {selectedStudent.PID}</p>
                                <div className="mt-3 flex justify-center"><div className="inline-flex px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wider">Unregistered</div></div>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                                    <div className="flex items-start"><Hash className="w-4 h-4 text-gray-400 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Student ID</p><p className="text-sm font-mono font-bold text-gray-800 leading-tight mt-0.5">{selectedStudent['Student ID']}</p></div></div>
                                    <div className="flex items-start"><User className="w-4 h-4 text-gray-400 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Gender</p><p className="text-sm font-medium text-gray-800 leading-tight mt-0.5">{selectedStudent.Sex || '-'}</p></div></div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <h4 className="text-xs font-bold text-gray-900 mb-3 pb-1.5 border-b border-gray-100">Contact Information</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-start"><Phone className="w-4 h-4 text-blue-500 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Mobile</p><p className="text-sm font-medium text-gray-800 mt-0.5 font-mono">{selectedStudent.Mobile || '-'}</p></div></div>
                                        <div className="flex items-start"><Mail className="w-4 h-4 text-orange-500 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Email</p><p className="text-sm font-medium text-gray-800 break-all mt-0.5">{selectedStudent.Email || '-'}</p></div></div>
                                    </div>
                                </div>
                                <div className="bg-blue-600 rounded-xl shadow-lg p-4 text-white flex items-center justify-between group cursor-default">
                                    <div><p className="text-[10px] opacity-70 uppercase font-bold tracking-wide">Academic Program</p><p className="text-sm font-bold leading-tight mt-1">{program['Program Short Name']}</p></div>
                                    <div className="p-2 bg-white/20 rounded-lg"><GraduationCap className="w-5 h-5 text-white" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
