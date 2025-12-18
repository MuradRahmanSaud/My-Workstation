
import React, { useState, useEffect, useMemo } from 'react';
import { ProgramDataRow, DiuEmployeeRow } from '../types';
import { X, Pencil, Save, Undo2, School, Users, Clock, BookOpen, User, GraduationCap, Building2 } from 'lucide-react';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { submitSheetData } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

interface ProgramDetailsPanelProps {
    program: ProgramDataRow;
    allPrograms: ProgramDataRow[]; // For deriving dropdown options
    diuEmployeeData: DiuEmployeeRow[];
    onClose: () => void;
    onUpdate: (data: ProgramDataRow) => void;
}

// Helper to resolve IDs to Employee Objects
const resolveEmployees = (idsStr: string | undefined, employeeData: DiuEmployeeRow[]) => {
    if (!idsStr) return [];
    const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
    return ids.map(id => {
        const emp = employeeData.find(e => e['Employee ID'] === id);
        return { id, emp };
    });
};

// Helper: Convert stored IDs (comma sep) to Formatted Strings (comma sep) for Edit Form
const formatEmployeeField = (idsStr: string | undefined, employeeData: DiuEmployeeRow[]) => {
    if (!idsStr) return '';
    const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
    return ids.map(id => {
        const emp = employeeData.find(e => e['Employee ID'] === id);
        if (emp) {
            const desig = [emp['Administrative Designation'], emp['Academic Designation']].filter(Boolean).join('/');
            return `${emp['Employee Name']} - ${desig} (${emp['Employee ID']})`;
        }
        return id;
    }).join(', ');
};

// Helper: Convert Formatted Strings back to IDs for API Submission
const transformDataForSubmit = (data: any) => {
    const extractIds = (fieldVal: string) => {
        if (!fieldVal) return '';
        return fieldVal.split(',').map(item => {
            const trimmed = item.trim();
            const match = trimmed.match(/\(([^)]+)\)$/);
            return match ? match[1] : trimmed;
        }).join(', ');
    };

    return {
        ...data,
        'Head': extractIds(data.Head),
        'Associate Head': extractIds(data['Associate Head']),
        'Administration': extractIds(data.Administration)
    };
};

export const ProgramDetailsPanel: React.FC<ProgramDetailsPanelProps> = ({ program, allPrograms, diuEmployeeData, onClose, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        // Reset editing state when program selection changes
        setIsEditing(false);
        // Pre-format employee fields for the form
        setFormData({
            ...program,
            'Head': formatEmployeeField(program.Head, diuEmployeeData),
            'Associate Head': formatEmployeeField(program['Associate Head'], diuEmployeeData),
            'Administration': formatEmployeeField(program.Administration, diuEmployeeData)
        });
    }, [program, diuEmployeeData]);

    const handleEditChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        // Transform back to IDs
        const payload = transformDataForSubmit(formData);

        // Optimistic Update
        onUpdate(payload);
        setIsEditing(false);

        // Background API Call
        (async () => {
            try {
                const result = await submitSheetData(
                    'update', 
                    SHEET_NAMES.PROGRAM, 
                    payload, 
                    'PID', 
                    program.PID, 
                    REF_SHEET_ID
                );

                if (result.result !== 'success') {
                    console.error("Background Save Failed:", result.message);
                    alert("Failed to save changes: " + (result.message || 'Unknown error'));
                }
            } catch (e) {
                console.error("Background Save Error:", e);
                alert("Network error while saving.");
            }
        })();
    };

    const handleCancelEdit = () => {
        setFormData({
            ...program,
            'Head': formatEmployeeField(program.Head, diuEmployeeData),
            'Associate Head': formatEmployeeField(program['Associate Head'], diuEmployeeData),
            'Administration': formatEmployeeField(program.Administration, diuEmployeeData)
        });
        setIsEditing(false);
    };

    // Prepare Dropdown Options
    const options = useMemo(() => {
        const fields = [
            'Faculty Short Name', 'Faculty Full Name', 'Program Full Name', 
            'Program Short Name', 'Department Name', 'Program Type', 
            'Semester Type', 'Semester Duration', 'Class Requirement', 'Class Duration'
        ];
        const opts: Record<string, string[]> = {};
        fields.forEach(f => opts[f] = []);

        const employeeOpts = diuEmployeeData.map(e => {
            const desig = [e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/');
            return `${e['Employee Name']} - ${desig} (${e['Employee ID']})`;
        });
        
        // Collect unique values from all programs
        allPrograms.forEach(p => {
            fields.forEach(f => {
                const val = p[f as keyof ProgramDataRow];
                if (val && !opts[f].includes(String(val))) opts[f].push(String(val));
            });
        });

        // Sort
        Object.keys(opts).forEach(k => opts[k].sort());
        
        return {
            ...opts,
            'Employee': Array.from(new Set(employeeOpts)).sort()
        };
    }, [allPrograms, diuEmployeeData]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const renderPersonnelSection = (title: string, idsStr: string | undefined) => {
        const list = resolveEmployees(idsStr, diuEmployeeData);
        if (list.length === 0) return null;

        return (
            <div className="mb-4">
                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                    <User className="w-3 h-3 mr-1.5" />
                    {title}
                </h5>
                <div className="space-y-2">
                    {list.map(({ id, emp }, idx) => (
                        <div key={idx} className="flex items-start bg-white p-2 rounded border border-gray-100 shadow-sm">
                            {emp ? (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-gray-800">{emp['Employee Name']}</div>
                                        <div className="text-[10px] text-gray-500 truncate">
                                            {[emp['Administrative Designation'], emp['Academic Designation']].filter(Boolean).join(', ')}
                                        </div>
                                        <div className="text-[10px] text-blue-600 font-mono mt-0.5">{id}</div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-400">Unknown Employee</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{id}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div 
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[400px] lg:w-[450px] shrink-0 transition-all duration-300 animate-in fade-in"
        >
            <div className="w-[90vw] h-[90vh] md:w-full md:h-full md:max-w-none md:max-h-none bg-white rounded-2xl shadow-2xl md:shadow-xl flex flex-col overflow-hidden md:rounded-none md:border-l md:border-gray-200 font-sans transform transition-all animate-in zoom-in-95 duration-200 md:animate-none">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-white shrink-0 relative flex items-center justify-between">
                    <h3 className="text-base md:text-sm font-bold text-gray-800 uppercase tracking-wide">
                        {isEditing ? 'Edit Program' : 'Program Details'}
                    </h3>
                    <div className="flex items-center space-x-1">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={handleSave}
                                    className="p-2 md:p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                                    title="Save Changes"
                                >
                                    <Save className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                                <button 
                                    onClick={handleCancelEdit}
                                    className="p-2 md:p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                    title="Cancel"
                                >
                                    <Undo2 className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2 md:p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-full text-gray-500 transition-colors"
                                title="Edit Program"
                            >
                                <Pencil className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 md:p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            title="Close"
                        >
                            <X className="w-6 h-6 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-5 space-y-6 md:space-y-5 thin-scrollbar bg-slate-50/50">
                    
                    {isEditing ? (
                        <div className="space-y-4">
                            {/* General Info */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                <h4 className="text-xs font-bold text-blue-600 border-b pb-1 mb-2">General Information</h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">PID (Read-only)</label>
                                    <input type="text" value={formData.PID} disabled className="w-full text-sm bg-gray-100 border border-gray-300 rounded px-2 py-1.5 text-gray-500 cursor-not-allowed" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Program Short</label>
                                        <SearchableSelect value={formData['Program Short Name']} onChange={v => handleEditChange('Program Short Name', v)} options={options['Program Short Name']} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Faculty Short</label>
                                        <SearchableSelect value={formData['Faculty Short Name']} onChange={v => handleEditChange('Faculty Short Name', v)} options={options['Faculty Short Name']} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Program Full Name</label>
                                    <SearchableSelect value={formData['Program Full Name']} onChange={v => handleEditChange('Program Full Name', v)} options={options['Program Full Name']} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Faculty Full Name</label>
                                    <SearchableSelect value={formData['Faculty Full Name']} onChange={v => handleEditChange('Faculty Full Name', v)} options={options['Faculty Full Name']} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                                    <SearchableSelect value={formData['Department Name']} onChange={v => handleEditChange('Department Name', v)} options={options['Department Name']} />
                                </div>
                            </div>

                            {/* Academic Config */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                <h4 className="text-xs font-bold text-purple-600 border-b pb-1 mb-2">Academic Configuration</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Program Type</label>
                                        <SearchableSelect value={formData['Program Type']} onChange={v => handleEditChange('Program Type', v)} options={options['Program Type']} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Semester Type</label>
                                        <SearchableSelect value={formData['Semester Type']} onChange={v => handleEditChange('Semester Type', v)} options={options['Semester Type']} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Sem Duration</label>
                                        <SearchableSelect value={formData['Semester Duration']} onChange={v => handleEditChange('Semester Duration', v)} options={options['Semester Duration']} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Class Duration</label>
                                        <SearchableSelect value={formData['Class Duration']} onChange={v => handleEditChange('Class Duration', v)} options={options['Class Duration']} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Class Requirement</label>
                                    <SearchableSelect value={formData['Class Requirement']} onChange={v => handleEditChange('Class Requirement', v)} options={options['Class Requirement']} />
                                </div>
                            </div>

                            {/* Personnel */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                <h4 className="text-xs font-bold text-orange-600 border-b pb-1 mb-2">Key Personnel</h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Head</label>
                                    <MultiSearchableSelect value={formData['Head']} onChange={v => handleEditChange('Head', v)} options={options['Employee']} placeholder="Select Head" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Associate Head</label>
                                    <MultiSearchableSelect value={formData['Associate Head']} onChange={v => handleEditChange('Associate Head', v)} options={options['Employee']} placeholder="Select Associate Head" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Administration</label>
                                    <MultiSearchableSelect value={formData['Administration']} onChange={v => handleEditChange('Administration', v)} options={options['Employee']} placeholder="Select Admins" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Profile Header */}
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-3 shadow-inner">
                                    <GraduationCap className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight px-4">{program['Program Full Name']}</h2>
                                <p className="text-sm text-gray-500 font-medium mt-1">{program['Faculty Full Name']}</p>
                                <div className="mt-3 inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200">
                                    PID: {program.PID}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                    <div className="p-3 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Short Name</div>
                                        <div className="text-sm font-bold text-gray-800">{program['Program Short Name'] || '-'}</div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Department</div>
                                        <div className="text-sm font-bold text-gray-800">{program['Department Name'] || '-'}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-gray-100">
                                    <div className="p-3 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Type</div>
                                        <div className="text-xs font-semibold text-gray-700">{program['Program Type'] || '-'}</div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Semesters</div>
                                        <div className="text-xs font-semibold text-gray-700">{program['Semester Type'] || '-'}</div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Duration</div>
                                        <div className="text-xs font-semibold text-gray-700">{program['Semester Duration'] || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Class Info */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <h4 className="text-xs font-bold text-gray-900 border-b pb-2 mb-3 flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                                    Class Configuration
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-medium">Class Duration</span>
                                        <span className="text-sm font-bold text-gray-800">{program['Class Duration'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs text-gray-500 font-medium mt-0.5">Requirement</span>
                                        <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">{program['Class Requirement'] || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Personnel */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <h4 className="text-xs font-bold text-gray-900 border-b pb-2 mb-3 flex items-center">
                                    <Users className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                                    Personnel
                                </h4>
                                {renderPersonnelSection('Head of Program', program.Head)}
                                {renderPersonnelSection('Associate Head', program['Associate Head'])}
                                {renderPersonnelSection('Administration', program.Administration)}
                                {!program.Head && !program['Associate Head'] && !program.Administration && (
                                    <div className="text-center text-xs text-gray-400 italic py-2">No personnel assigned</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
