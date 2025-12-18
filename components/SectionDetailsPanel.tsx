
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
    
    // Only attempt to extract Google Drive ID if the link looks like a Google domain
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
    const lines = data.map(d => {
        const padding = ' '.repeat(maxLabelLength - d.label.length);
        const val = (d.value === undefined || d.value === null || String(d.value).trim() === '') ? 'N/A' : d.value;
        return `${d.label} ${padding}: ${val}`;
    });
    const text = `*${title}*\n${lines.join('\n')}`;

    try {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText
            })
        ]);
    } catch (err) {
        console.error('Failed to copy html, falling back to text', err);
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }
};

// Reusable Header Component with Copy Functionality
const GroupHeader: React.FC<{
    title: string;
    Icon: React.ElementType;
    themeClasses: {
        text: string;
        border: string;
        icon: string;
    };
    onCopy: () => Promise<void>;
}> = ({ title, Icon, themeClasses, onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleClick = async () => {
        await onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-1.5 mb-2`}>
            <h4 className={`text-xs font-bold ${themeClasses.text} uppercase tracking-wider flex items-center`}>
                <Icon className={`w-3.5 h-3.5 mr-2 ${themeClasses.icon}`} />
                {title}
            </h4>
            <button 
                onClick={handleClick}
                className={`p-1 rounded hover:bg-white/50 transition-all ${themeClasses.text} opacity-70 hover:opacity-100`}
                title={`Copy ${title} as Table`}
            >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
};

// Employee Card Component
const EmployeeCard: React.FC<{ 
    title: string;
    employee: DiuEmployeeRow | undefined; 
    fallbackName: string; 
    fallbackId: string; 
    roleLabel?: string;
    themeClasses?: {
        bg: string;
        border: string;
        icon: string;
        text: string;
    },
    tableHeaderColor: string;
    onEdit?: () => void;
}> = ({ title, employee, fallbackName, fallbackId, roleLabel, themeClasses, tableHeaderColor, onEdit }) => {
    const [copied, setCopied] = useState(false);
    const [fieldCopied, setFieldCopied] = useState<string | null>(null);

    const imageUrl = getImageUrl(employee?.Photo);
    const name = employee?.['Employee Name'] || fallbackName;
    const designation = employee ? [employee['Administrative Designation'], employee['Academic Designation']].filter(Boolean).join(', ') : (employee?.['Designation'] || '');
    const id = employee?.['Employee ID'] || fallbackId;
    const email = employee?.['E-mail'] || '';
    const mobile = employee?.Mobile || '';
    const ipExt = employee?.['IP-Ext'];
    const department = employee?.Department;

    const displayRole = roleLabel || (employee ? employee['Group Name'] : 'N/A');

    const theme = themeClasses || {
        bg: 'bg-white',
        border: 'border-gray-200',
        icon: 'text-gray-500',
        text: 'text-gray-500'
    };

    const handleCopyDetails = async () => {
        await copyToClipboardWithTable(`${title} Details`, [
            { label: 'Name', value: name },
            { label: 'Designation', value: designation },
            { label: 'Department', value: department },
            { label: 'Employee ID', value: id },
            { label: 'Mobile', value: mobile },
            { label: 'Email', value: email },
            { label: 'Extension', value: ipExt }
        ], tableHeaderColor);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                <h4 className={`text-xs font-bold ${theme.text} uppercase tracking-wider flex items-center`}>
                    <User className={`w-3.5 h-3.5 mr-2 ${theme.icon}`} />
                    {title}
                </h4>
                <div className="flex items-center space-x-1">
                    {onEdit && (
                        <button 
                            onClick={onEdit}
                            className={`p-1 rounded hover:bg-white/50 transition-all ${theme.text} opacity-70 hover:opacity-100`}
                            title="Edit Employee Details"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button 
                        onClick={handleCopyDetails}
                        className={`p-1 rounded hover:bg-white/50 transition-all ${theme.text} opacity-70 hover:opacity-100`}
                        title="Copy Details as Table"
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
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
                                <img 
                                    src={imageUrl} 
                                    alt={name} 
                                    className="w-full h-full object-cover rounded-full"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 ${imageUrl ? 'hidden' : ''}`}>
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        </div>
                        
                        <h3 className="text-sm font-bold text-slate-800 leading-tight text-center mb-1">
                            {name}
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight px-4 min-h-[1em]">
                            {designation}
                        </p>
                    </div>

                    <div className={`grid grid-cols-3 gap-y-3 gap-x-1 text-center border-t ${theme.border} border-opacity-50 pt-3`}>
                        <div className="px-1">
                            <div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>Department</div>
                            <div className="text-[10px] font-bold text-slate-700 truncate" title={department}>{department || '-'}</div>
                        </div>
                        <div className={`px-1 border-l ${theme.border} border-opacity-50`}>
                            <div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>Employee ID</div>
                            <div className="text-[10px] font-bold text-slate-700 truncate" title={id}>{id || '-'}</div>
                        </div>
                        <div 
                            className={`px-1 border-l ${theme.border} border-opacity-50 group cursor-pointer hover:bg-white/40 transition-colors rounded relative`}
                            onClick={() => handleCopyField(mobile, 'mobile')}
                            title="Click to copy mobile number"
                        >
                            <div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase flex items-center justify-center`}>
                                Mobile
                                {fieldCopied === 'mobile' && <Check className="w-2.5 h-2.5 ml-1 text-green-600" />}
                            </div>
                            <div className="text-[10px] font-bold text-slate-700 truncate">{mobile || '-'}</div>
                        </div>

                        <div className={`px-1 border-t ${theme.border} border-opacity-50 pt-2`}>
                            <div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>IP-Ext.</div>
                            <div className="text-[10px] font-bold text-slate-700 truncate">{ipExt || '-'}</div>
                        </div>
                        <div 
                            className={`px-1 border-l border-t ${theme.border} border-opacity-50 pt-2 group cursor-pointer hover:bg-white/40 transition-colors rounded relative`}
                            onClick={() => handleCopyField(email, 'email')}
                            title="Click to copy email"
                        >
                            <div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase flex items-center justify-center`}>
                                Email
                                {fieldCopied === 'email' && <Check className="w-2.5 h-2.5 ml-1 text-green-600" />}
                            </div>
                            {email ? (
                                <div className="text-[10px] font-bold text-slate-700 truncate block">
                                    {email}
                                </div>
                            ) : (
                                <div className="text-[10px] font-bold text-slate-400">-</div>
                            )}
                        </div>
                        <div className={`px-1 border-l border-t ${theme.border} border-opacity-50 pt-2`}>
                            <div className={`text-[9px] font-semibold ${theme.text} opacity-70 mb-0.5 uppercase`}>Location</div>
                            <div className="text-[10px] font-bold text-slate-700 truncate" title="Daffodil Smart City">DSC</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const SectionDetailsPanel: React.FC<SectionDetailsPanelProps> = ({ section, programData = [], employeeData = [], onClose }) => {
    const { referenceData, updateReferenceData, updateSectionData, updateDiuEmployeeData } = useSheetData();
    const [isEditing, setIsEditing] = useState(false);

    // Form States for Section Edit
    const [editCourseType, setEditCourseType] = useState(section['Course Type'] || '');
    const [editCapacity, setEditCapacity] = useState(section.Capacity || '');
    const [editWeeklyClass, setEditWeeklyClass] = useState(section['Weekly Class'] || '');

    // States for Employee Edit Modal
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [employeeEditData, setEmployeeEditData] = useState<any>(null);

    // Dynamic Employee Field Options
    const employeeFieldOptions = useMemo(() => {
        const departments = new Set<string>();
        const academicDesigs = new Set<string>();
        const adminDesigs = new Set<string>();
        const groups = new Set<string>(['Teacher', 'Administration', 'Staff', 'Coordination Officer']);

        employeeData.forEach(e => {
            if (e.Department) departments.add(e.Department);
            if (e['Academic Designation']) academicDesigs.add(e['Academic Designation']);
            if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']);
            if (e['Group Name']) {
                e['Group Name'].split(',').forEach(g => groups.add(g.trim()));
            }
        });

        return {
            'Department': Array.from(departments).sort(),
            'Academic Designation': Array.from(academicDesigs).sort(),
            'Administrative Designation': Array.from(adminDesigs).sort(),
            'Group Name': Array.from(groups).sort().filter(Boolean),
            'Status': ['Active', 'Inactive', 'On Leave']
        };
    }, [employeeData]);

    // Sync state if section changes
    useEffect(() => {
        setEditCourseType(section['Course Type'] || '');
        setEditCapacity(section.Capacity || '');
        setEditWeeklyClass(section['Weekly Class'] || '');
    }, [section]);

    // 1. Find Program Info
    const programInfo = useMemo(() => {
        return programData.find(p => normalizeId(p.PID) === normalizeId(section.PID));
    }, [programData, section.PID]);

    // Derived Options for Course Type
    const courseTypeOptions = useMemo(() => {
        const types = new Set<string>(['Theory', 'Lab', 'Project', 'Thesis', 'Internship', 'Viva']);
        referenceData.forEach(r => {
            if (r['Course Type']) types.add(r['Course Type']);
        });
        return Array.from(types).sort();
    }, [referenceData]);

    const handleSave = () => {
        if (!section.Ref) {
            alert('Cannot edit: Missing Reference ID');
            return;
        }

        // 1. Prepare Payload
        const updatePayload = {
            Ref: section.Ref,
            'Course Type': editCourseType,
            'Section Capacity': editCapacity,
            'Weekly Class': editWeeklyClass
        };

        // 2. Optimistic Update (Immediate)
        updateReferenceData(prev => prev.map(r => r.Ref === section.Ref ? { ...r, ...updatePayload } : r));
        updateSectionData(prev => prev.map(s => {
            if (s.Ref === section.Ref) {
                return {
                    ...s,
                    'Course Type': editCourseType,
                    'Capacity': editCapacity, 
                    'Weekly Class': editWeeklyClass
                };
            }
            return s;
        }));
        
        setIsEditing(false);

        // 3. Background API Call
        (async () => {
            try {
                let result = await submitSheetData('update', SHEET_NAMES.REFERENCE, updatePayload, 'Ref', section.Ref.trim(), REF_SHEET_ID);
                
                // Handle Fallback for Not Found -> Add New (Fallback)
                const errorMsg = (result.message || result.error || '').toLowerCase();
                if (result.result === 'error' && (errorMsg.includes('not found') || errorMsg.includes('no match'))) {
                     console.log("Reference not found, attempting to add new entry...");
                     const newEntryPayload = {
                        ...updatePayload,
                        'P-ID': section.PID,
                        'Program Short Name': programInfo?.['Program Short Name'] || section.PID, 
                        'Credit': section.Credit,
                        'Type': section.Type || ''
                     };
                     result = await submitSheetData('add', SHEET_NAMES.REFERENCE, newEntryPayload, 'Ref', section.Ref.trim(), REF_SHEET_ID);
                     if (result.result === 'success') {
                         updateReferenceData(prev => {
                             const exists = prev.some(r => normalizeId(r.Ref) === normalizeId(section.Ref));
                             return exists ? prev : [...prev, newEntryPayload as any];
                         });
                     }
                }
                
                if (result.result !== 'success') {
                    console.error("Background Save Failed:", result.message);
                    alert("Failed to save changes to Google Sheet: " + (result.message || 'Unknown error'));
                }
            } catch (e) {
                console.error("Background Save Error:", e);
                alert("Network error while saving to Google Sheet.");
            }
        })();
    };

    // 2. Find Administration Employees (Coordination Officers)
    const adminEmployees = useMemo(() => {
        const admins: { rawId: string; emp: DiuEmployeeRow | undefined; fallbackName: string }[] = [];
        
        if (programInfo?.Administration) {
            const ids = programInfo.Administration.split(',').map(s => s.trim()).filter(Boolean);
            ids.forEach(id => {
                const normId = normalizeId(id);
                const emp = employeeData.find(e => normalizeId(e['Employee ID']) === normId);
                admins.push({
                    rawId: id,
                    emp: emp,
                    fallbackName: 'Unknown'
                });
            });
        }

        if (admins.length === 0 && programInfo) {
            admins.push({
                rawId: '',
                emp: undefined,
                fallbackName: programInfo.Head || 'Unknown'
            });
        }
        
        if (admins.length === 0) {
             admins.push({
                rawId: '',
                emp: undefined,
                fallbackName: 'Unknown'
            });
        }

        return admins;
    }, [programInfo, employeeData]);

    const handleEditCoordinationOfficer = (admin: { rawId: string; emp: DiuEmployeeRow | undefined; fallbackName: string }) => {
        if (!admin.rawId) return;

        // Prepare initial data. Prioritize existing employee record.
        const initialData = admin.emp ? { ...admin.emp } : {
            'Employee ID': admin.rawId,
            'Employee Name': admin.fallbackName !== 'Unknown' ? admin.fallbackName : '',
            'Academic Designation': '',
            'Administrative Designation': 'Coordination Officer',
            'Department': programInfo?.['Department Name'] || '',
            'Group Name': 'Coordination Officer',
            'Status': 'Active',
            'Mobile': '',
            'E-mail': '',
            'IP-Ext': '',
            'Photo': '',
            'Facebook': '',
            'Linkedin': ''
        };

        setEmployeeEditData(initialData);
        setIsEmployeeModalOpen(true);
    };

    // 3. Find Teacher Employee
    const teacherEmployee = useMemo(() => {
        const tid = section['Teacher ID'];
        if (!tid || tid === 'TBA') return undefined;
        const normTid = normalizeId(tid);
        return employeeData.find(e => normalizeId(e['Employee ID']) === normTid);
    }, [section, employeeData]);

    const handleEditTeacher = () => {
        const tid = section['Teacher ID'];
        if (!tid || tid === 'TBA') return;

        // Prepare initial data. Prioritize existing employee record, fallback to section data.
        const initialData = teacherEmployee ? { ...teacherEmployee } : {
            'Employee ID': tid,
            'Employee Name': section['Employee Name'] || '',
            'Academic Designation': section.Designation || '',
            'Administrative Designation': '',
            'Department': '',
            'Group Name': 'Teacher',
            'Status': 'Active',
            'Mobile': section['Mobile Number'] || '',
            'E-mail': section.Email || '',
            'IP-Ext': '',
            'Photo': '',
            'Facebook': '',
            'Linkedin': ''
        };

        // If 'Academic Designation' is missing in teacherEmployee but present in section, fill it.
        if (teacherEmployee && !teacherEmployee['Academic Designation'] && section.Designation) {
            initialData['Academic Designation'] = section.Designation;
        }

        setEmployeeEditData(initialData);
        setIsEmployeeModalOpen(true);
    };

    const handleEmployeeModalSuccess = (newData: any) => {
        if (!newData) return;
        const empId = newData['Employee ID'];
        
        // Update Employee Data Context
        updateDiuEmployeeData(prev => {
            const exists = prev.some(e => normalizeId(e['Employee ID']) === normalizeId(empId));
            if (exists) {
                return prev.map(e => normalizeId(e['Employee ID']) === normalizeId(empId) ? { ...e, ...newData } : e);
            } else {
                return [newData, ...prev];
            }
        });

        // Also update the current section's teacher info if it matches
        if (normalizeId(section['Teacher ID']) === normalizeId(empId)) {
             updateSectionData(prev => prev.map(s => {
                 if (normalizeId(s['Teacher ID']) === normalizeId(empId)) {
                     return {
                         ...s,
                         'Employee Name': newData['Employee Name'],
                         'Designation': newData['Academic Designation'] || newData['Administrative Designation'],
                         'Mobile Number': newData['Mobile'],
                         'Email': newData['E-mail']
                     };
                 }
                 return s;
             }));
        }
    };

    // Calculate Remaining/Vacancy
    const req = parseFloat(section.ClassRequirement || '0');
    const taken = parseFloat(section['Class Taken'] || '0');
    const remainingClass = isNaN(req) ? 0 : (req - (isNaN(taken) ? 0 : taken));
    
    const capacity = parseInt(section.Capacity || '0', 10);
    const students = parseInt(section.Student || '0', 10);
    const vacancy = isNaN(capacity) || isNaN(students) ? 0 : capacity - students;

    return (
        <div className="hidden md:flex flex-col w-[25%] md:w-[400px] lg:w-[450px] h-full bg-white border border-gray-200 shadow-xl rounded-lg z-20 shrink-0 transition-all duration-300 overflow-hidden font-sans">
            
            {/* HEADER: Program & Faculty - CENTERED */}
            <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50 shrink-0 relative text-center shadow-sm z-10">
                <div className="absolute top-2 right-2 flex items-center space-x-1 z-10">
                    {isEditing ? (
                        <>
                            <button 
                                onClick={handleSave}
                                className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors"
                                title="Save Changes"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                                title="Cancel Edit"
                            >
                                <Undo2 className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                title="Edit Course Details"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>

                <div className="px-2">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                        {programInfo ? programInfo['Program Short Name'] : section.PID}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-snug mb-2">
                        {programInfo ? programInfo['Faculty Full Name'] : 'Unknown Faculty'}
                    </p>
                    <h2 className="text-base font-extrabold text-gray-800 leading-tight">
                        {section['Course Title']}
                    </h2>
                </div>
            </div>

            {/* BODY: Scrollable Groups */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 thin-scrollbar bg-gray-50">
                
                {/* GROUP 1: Section Information - INDIGO THEME */}
                <div className={`bg-indigo-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-indigo-100'} shadow-inner p-3 relative transition-all`}>
                    <GroupHeader 
                        title="Section Information" 
                        Icon={BookOpen} 
                        themeClasses={{ 
                            text: 'text-indigo-700', 
                            border: 'border-indigo-200/50', 
                            icon: 'text-indigo-500' 
                        }}
                        onCopy={() => 
                            copyToClipboardWithTable('Section Information', [
                                { label: 'Course Title', value: section['Course Title'] },
                                { label: 'Code', value: section['Course Code'] },
                                { label: 'Section', value: section.Section },
                                { label: 'Credit', value: section.Credit },
                                { label: 'Course Type', value: section['Course Type'] || '-' },
                                { label: 'Section ID', value: section['Section ID'] || '-' },
                                { label: 'Type', value: section.Type || '-' }
                            ], '#4338ca') // indigo-700
                        }
                    />
                    
                    <div className="grid grid-cols-3 gap-y-3 gap-x-1 text-center border-t border-indigo-200/30 pt-2 mt-1">
                        {/* Row 1 */}
                        <div className="px-1">
                            <div className="text-[9px] font-semibold text-indigo-400 mb-0.5 uppercase">Code</div>
                            <div className="text-xs font-bold text-indigo-700">{section['Course Code']}</div>
                        </div>
                        <div className="px-1 border-l border-indigo-100">
                            <div className="text-[9px] font-semibold text-indigo-400 mb-0.5 uppercase">Section</div>
                            <div className="text-xs font-bold text-slate-800">{section.Section}</div>
                        </div>
                        <div className="px-1 border-l border-indigo-100">
                            <div className="text-[9px] font-semibold text-indigo-400 mb-0.5 uppercase">Credit</div>
                            <div className="text-xs font-bold text-slate-800">{section.Credit}</div>
                        </div>

                        {/* Row 2 */}
                        <div className="px-1 border-t border-indigo-100 pt-2">
                            <div className="text-[9px] font-semibold text-indigo-400 mb-0.5 uppercase">Course Type</div>
                            {isEditing ? (
                                <select 
                                    value={editCourseType}
                                    onChange={(e) => setEditCourseType(e.target.value)}
                                    className="w-full text-[10px] font-bold text-indigo-700 p-0.5 border border-indigo-300 rounded bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-center h-5"
                                >
                                    <option value="">-</option>
                                    {courseTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <div className="text-xs font-bold text-slate-800">{section['Course Type'] || '-'}</div>
                            )}
                        </div>
                        <div className="px-1 border-l border-indigo-100 border-t border-indigo-100 pt-2">
                            <div className="text-[9px] font-semibold text-indigo-400 mb-0.5 uppercase">Section ID</div>
                            <div className="text-xs font-bold text-slate-500">{section['Section ID'] || '-'}</div>
                        </div>
                        <div className="px-1 border-l border-indigo-100 border-t border-indigo-100 pt-2">
                            <div className="text-[9px] font-semibold text-indigo-400 mb-0.5 uppercase">Type</div>
                            <div className="text-xs font-bold text-slate-800">{section.Type || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* GROUP 2: Enrollment Status - FUCHSIA THEME */}
                <div className={`bg-fuchsia-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-fuchsia-100'} shadow-inner p-3 relative transition-all`}>
                    <GroupHeader 
                        title="Enrollment Status" 
                        Icon={User} 
                        themeClasses={{ 
                            text: 'text-fuchsia-700', 
                            border: 'border-fuchsia-200/50', 
                            icon: 'text-fuchsia-500' 
                        }}
                        onCopy={() => 
                            copyToClipboardWithTable('Enrollment Status', [
                                { label: 'Capacity', value: section.Capacity || '-' },
                                { label: 'Student', value: section.Student || '0' },
                                { label: 'Vacancy', value: vacancy }
                            ], '#a21caf') // fuchsia-700
                        }
                    />
                    <div className="p-1 grid grid-cols-3 gap-2 text-center divide-x divide-fuchsia-200/30">
                        <div className="px-1">
                            <div className="text-[9px] font-semibold text-fuchsia-400 mb-1 uppercase">Capacity</div>
                            {isEditing ? (
                                <input 
                                    type="text"
                                    value={editCapacity}
                                    onChange={(e) => setEditCapacity(e.target.value)}
                                    className="w-full text-sm font-bold text-slate-800 p-0.5 border border-fuchsia-300 rounded bg-white focus:ring-1 focus:ring-fuchsia-500 outline-none text-center"
                                    placeholder="0"
                                />
                            ) : (
                                <div className="text-base font-bold text-slate-800">{section.Capacity || '-'}</div>
                            )}
                        </div>
                        <div className="px-1">
                            <div className="text-[9px] font-semibold text-fuchsia-400 mb-1 uppercase">Student</div>
                            <div className="text-base font-bold text-fuchsia-800">{section.Student || '0'}</div>
                        </div>
                        <div className="px-1">
                            <div className="text-[9px] font-semibold text-fuchsia-400 mb-1 uppercase">Vacancy</div>
                            <div className={`text-base font-bold ${vacancy < 0 ? 'text-red-600' : 'text-green-600'}`}>{vacancy}</div>
                        </div>
                    </div>
                </div>

                {/* GROUP 3: Class Attendance - EMERALD THEME */}
                <div className={`bg-emerald-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-emerald-100'} shadow-inner p-3 relative transition-all`}>
                    <GroupHeader 
                        title="Class Attendance" 
                        Icon={Clock} 
                        themeClasses={{ 
                            text: 'text-emerald-700', 
                            border: 'border-emerald-200/50', 
                            icon: 'text-emerald-500' 
                        }}
                        onCopy={() => 
                            copyToClipboardWithTable('Class Attendance', [
                                { label: 'Required', value: section.ClassRequirement || '-' },
                                { label: 'Taken', value: section['Class Taken'] || '-' },
                                { label: 'To Go', value: remainingClass },
                                { label: 'Weekly', value: section['Weekly Class'] || '-' }
                            ], '#047857') // emerald-700
                        }
                    />
                    <div className="p-1 grid grid-cols-4 gap-2 text-center divide-x divide-emerald-200/30">
                            <div className="px-1">
                            <div className="text-[9px] font-semibold text-emerald-500 mb-1 uppercase">Required</div>
                            <div className="text-sm font-bold text-slate-800">{section.ClassRequirement || '-'}</div>
                            </div>
                            <div className="px-1">
                            <div className="text-[9px] font-semibold text-emerald-500 mb-1 uppercase">Taken</div>
                            <div className="text-sm font-bold text-emerald-700">{section['Class Taken'] || '-'}</div>
                            </div>
                            <div className="px-1">
                            <div className="text-[9px] font-semibold text-emerald-500 mb-1 uppercase">To Go</div>
                            <div className={`text-sm font-bold ${remainingClass > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                {remainingClass}
                            </div>
                            </div>
                            <div className="px-1">
                            <div className="text-[9px] font-semibold text-emerald-500 mb-1 uppercase">Weekly</div>
                            {isEditing ? (
                                <input 
                                    type="text"
                                    value={editWeeklyClass}
                                    onChange={(e) => setEditWeeklyClass(e.target.value)}
                                    className="w-full text-sm font-bold text-slate-800 p-0.5 border border-emerald-300 rounded bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-center"
                                    placeholder="0"
                                />
                            ) : (
                                <div className="text-sm font-bold text-slate-800">{section['Weekly Class'] || '-'}</div>
                            )}
                            </div>
                    </div>
                </div>

                {/* GROUP 4: Course Teacher - AMBER THEME */}
                <EmployeeCard 
                    title="Course Teacher"
                    employee={teacherEmployee}
                    fallbackName={section['Employee Name'] || ''}
                    fallbackId={section['Teacher ID']}
                    roleLabel="Course Teacher"
                    themeClasses={{
                        bg: 'bg-amber-50/40',
                        border: 'border-amber-100',
                        icon: 'text-amber-500',
                        text: 'text-amber-700'
                    }}
                    tableHeaderColor="#b45309" // amber-700
                    onEdit={section['Teacher ID'] && section['Teacher ID'] !== 'TBA' ? handleEditTeacher : undefined}
                />

                {/* GROUP 5: Coordination Officers - SKY THEME */}
                {adminEmployees.map((admin, idx) => (
                    <EmployeeCard 
                        key={idx}
                        title={adminEmployees.length > 1 ? `Coordination Officer ${idx + 1}` : "Coordination Officer"}
                        employee={admin.emp} 
                        fallbackName={admin.fallbackName} 
                        fallbackId={admin.rawId}
                        roleLabel="Coordination Officer"
                        themeClasses={{
                            bg: 'bg-sky-50/40',
                            border: 'border-sky-100',
                            icon: 'text-sky-500',
                            text: 'text-sky-700'
                        }}
                        tableHeaderColor="#0369a1" // sky-700
                        onEdit={admin.rawId ? () => handleEditCoordinationOfficer(admin) : undefined}
                    />
                ))}

            </div>

            <EditEntryModal 
                isOpen={isEmployeeModalOpen}
                onClose={() => setIsEmployeeModalOpen(false)}
                mode="edit"
                title="Edit Employee"
                sheetName={SHEET_NAMES.EMPLOYEE}
                columns={[
                    'Employee ID',
                    'Employee Name',
                    'Academic Designation',
                    'Administrative Designation', 
                    'Department',
                    'Group Name', 
                    'Status', 
                    'Mobile',
                    'E-mail',
                    'IP-Ext',
                    'Photo', 
                    'Facebook', 
                    'Linkedin' 
                ]}
                initialData={employeeEditData}
                keyColumn="Employee ID"
                spreadsheetId={REF_SHEET_ID}
                fieldOptions={employeeFieldOptions}
                multiSelectFields={['Group Name']}
                onSuccess={handleEmployeeModalSuccess}
            />
        </div>
    );
};
