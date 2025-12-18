
import React, { useMemo, useState, useEffect } from 'react';
import { TeacherSummaryItem } from '../hooks/useTeacherAggregation';
import { DiuEmployeeRow } from '../types';
import { X, User, Phone, Mail, BookOpen, BarChart3, GraduationCap, Building2, Briefcase, Globe, Pencil, Save, Undo2 } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

interface TeacherDetailsPanelProps {
    teacher: TeacherSummaryItem;
    employeeData: DiuEmployeeRow[];
    onClose: () => void;
}

// Helper to get image URL
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

export const TeacherDetailsPanel: React.FC<TeacherDetailsPanelProps> = ({ teacher, employeeData, onClose }) => {
    const { updateDiuEmployeeData, updateSectionData } = useSheetData();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    
    // Find full employee record
    const employee = useMemo(() => {
        if (!employeeData) return undefined;
        const targetId = normalizeId(teacher.teacherId);
        return employeeData.find(e => normalizeId(e['Employee ID']) === targetId);
    }, [teacher, employeeData]);

    // Initialize Form Data when teacher changes
    useEffect(() => {
        setIsEditing(false);
        const initialData = employee ? { ...employee } : {
            'Employee ID': teacher.teacherId,
            'Employee Name': teacher.teacherName,
            'Academic Designation': teacher.designation,
            'Administrative Designation': '',
            'Department': '',
            'Group Name': 'Teacher',
            'Status': 'Active',
            'Mobile': teacher.mobile !== '-' ? teacher.mobile : '',
            'E-mail': teacher.email !== '-' ? teacher.email : '',
            'IP-Ext': '',
            'Photo': '',
            'Facebook': '',
            'Linkedin': ''
        };
        setFormData(initialData);
    }, [teacher, employee]);

    // Dynamic Employee Field Options for Edit Form
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

    const handleFieldChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSaveProfile = async () => {
        try {
            // 1. Optimistic Update
            const newData = { ...formData };
            updateDiuEmployeeData(prev => {
                const exists = prev.some(e => normalizeId(e['Employee ID']) === normalizeId(newData['Employee ID']));
                if (exists) {
                    return prev.map(e => normalizeId(e['Employee ID']) === normalizeId(newData['Employee ID']) ? { ...e, ...newData } : e);
                } else {
                    return [newData, ...prev];
                }
            });

            updateSectionData(prev => prev.map(s => {
                if (normalizeId(s['Teacher ID']) === normalizeId(newData['Employee ID'])) {
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

            setIsEditing(false);

            // 2. API Call with normalized ID
            let result = await submitSheetData(
                'update', 
                SHEET_NAMES.EMPLOYEE, 
                newData, 
                'Employee ID', 
                teacher.teacherId.trim(), 
                REF_SHEET_ID
            );

            // Fallback: If record not found, attempt to ADD it
            const errorMsg = (result.message || result.error || '').toLowerCase();
            if (result.result === 'error' && (errorMsg.includes('not found') || errorMsg.includes('no match'))) {
                result = await submitSheetData(
                    'add', 
                    SHEET_NAMES.EMPLOYEE, 
                    newData, 
                    'Employee ID', 
                    teacher.teacherId.trim(), 
                    REF_SHEET_ID,
                    { insertMethod: 'first_empty' }
                );
            }

            if (result.result !== 'success') {
                console.error('Save failed:', result.message);
                alert('Failed to sync changes to Google Sheet: ' + (result.message || 'Unknown error'));
            }

        } catch (e) {
            console.error('Save error:', e);
            alert('Network error while saving.');
        }
    };

    const imgUrl = getImageUrl(employee?.Photo);
    const name = employee?.['Employee Name'] || teacher.teacherName;
    const designation = employee 
        ? [employee['Administrative Designation'], employee['Academic Designation']].filter(Boolean).join(', ') 
        : teacher.designation;
    const department = employee?.Department;
    const mobile = employee?.Mobile || teacher.mobile;
    const email = employee?.['E-mail'] || teacher.email;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[400px] lg:w-[450px] shrink-0 transition-all duration-300 animate-in fade-in">
            <div className="w-[95vw] h-[90vh] md:w-full md:h-full md:max-w-none md:max-h-none bg-white rounded-2xl md:rounded-none md:rounded-l-lg shadow-2xl md:shadow-xl flex flex-col overflow-hidden font-sans border-l border-gray-200">
                
                {/* Header */}
                <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50 shrink-0 relative text-center shadow-sm z-10">
                    <div className="absolute top-3 right-3 flex items-center space-x-1">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={handleSaveProfile}
                                    className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors"
                                    title="Save"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => { setIsEditing(false); setFormData(employee ? { ...employee } : formData); }}
                                    className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full transition-colors"
                                    title="Cancel"
                                >
                                    <Undo2 className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-full transition-colors"
                                    title="Edit Profile"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 mb-2 ring-1 ring-gray-200">
                            {imgUrl ? (
                                <img 
                                    src={imgUrl} 
                                    alt={name} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <User className="w-10 h-10" />
                                </div>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 leading-tight px-2">{name}</h2>
                        <p className="text-xs font-medium text-blue-600 mt-0.5">{designation}</p>
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-mono font-bold">
                            {teacher.teacherId}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 thin-scrollbar">
                    
                    {isEditing ? (
                        /* Edit Form */
                        <div className="space-y-4">
                            {/* Group: Basic Info */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Basic Information</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Name</label>
                                    <input
                                        type="text"
                                        value={formData['Employee Name'] || ''}
                                        onChange={(e) => handleFieldChange('Employee Name', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Employee Name"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 min-w-0">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Department</label>
                                        <SearchableSelect
                                            value={formData['Department'] || ''}
                                            onChange={(val) => handleFieldChange('Department', val)}
                                            options={employeeFieldOptions['Department'] || []}
                                            placeholder="Dept"
                                        />
                                    </div>
                                    <div className="w-[35%] min-w-[100px]">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Status</label>
                                        <SearchableSelect
                                            value={formData['Status'] || 'Active'}
                                            onChange={(val) => handleFieldChange('Status', val)}
                                            options={employeeFieldOptions['Status'] || []}
                                            placeholder="Status"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Group</label>
                                    <MultiSearchableSelect
                                        value={formData['Group Name'] || ''}
                                        onChange={(val) => handleFieldChange('Group Name', val)}
                                        options={employeeFieldOptions['Group Name'] || []}
                                        placeholder="Groups"
                                    />
                                </div>
                            </div>

                            {/* Group: Designation */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Designation</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Administrative</label>
                                        <SearchableSelect
                                            value={formData['Administrative Designation'] || ''}
                                            onChange={(val) => handleFieldChange('Administrative Designation', val)}
                                            options={employeeFieldOptions['Administrative Designation'] || []}
                                            placeholder="Admin Role"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Academic</label>
                                        <SearchableSelect
                                            value={formData['Academic Designation'] || ''}
                                            onChange={(val) => handleFieldChange('Academic Designation', val)}
                                            options={employeeFieldOptions['Academic Designation'] || []}
                                            placeholder="Acad Role"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group: Contact */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Contact Details</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Email</label>
                                    <input
                                        type="text"
                                        value={formData['E-mail'] || ''}
                                        onChange={(e) => handleFieldChange('E-mail', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Email Address"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Mobile</label>
                                        <input
                                            type="text"
                                            value={formData['Mobile'] || ''}
                                            onChange={(e) => handleFieldChange('Mobile', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Mobile"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">IP / Ext</label>
                                        <input
                                            type="text"
                                            value={formData['IP-Ext'] || ''}
                                            onChange={(e) => handleFieldChange('IP-Ext', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Extension"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group: Profile & Social */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Profile & Social</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Photo URL</label>
                                    <input
                                        type="text"
                                        value={formData['Photo'] || ''}
                                        onChange={(e) => handleFieldChange('Photo', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Image Link"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Facebook</label>
                                        <input
                                            type="text"
                                            value={formData['Facebook'] || ''}
                                            onChange={(e) => handleFieldChange('Facebook', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Username/URL"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">LinkedIn</label>
                                        <input
                                            type="text"
                                            value={formData['Linkedin'] || ''}
                                            onChange={(e) => handleFieldChange('Linkedin', e.target.value)}
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="Username/URL"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Read-only View */
                        <>
                            {/* Stats Grid - MOVED TO TOP as per request */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sections</span>
                                    <span className="text-xl font-bold text-purple-600">{teacher.totalSections}</span>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Credits</span>
                                    <span className="text-xl font-bold text-blue-600">{teacher.creditLoad.toFixed(1)}</span>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Students</span>
                                    <span className="text-xl font-bold text-green-600">{teacher.studentCount}</span>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <User className="w-3 h-3 text-gray-500 mr-2" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Profile Information</span>
                                    </div>
                                </div>
                                <div className="p-3 space-y-3">
                                    {department && (
                                        <div className="flex items-center text-xs">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400 mr-2.5 shrink-0" />
                                            <span className="text-gray-700">{department}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-xs">
                                        <Phone className="w-3.5 h-3.5 text-gray-400 mr-2.5 shrink-0" />
                                        <span className="text-gray-700 font-mono">{mobile || '-'}</span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        <Mail className="w-3.5 h-3.5 text-gray-400 mr-2.5 shrink-0" />
                                        <span className="text-gray-700 break-all">{email || '-'}</span>
                                    </div>
                                    {employee?.['IP-Ext'] && (
                                        <div className="flex items-center text-xs">
                                            <Globe className="w-3.5 h-3.5 text-gray-400 mr-2.5 shrink-0" />
                                            <span className="text-gray-700">Ext: {employee['IP-Ext']}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section List */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <BookOpen className="w-3 h-3 text-gray-500 mr-2" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned Sections ({teacher.rows.length})</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase">Course</th>
                                                <th className="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase text-center w-10">Sec</th>
                                                <th className="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase text-center w-10">Cr</th>
                                                <th className="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase text-center w-10">Std</th>
                                                {/* WHITE-SPACE NOWRAP added to prevent wrapping */}
                                                <th className="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase text-center min-w-[70px] whitespace-nowrap">Class Taken</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {teacher.rows.map((row, idx) => {
                                                const req = parseFloat(row.ClassRequirement || '0');
                                                const taken = parseFloat(row['Class Taken'] || '0');
                                                let percentage = 0;
                                                if (req > 0) percentage = (taken / req) * 100;
                                                else if (taken > 0) percentage = 100;
                                                const percentageDisplay = percentage > 100 ? 100 : Math.round(percentage);
                                                
                                                let percentageColor = 'text-green-600';
                                                if (percentage < 30) percentageColor = 'text-red-600';
                                                else if (percentage < 60) percentageColor = 'text-orange-500';

                                                return (
                                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="px-3 py-2">
                                                            <div className="text-[10px] font-bold text-blue-600 leading-tight">{row['Course Code']}</div>
                                                            <div className="text-[9px] text-gray-500 leading-tight truncate max-w-[150px]" title={row['Course Title']}>{row['Course Title']}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-[10px] font-bold text-center text-gray-800 align-middle">{row.Section}</td>
                                                        <td className="px-3 py-2 text-[10px] text-center text-gray-600 align-middle">{row.Credit}</td>
                                                        <td className="px-3 py-2 text-[10px] text-center font-medium text-gray-700 align-middle">{row.Student || '0'}</td>
                                                        <td className="px-3 py-2 text-center align-middle whitespace-nowrap">
                                                            <div className="text-[10px] font-medium text-gray-700 leading-tight">
                                                                {row.ClassRequirement || '0'} / {row['Class Taken'] || '0'}
                                                            </div>
                                                            <div className={`text-[9px] font-bold leading-tight ${percentageColor}`}>
                                                                {percentageDisplay}%
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};
