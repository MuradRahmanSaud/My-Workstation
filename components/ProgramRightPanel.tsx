
import React, { useState, useMemo, useEffect } from 'react';
import { Users, User, ShieldCheck, GraduationCap, Plus, Edit2, AlertCircle, Save, Undo2, X, ChevronDown, Check, Facebook, Linkedin, Image as ImageIcon, Eye, UserPlus } from 'lucide-react';
import { ProgramDataRow, DiuEmployeeRow, TeacherDataRow, FacultyLeadershipRow } from '../types';
import { normalizeId } from '../services/sheetService';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { EmployeeDetailsPanel } from './EmployeeDetailsPanel';

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
    diuEmployeeData: DiuEmployeeRow[];
    teacherData: TeacherDataRow[];
    employeeOptions: string[];
    employeeFieldOptions: any;
    onSaveFacultyLeadership: (data: any) => Promise<void>;
    onSaveProgramLeadership: (data: any) => Promise<void>;
    onSaveEmployee: (data: any) => Promise<void>;
}

type PanelView = 'details' | 'edit-faculty' | 'edit-program' | 'edit-employee';

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
    diuEmployeeData, 
    teacherData,
    employeeOptions,
    employeeFieldOptions,
    onSaveFacultyLeadership,
    onSaveProgramLeadership,
    onSaveEmployee
}) => {
    const [view, setView] = useState<PanelView>('details');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<DiuEmployeeRow | null>(null);

    // Keep track of the view we came from when registering a new employee
    const [returnView, setReturnView] = useState<PanelView | null>(null);

    useEffect(() => {
        setView('details');
        setSelectedEmployeeForDetails(null);
    }, [program.PID]);

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
            'Head': formatIdsForForm(program.Head),
            'Associate Head': formatIdsForForm(program['Associate Head']),
            'Administration': formatIdsForForm(program.Administration)
        });
        setView('edit-program');
    };

    const handleEditEmployee = (idOrName: string, initial?: any) => {
        // Store current view to come back after registration
        if (view !== 'edit-employee') {
            setReturnView(view);
        }

        const existing = diuEmployeeData.find(e => normalizeId(e['Employee ID']) === normalizeId(idOrName));
        if (existing) {
            setFormData(existing);
        } else {
            // Check if input looks like ID (regex for DIU common IDs like 71000 or 123-12-123)
            const isLikelyId = /^\d{3}-\d{2}-\d{3,5}$/.test(idOrName) || /^\d{5,8}$/.test(idOrName);
            
            const name = isLikelyId ? (findInRow(initial, ['Employee Name', 'Name', 'Teacher Name']) || '') : idOrName;
            const id = isLikelyId ? idOrName : '';

            setFormData({
                'Employee ID': id,
                'Employee Name': name,
                'Academic Designation': findInRow(initial, ['Designation', 'Academic Designation']) || '',
                'Administrative Designation': '',
                'Department': findInRow(initial, ['Department', 'Dept']) || '',
                'Group Name': 'Teacher',
                'Status': 'Active',
                'Mobile': findInRow(initial, ['Mobile', 'Mobile Number', 'Mobile No', 'Phone', 'Cell']) || '',
                'E-mail': findInRow(initial, ['Email', 'E-mail', 'Email Address']) || '',
                'IP-Ext': '',
                'Photo': findInRow(initial, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']) || '',
                'Facebook': findInRow(initial, ['Facebook']),
                'Linkedin': findInRow(initial, ['Linkedin'])
            });
        }
        setView('edit-employee');
    };

    const handleSave = () => {
        const currentView = view;
        const dataToSave = { ...formData };
        setIsSaving(true);
        
        // Handle background task asynchronously to allow UI to close immediately
        (async () => {
            try {
                if (currentView === 'edit-faculty') {
                    await onSaveFacultyLeadership(dataToSave);
                } else if (currentView === 'edit-program') {
                    await onSaveProgramLeadership(dataToSave);
                } else if (currentView === 'edit-employee') {
                    await onSaveEmployee(dataToSave);
                }
            } catch (error) {
                console.error("Save error:", error);
            } finally {
                setIsSaving(false);
            }
        })();

        // CLOSING LOGIC: Immediately transition the view to satisfy "sathe sathe close"
        if (currentView === 'edit-employee' && returnView) {
            // If we came from a leadership edit screen, go back there
            setView(returnView);
            setReturnView(null);
        } else {
            // Otherwise, go to the program details view
            setView('details');
            setReturnView(null);
        }
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
                                    <button onClick={() => handleEditEmployee(displayId, emp || teacher || { 'Employee ID': displayId, 'Employee Name': displayName })} className={`p-1.5 rounded-full transition-all ${isMissing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`} title="Edit Employee Information"><Edit2 className="w-3 h-3" /></button>
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
            <div className="w-full lg:w-[320px] xl:w-[340px] flex flex-col bg-white border-l border-slate-100 shrink-0 overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {view === 'edit-faculty' ? 'Faculty Leadership' : view === 'edit-program' ? 'Program Leadership' : 'Employee Registration'}
                        </h3>
                        {view === 'edit-employee' && <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Fill groups to register</p>}
                    </div>
                    <button onClick={() => { if (view === 'edit-employee' && returnView) { setView(returnView); setReturnView(null); } else setView('details'); }} className="p-1.5 hover:bg-white rounded-full text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-4 thin-scrollbar bg-slate-50/30">
                    
                    {/* Common Register Button for quick access when editing leadership */}
                    {(view === 'edit-faculty' || view === 'edit-program') && (
                        <button 
                            onClick={() => handleEditEmployee('', {})}
                            className="w-full flex items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all bg-white/50"
                        >
                            <UserPlus className="w-3 h-3 mr-2" />
                            Register New Employee
                        </button>
                    )}

                    {view === 'edit-faculty' && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            {['Dean', 'Associate Dean', 'Administration'].map(col => (
                                <div key={col}>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{col}</label>
                                    <MultiSearchableSelect 
                                        value={formData[col] || ''} 
                                        onChange={(v) => setFormData({...formData, [col]: v})} 
                                        options={employeeOptions} 
                                        placeholder={`Select ${col}`} 
                                        onAddNew={(searchVal) => handleEditEmployee(searchVal, {})}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    {view === 'edit-program' && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            {['Head', 'Associate Head', 'Administration'].map(col => (
                                <div key={col}>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{col}</label>
                                    <MultiSearchableSelect 
                                        value={formData[col] || ''} 
                                        onChange={(v) => setFormData({...formData, [col]: v})} 
                                        options={employeeOptions} 
                                        placeholder={`Select ${col}`} 
                                        onAddNew={(searchVal) => handleEditEmployee(searchVal, {})}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    {view === 'edit-employee' && (
                        <div className="space-y-3 pb-2">
                            {/* Basic Info */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Basic Information</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Name</label>
                                    <input type="text" value={formData['Employee Name'] || ''} onChange={e => setFormData({...formData, 'Employee Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Dept</label>
                                        <SearchableSelect value={formData['Department'] || ''} onChange={v => setFormData({...formData, 'Department': v})} options={employeeFieldOptions['Department']} />
                                    </div>
                                    <div className="w-[40%]">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Status</label>
                                        <SearchableSelect value={formData['Status'] || 'Active'} onChange={v => setFormData({...formData, 'Status': v})} options={employeeFieldOptions['Status']} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Group</label>
                                    <MultiSearchableSelect value={formData['Group Name'] || ''} onChange={v => setFormData({...formData, 'Group Name': v})} options={employeeFieldOptions['Group Name']} />
                                </div>
                            </div>

                            {/* Designation */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Designation</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Administrative</label>
                                        <SearchableSelect value={formData['Administrative Designation'] || ''} onChange={v => setFormData({...formData, 'Administrative Designation': v})} options={employeeFieldOptions['Administrative Designation']} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Academic</label>
                                        <SearchableSelect value={formData['Academic Designation'] || ''} onChange={v => setFormData({...formData, 'Academic Designation': v})} options={employeeFieldOptions['Academic Designation']} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Contact</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Email</label>
                                    <input type="text" value={formData['E-mail'] || ''} onChange={e => setFormData({...formData, 'E-mail': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Mobile</label>
                                        <input type="text" value={formData['Mobile'] || ''} onChange={e => setFormData({...formData, 'Mobile': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">IP / Ext</label>
                                        <input type="text" value={formData['IP-Ext'] || ''} onChange={e => setFormData({...formData, 'IP-Ext': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Social & Media */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Social & Media</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Photo URL (Drive/Direct)</label>
                                    <div className="relative">
                                        <input type="text" value={formData['Photo'] || ''} onChange={e => setFormData({...formData, 'Photo': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none pr-8" placeholder="https://..." />
                                        <ImageIcon className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Facebook</label>
                                        <div className="relative">
                                            <input type="text" value={formData['Facebook'] || ''} onChange={e => setFormData({...formData, 'Facebook': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none pr-8" placeholder="facebook.com/..." />
                                            <Facebook className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">LinkedIn</label>
                                        <div className="relative">
                                            <input type="text" value={formData['Linkedin'] || ''} onChange={e => setFormData({...formData, 'Linkedin': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none pr-8" placeholder="linkedin.com/in/..." />
                                            <Linkedin className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-blue-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex space-x-2 shrink-0 pb-8 md:pb-4">
                    <button onClick={() => { if (view === 'edit-employee' && returnView) { setView(returnView); setReturnView(null); } else setView('details'); }} disabled={isSaving} className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50"><Undo2 className="w-3.5 h-3.5 mr-1.5" />Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm active:scale-95 disabled:opacity-50">{isSaving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />Saving...</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}</button>
                </div>
            </div>
        );
    }

    const hasFacultyLeadership = !!facultyLeadership && (facultyLeadership.Dean || facultyLeadership['Associate Dean'] || facultyLeadership.Administration);
    const hasProgramLeadership = !!(program.Head || program['Associate Head'] || program.Administration);

    return (
        <div className="w-full lg:w-[320px] xl:w-[340px] flex flex-col bg-white overflow-hidden border-l border-slate-100 shrink-0 relative">
            <div className="flex-1 overflow-y-auto thin-scrollbar">
                <div className="pt-5 pb-3 bg-white">
                    <div className="text-center px-4 space-y-1.5">
                        <h1 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">{program['Program Full Name'] || 'Program Full Name'}</h1>
                        <h2 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{program['Faculty Full Name'] || 'Faculty Full Name'}</h2>
                        <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter pt-0.5">
                            <span>{program['Semester Type'] || '-'}</span>
                            <span className="text-slate-200">|</span>
                            <span>{program['Program Type'] || '-'}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mt-3">
                            <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Class Duration</span>
                                    <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800">
                                        <div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Theory</span>{classDuration.theory}m</div>
                                        <div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Lab</span>{classDuration.lab}m</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Requirement</span>
                                    <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800">
                                        <div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Theory</span>{classRequirement.theory}m</div>
                                        <div className="flex items-center"><span className="text-slate-400 font-medium mr-1 text-[9px]">Lab</span>{classRequirement.lab}m</div>
                                    </div>
                                </div>
                            </div>
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
                            <button onClick={handleEditProgram} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-blue-600" title="Edit Program Leadership"><Plus className="w-3 h-3" /></button>
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

            {/* Overlaid Employee Details Panel */}
            {selectedEmployeeForDetails && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                    <EmployeeDetailsPanel 
                        employee={selectedEmployeeForDetails} 
                        onClose={() => setSelectedEmployeeForDetails(null)} 
                        onUpdate={(updatedData) => {
                            onSaveEmployee(updatedData);
                        }} 
                        fieldOptions={employeeFieldOptions} 
                        isInline={true} // Ensure it stays within this specific absolute container
                    />
                </div>
            )}
        </div>
    );
};
