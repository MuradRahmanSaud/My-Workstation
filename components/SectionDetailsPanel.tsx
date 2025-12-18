import React, { useMemo, useState, useEffect } from 'react';
import { CourseSectionData, ProgramDataRow, DiuEmployeeRow } from '../types';
import { X, User, BookOpen, Clock, Phone, Mail, Award, Briefcase, Image as ImageIcon, MapPin, MonitorSmartphone, Copy, Check, Pencil, Save, Loader2, Undo2 } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { EditEntryModal } from './EditEntryModal';

interface SectionDetailsPanelProps {
    section: CourseSectionData;
    programData?: ProgramDataRow[];
    employeeData?: DiuEmployeeRow[];
    onClose: () => void;
}

// Utility to get image URL
const getImageUrl = (link: string | undefined) => {
    if (!link) return '';
    const cleanLink = link.trim();
    if (cleanLink.includes('drive.google.com') || cleanLink.includes('docs.google.com')) {
        const idMatch = cleanLink.match(/\/d\/([^/]+)/) || cleanLink.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    return cleanLink;
};

// Helper for Image Border
const getImageBorderColor = (label: string) => {
    const lower = (label || '').toLowerCase();
    if (lower.includes('coord')) return 'border-green-500';
    return 'border-blue-500';
};

// Helper to copy data as HTML Table (Excel friendly)
const copyToClipboardWithTable = async (title: string, data: { label: string; value: string | number | undefined | null }[], colorHex: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; display: inline-block;">
            <table style="border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
                <thead>
                    <tr style="background-color: ${colorHex}; color: white;">
                        <th colspan="2" style="padding: 4px 6px; text-align: left; font-weight: bold; border: 1px solid ${colorHex};">${title}</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((d, i) => `
                        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                            <td style="padding: 2px 6px; font-weight: bold; color: #4b5563; border: 1px solid #e5e7eb; width: 100px;">${d.label}</td>
                            <td style="padding: 2px 6px; color: #1f2937; border: 1px solid #e5e7eb; min-width: 120px;">${d.value ?? '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const maxLabelLength = Math.max(...data.map(d => d.label.length));
    const text = `*${title}*\n${data.map(d => `${d.label}${' '.repeat(maxLabelLength - d.label.length)}: ${d.value ?? 'N/A'}`).join('\n')}`;

    try {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })
        ]);
    } catch (err) {
        console.error('Failed to copy html, falling back to text', err);
        navigator.clipboard.writeText(text);
    }
};

const GroupHeader: React.FC<{
    title: string;
    Icon: React.ElementType;
    themeClasses: { text: string; border: string; icon: string; };
    onCopy: () => Promise<void>;
}> = ({ title, Icon, themeClasses, onCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleClick = async () => { await onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-1.5 mb-2`}>
            <h4 className={`text-[11px] font-bold ${themeClasses.text} uppercase tracking-wider flex items-center`}>
                <Icon className={`w-3.5 h-3.5 mr-2 ${themeClasses.icon}`} />
                {title}
            </h4>
            <button onClick={handleClick} className={`p-1 rounded hover:bg-white/50 transition-all ${themeClasses.text} opacity-70 hover:opacity-100`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
};

const EmployeeCard: React.FC<{ 
    title: string;
    employee: DiuEmployeeRow | undefined; 
    fallbackName: string; 
    fallbackId: string; 
    roleLabel?: string;
    themeClasses?: { bg: string; border: string; icon: string; text: string; },
    tableHeaderColor: string;
    onEdit?: () => void;
}> = ({ title, employee, fallbackName, fallbackId, roleLabel, themeClasses, tableHeaderColor, onEdit }) => {
    const [copied, setCopied] = useState(false);
    const [fieldCopied, setFieldCopied] = useState<string | null>(null);

    const imageUrl = getImageUrl(employee?.Photo);
    const name = employee?.['Employee Name'] || fallbackName;
    const designation = employee ? [employee['Administrative Designation'], employee['Academic Designation']].filter(Boolean).join(', ') : (employee?.['Academic Designation'] || '');
    const id = employee?.['Employee ID'] || fallbackId;
    const email = employee?.['E-mail'] || '';
    const mobile = employee?.Mobile || '';
    const department = employee?.Department;

    const displayRole = roleLabel || (employee ? employee['Group Name'] : 'N/A');
    const theme = themeClasses || { bg: 'bg-white', border: 'border-gray-200', icon: 'text-gray-500', text: 'text-gray-500' };

    const handleCopyDetails = async () => {
        await copyToClipboardWithTable(`${title} Details`, [
            { label: 'Name', value: name },
            { label: 'Designation', value: designation },
            { label: 'Department', value: department },
            { label: 'Employee ID', value: id },
            { label: 'Mobile', value: mobile },
            { label: 'Email', value: email }
        ], tableHeaderColor);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyField = (text: string, fieldType: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setFieldCopied(fieldType);
            setTimeout(() => setFieldCopied(null), 1500);
        });
    };

    return (
        <div className={`${theme.bg} rounded-lg border ${theme.border} shadow-inner p-3 relative overflow-hidden transition-all hover:bg-opacity-100 bg-opacity-60`}>
            <div className={`flex items-center justify-between border-b ${theme.border} border-opacity-50 pb-1.5 mb-3`}>
                <h4 className={`text-[11px] font-bold ${theme.text} uppercase tracking-wider flex items-center`}>
                    <User className={`w-3.5 h-3.5 mr-2 ${theme.icon}`} />
                    {title}
                </h4>
                <div className="flex items-center space-x-1">
                    {onEdit && <button onClick={onEdit} className={`p-1 rounded hover:bg-white/50 transition-all ${theme.text} opacity-70 hover:opacity-100`}><Pencil className="w-3.5 h-3.5" /></button>}
                    <button onClick={handleCopyDetails} className={`p-1 rounded hover:bg-white/50 transition-all ${theme.text} opacity-70 hover:opacity-100`}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                </div>
            </div>

            {(!name && !id && id !== 'TBA') ? (
                <div className="py-2 px-3 bg-white/50 rounded border border-gray-200 border-dashed text-center">
                    <p className="text-xs text-gray-400 font-medium">Not Assigned / No Data</p>
                </div>
            ) : (
                <div>
                    <div className="flex flex-col items-center mb-3">
                        <div className={`w-16 h-16 rounded-full border-2 p-0.5 ${getImageBorderColor(displayRole)} overflow-hidden bg-white shadow-sm mb-2`}>
                            {imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" onError={(e) => (e.target as HTMLImageElement).classList.add('hidden')} />
                            ) : null}
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 leading-tight text-center mb-1">{name}</h3>
                        <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight px-2">{designation}</p>
                    </div>

                    <div className={`grid grid-cols-3 gap-y-3 gap-x-1 text-center border-t ${theme.border} border-opacity-50 pt-3`}>
                        <div className="px-1"><div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>Dept</div><div className="text-[10px] font-bold text-slate-700 truncate">{department || '-'}</div></div>
                        <div className={`px-1 border-l ${theme.border} border-opacity-50`}><div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>ID</div><div className="text-[10px] font-bold text-slate-700 truncate">{id || '-'}</div></div>
                        <div className={`px-1 border-l ${theme.border} border-opacity-50 cursor-pointer hover:bg-white/40 transition-colors rounded`} onClick={() => handleCopyField(mobile, 'mobile')}><div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>Mobile {fieldCopied === 'mobile' && <Check className="w-2.5 h-2.5 ml-1 text-green-600" />}</div><div className="text-[10px] font-bold text-slate-700 truncate">{mobile || '-'}</div></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const SectionDetailsPanel: React.FC<SectionDetailsPanelProps> = ({ section, programData = [], employeeData = [], onClose }) => {
    const { referenceData, updateReferenceData, updateSectionData, updateDiuEmployeeData } = useSheetData();
    const [isEditing, setIsEditing] = useState(false);
    const [editCourseType, setEditCourseType] = useState(section['Course Type'] || '');
    const [editCapacity, setEditCapacity] = useState(section.Capacity || '');
    const [editWeeklyClass, setEditWeeklyClass] = useState(section['Weekly Class'] || '');
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [employeeEditData, setEmployeeEditData] = useState<any>(null);

    useEffect(() => {
        setEditCourseType(section['Course Type'] || '');
        setEditCapacity(section.Capacity || '');
        setEditWeeklyClass(section['Weekly Class'] || '');
    }, [section]);

    const programInfo = useMemo(() => programData.find(p => normalizeId(p.PID) === normalizeId(section.PID)), [programData, section.PID]);

    const handleSave = async () => {
        if (!section.Ref) return;
        const payload = { Ref: section.Ref, 'Course Type': editCourseType, 'Section Capacity': editCapacity, 'Weekly Class': editWeeklyClass };
        updateReferenceData(prev => prev.map(r => r.Ref === section.Ref ? { ...r, ...payload } : r));
        updateSectionData(prev => prev.map(s => s.Ref === section.Ref ? { ...s, 'Course Type': editCourseType, Capacity: editCapacity, 'Weekly Class': editWeeklyClass } : s));
        setIsEditing(false);
        try { await submitSheetData('update', SHEET_NAMES.REFERENCE, payload, 'Ref', section.Ref.trim(), REF_SHEET_ID); } catch (e) {}
    };

    const adminEmployees = useMemo(() => {
        const admins: any[] = [];
        if (programInfo?.Administration) {
            programInfo.Administration.split(',').forEach(id => {
                const normId = normalizeId(id);
                const emp = employeeData.find(e => normalizeId(e['Employee ID']) === normId);
                admins.push({ rawId: id, emp, fallbackName: 'Unknown' });
            });
        }
        if (admins.length === 0) admins.push({ rawId: '', emp: undefined, fallbackName: programInfo?.Head || 'Unknown' });
        return admins;
    }, [programInfo, employeeData]);

    const teacherEmployee = useMemo(() => {
        const tid = section['Teacher ID'];
        if (!tid || tid === 'TBA') return undefined;
        return employeeData.find(e => normalizeId(e['Employee ID']) === normalizeId(tid));
    }, [section, employeeData]);

    const handleEditEmployee = (empData: any, role: string) => {
        setEmployeeEditData(empData);
        setIsEmployeeModalOpen(true);
    };

    // Fix: Added handleEmployeeModalSuccess to update employee data in context
    const handleEmployeeModalSuccess = (newData: any) => {
        if (!newData) return;
        updateDiuEmployeeData(prev => prev.map(emp => 
            normalizeId(emp['Employee ID']) === normalizeId(newData['Employee ID']) ? { ...emp, ...newData } : emp
        ));
    };

    const capacity = parseInt(section.Capacity || '0', 10);
    const students = parseInt(section.Student || '0', 10);
    const vacancy = isNaN(capacity) || isNaN(students) ? 0 : capacity - students;

    return (
        <div className="fixed inset-0 md:static z-[100] md:z-auto bg-black/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none flex items-end md:items-start justify-center md:flex-col w-full md:w-[350px] lg:w-[400px] shrink-0 animate-in fade-in md:animate-none">
            <div className="w-full h-[90vh] md:h-full bg-white md:bg-white rounded-t-2xl md:rounded-none md:rounded-l-lg shadow-2xl flex flex-col overflow-hidden font-sans border-l border-gray-200">
                {/* Header */}
                <div className="px-4 py-4 border-b border-gray-100 bg-white shrink-0 relative text-center shadow-sm">
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                        {isEditing ? (
                            <><button onClick={handleSave} className="p-1.5 bg-green-100 text-green-700 rounded-full"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-100 text-red-700 rounded-full"><Undo2 className="w-4 h-4" /></button></>
                        ) : (
                            <><button onClick={() => setIsEditing(true)} className="p-1.5 bg-blue-50 text-blue-600 rounded-full"><Pencil className="w-4 h-4" /></button>
                              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-4 h-4" /></button></>
                        )}
                    </div>
                    <div className="px-2">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">{programInfo ? programInfo['Program Short Name'] : section.PID}</div>
                        <h2 className="text-sm font-extrabold text-gray-800 leading-tight">{section['Course Title']}</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 thin-scrollbar">
                    {/* Section Info */}
                    <div className={`bg-indigo-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-indigo-100'} p-3 shadow-inner`}>
                        <GroupHeader title="Section Info" Icon={BookOpen} themeClasses={{ text: 'text-indigo-700', border: 'border-indigo-200/50', icon: 'text-indigo-500' }} onCopy={() => copyToClipboardWithTable('Section Information', [{ label: 'Course', value: section['Course Title'] }, { label: 'Code', value: section['Course Code'] }], '#4338ca')} />
                        <div className="grid grid-cols-3 gap-y-2 gap-x-1 text-center border-t border-indigo-200/30 pt-2">
                            <div><div className="text-[9px] font-bold text-indigo-400 uppercase">Code</div><div className="text-[11px] font-bold text-indigo-700">{section['Course Code']}</div></div>
                            <div className="border-l border-indigo-100"><div className="text-[9px] font-bold text-indigo-400 uppercase">Section</div><div className="text-[11px] font-bold text-slate-800">{section.Section}</div></div>
                            <div className="border-l border-indigo-100"><div className="text-[9px] font-bold text-indigo-400 uppercase">Credit</div><div className="text-[11px] font-bold text-slate-800">{section.Credit}</div></div>
                        </div>
                    </div>

                    {/* Enrollment */}
                    <div className={`bg-fuchsia-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-fuchsia-100'} p-3 shadow-inner`}>
                        <GroupHeader title="Enrollment" Icon={User} themeClasses={{ text: 'text-fuchsia-700', border: 'border-fuchsia-200/50', icon: 'text-fuchsia-500' }} onCopy={() => copyToClipboardWithTable('Enrollment', [{ label: 'Capacity', value: section.Capacity }], '#a21caf')} />
                        <div className="grid grid-cols-3 gap-1 text-center divide-x divide-fuchsia-200/30">
                            <div><div className="text-[9px] font-bold text-fuchsia-400 uppercase">Capacity</div>{isEditing ? <input value={editCapacity} onChange={e => setEditCapacity(e.target.value)} className="w-full text-xs text-center border rounded" /> : <div className="text-xs font-bold">{section.Capacity}</div>}</div>
                            <div><div className="text-[9px] font-bold text-fuchsia-400 uppercase">Student</div><div className="text-xs font-bold">{section.Student}</div></div>
                            <div><div className="text-[9px] font-bold text-fuchsia-400 uppercase">Vacancy</div><div className={`text-xs font-bold ${vacancy < 0 ? 'text-red-600' : 'text-green-600'}`}>{vacancy}</div></div>
                        </div>
                    </div>

                    {/* Teacher */}
                    <EmployeeCard 
                        title="Course Teacher" 
                        employee={teacherEmployee} 
                        fallbackName={section['Employee Name'] || ''} 
                        fallbackId={section['Teacher ID']} 
                        tableHeaderColor="#b45309" 
                        themeClasses={{ bg: 'bg-amber-50/40', border: 'border-amber-100', icon: 'text-amber-500', text: 'text-amber-700' }} 
                        onEdit={teacherEmployee ? () => handleEditEmployee(teacherEmployee, 'Teacher') : undefined}
                    />

                    {/* Admin */}
                    {adminEmployees.map((admin, idx) => (
                        <EmployeeCard 
                            key={idx} 
                            title="Coordination Officer" 
                            employee={admin.emp} 
                            fallbackName={admin.fallbackName} 
                            fallbackId={admin.rawId} 
                            tableHeaderColor="#0369a1" 
                            themeClasses={{ bg: 'bg-sky-50/40', border: 'border-sky-100', icon: 'text-sky-500', text: 'text-sky-700' }} 
                            onEdit={admin.emp ? () => handleEditEmployee(admin.emp, 'Admin') : undefined}
                        />
                    ))}
                </div>
            </div>
            
            <EditEntryModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} mode="edit" title="Edit Employee" sheetName={SHEET_NAMES.EMPLOYEE} columns={['Employee ID', 'Employee Name', 'Academic Designation', 'Administrative Designation', 'Department', 'Group Name', 'Status', 'Mobile', 'E-mail']} initialData={employeeEditData} keyColumn="Employee ID" spreadsheetId={REF_SHEET_ID} onSuccess={handleEmployeeModalSuccess} />
        </div>
    );
};