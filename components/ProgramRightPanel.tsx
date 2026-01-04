
import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, GraduationCap, Plus, Edit2, X, Eye, School, BookOpen } from 'lucide-react';
import { ProgramDataRow, DiuEmployeeRow, TeacherDataRow, FacultyLeadershipRow, StudentDataRow } from '../types';
import { normalizeId } from '../services/sheetService';
import { MultiSearchableSelect } from './EditEntryModal';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';
import { EmployeeDetailsPanel } from './EmployeeDetailsPanel';

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
    registrationLookup?: Map<string, Set<string>>;
    isModular?: boolean; // New prop to handle embedded view
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
        return { id: extractedId, emp, teacher: teacherMatch, raw: part, isMissing: !emp };
    });
};

const parseMetric = (str: string | undefined) => {
    if (!str) return { theory: '-', lab: '-' };
    const theoryMatch = str.match(/Theory\s+(\d+)/i);
    const labMatch = str.match(/Lab\s+(\d+)/i);
    return { theory: theoryMatch ? theoryMatch[1] : '-', lab: labMatch ? labMatch[1] : '-' };
};

export const ProgramRightPanel: React.FC<ProgramRightPanelProps> = ({ 
    program, facultyLeadership, diuEmployeeData, teacherData, employeeOptions, employeeFieldOptions, onSaveFacultyLeadership, onSaveProgramLeadership, onSaveProgramData, onSaveEmployee, forceEditTrigger = 0, registrationLookup, isModular = false
}) => {
    const [view, setView] = useState<PanelView>('details');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<DiuEmployeeRow | null>(null);

    useEffect(() => { setView('details'); setSelectedEmployeeForDetails(null); }, [program.PID]);

    useEffect(() => { if (forceEditTrigger > 0) handleEditProgram(); }, [forceEditTrigger]);

    const handleEditProgram = () => {
        const dur = parseMetric(program['Class Duration']);
        const req = parseMetric(program['Class Requirement']);
        const semDurStr = program['Semester Duration'] || '';
        setFormData({ ...program, 'Theory Duration': dur.theory !== '-' ? dur.theory : '90', 'Lab Duration': dur.lab !== '-' ? dur.lab : '120', 'Theory Requirement': req.theory !== '-' ? req.theory : '0', 'Lab Requirement': req.lab !== '-' ? req.lab : '0', 'Semester Duration Num': (semDurStr.match(/(\d+)/) || [])[1] || '4' });
        setView('edit-program');
    };

    const handleSave = async () => {
        const dataToSave = { ...formData }; setIsSaving(true);
        try {
            if (view === 'edit-faculty') await onSaveFacultyLeadership(dataToSave);
            else if (view === 'edit-program') await onSaveProgramData(dataToSave);
            else if (view === 'edit-program-leadership') await onSaveProgramLeadership(dataToSave);
        } catch (e) { console.error("Save error:", e); }
        finally { setIsSaving(false); setView('details'); }
    };

    const renderPersonnelSection = (title: string, idsStr: string | undefined) => {
        const list = resolveEmployees(idsStr, diuEmployeeData, teacherData);
        if (list.length === 0) return null;
        return (
            <div className="mb-2.5 last:mb-0">
                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center px-1"><User className="w-2.5 h-2.5 mr-1" />{title}</h5>
                <div className="space-y-1.5">
                    {list.map(({ id, emp, teacher, raw, isMissing }, idx) => {
                        const displayName = emp?.['Employee Name'] || teacher?.['Employee Name'] || (raw.includes('(') ? raw.split('(')[0].trim() : 'Unknown');
                        const displayDesig = emp ? [emp['Academic Designation'], emp['Administrative Designation']].filter(Boolean).join(', ') : (teacher?.Designation || 'Officer');
                        const photoUrl = getImageUrl(emp?.Photo || (teacher ? (teacher['Photo'] || teacher['Photo URL'] || teacher['Image']) : ''));
                        return (
                            <div key={idx} className={`flex items-center bg-white p-2 rounded border transition-all ${isMissing ? 'bg-red-50 border-red-100' : 'border-slate-100 hover:border-blue-200'}`}>
                                <div className="w-8 h-8 rounded-full shrink-0 mr-3 border overflow-hidden flex items-center justify-center bg-gray-50">{photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-4 h-4 text-slate-300" />}</div>
                                <div className="flex-1 min-w-0"><div className="text-[11px] font-bold leading-tight text-slate-800 truncate">{displayName}</div><div className="text-[9px] truncate leading-tight text-slate-500">{displayDesig}</div></div>
                                <button onClick={() => emp && setSelectedEmployeeForDetails(emp)} className="p-1.5 rounded-full hover:bg-gray-100 text-slate-400"><Eye className="w-3.5 h-3.5" /></button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (view !== 'details') {
        return (
            <div className={`${isModular ? 'w-full' : 'w-full lg:w-[380px] xl:w-[420px]'} flex flex-col bg-white border-l border-slate-100 shrink-0 overflow-hidden font-sans`}>
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0"><h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{view === 'edit-faculty' ? 'Faculty Leadership' : view === 'edit-program' ? 'Edit Program' : 'Program Leadership'}</h3><button onClick={() => setView('details')} className="p-1.5 hover:bg-white rounded-full text-slate-400"><X className="w-4 h-4" /></button></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar bg-slate-50/30">
                    {(view === 'edit-faculty' || view === 'edit-program-leadership') && (
                        <div className="bg-white p-3 rounded border border-slate-200 space-y-4">
                            {['Head', 'Associate Head', 'Administration', 'Dean', 'Associate Dean'].filter(col => { if (view === 'edit-faculty') return ['Dean', 'Associate Dean', 'Administration'].includes(col); return ['Head', 'Associate Head', 'Administration'].includes(col); }).map(col => (
                                <div key={col}><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{col}</label><MultiSearchableSelect value={formData[col] || ''} onChange={(v) => setFormData({...formData, [col]: v})} options={employeeOptions} placeholder={`Select ${col}`} /></div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex space-x-2 shrink-0 pb-8 md:pb-4"><button onClick={() => setView('details')} className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-gray-200 rounded">Cancel</button><button onClick={handleSave} disabled={isSaving} className="flex-1 px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded">{isSaving ? 'Saving...' : 'Save'}</button></div>
            </div>
        );
    }

    const classDuration = parseMetric(program['Class Duration']);
    const classRequirement = parseMetric(program['Class Requirement']);

    return (
        <div className={`${isModular ? 'w-full' : 'w-full lg:w-[320px] border-l border-slate-100'} flex flex-col bg-white overflow-hidden shrink-0 relative font-sans h-full`}>
            <div className="flex-1 overflow-y-auto thin-scrollbar pt-4 pb-3">
                <div className="text-center px-4 space-y-2 relative group">
                    <button onClick={handleEditProgram} className="absolute top-0 right-4 p-1.5 bg-blue-50 text-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Program Data"><Edit2 className="w-3.5 h-3.5" /></button>
                    
                    {/* Program Information Headers */}
                    <div className="flex flex-col items-center">
                        <h1 className={`text-sm font-black text-slate-900 leading-tight uppercase tracking-tight ${isModular ? 'text-center max-w-[280px]' : ''}`}>
                            {program['Program Full Name']}
                        </h1>
                        <h2 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">
                            {program['Faculty Full Name']}
                        </h2>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center justify-center space-x-1.5 mt-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase border border-slate-200 shadow-sm flex items-center">
                            <School className="w-2 h-2 mr-1" />
                            {program['Program Type']}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-black uppercase border border-indigo-100 shadow-sm flex items-center">
                            <BookOpen className="w-2 h-2 mr-1" />
                            {program['Semester Type']}
                        </span>
                    </div>

                    {/* Duration & Requirement Grid */}
                    <div className="bg-slate-50 border border-slate-100 rounded p-1.5 mt-2 shadow-inner">
                        <div className="grid grid-cols-2 gap-1.5 divide-x divide-slate-200">
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Duration</span>
                                <div className="flex items-center space-x-1 text-[9px] font-bold text-slate-800">
                                    <div><span className="text-slate-400 mr-0.5">T</span>{classDuration.theory}m</div>
                                    <div><span className="text-slate-400 mr-0.5">L</span>{classDuration.lab}m</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Req.</span>
                                <div className="flex items-center space-x-1 text-[9px] font-bold text-slate-800">
                                    <div><span className="text-slate-400 mr-0.5">T</span>{classRequirement.theory}m</div>
                                    <div><span className="text-slate-400 mr-0.5">L</span>{classRequirement.lab}m</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-2.5 space-y-2.5 mt-1">
                    <div className="bg-white rounded border border-slate-200 p-2.5 shadow-sm">
                        <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1 mb-2 flex items-center justify-between uppercase tracking-widest"><div className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1.5 text-blue-600" />Faculty</div><button onClick={() => setView('edit-faculty')} className="p-1 hover:bg-slate-100 rounded text-slate-400"><Plus className="w-2.5 h-2.5" /></button></h4>
                        {renderPersonnelSection('Dean', facultyLeadership?.Dean)}
                        {renderPersonnelSection('Associate Dean', facultyLeadership?.['Associate Dean'])}
                        {renderPersonnelSection('Administration', facultyLeadership?.Administration)}
                    </div>
                    <div className="bg-white rounded border border-slate-200 p-2.5 shadow-sm">
                        <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1 mb-2 flex items-center justify-between uppercase tracking-widest"><div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1.5 text-indigo-600" />Program</div><button onClick={() => setView('edit-program-leadership')} className="p-1 hover:bg-slate-100 rounded text-slate-400"><Plus className="w-2.5 h-2.5" /></button></h4>
                        {renderPersonnelSection('Head', program.Head)}
                        {renderPersonnelSection('Associate Head', program['Associate Head'])}
                        {renderPersonnelSection('Administration', program.Administration)}
                    </div>
                </div>
            </div>
            {selectedEmployeeForDetails && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                    <EmployeeDetailsPanel employee={selectedEmployeeForDetails} onClose={() => setSelectedEmployeeForDetails(null)} onUpdate={(d) => onSaveEmployee(d)} fieldOptions={employeeFieldOptions} isInline={true} />
                </div>
            )}
        </div>
    );
};
