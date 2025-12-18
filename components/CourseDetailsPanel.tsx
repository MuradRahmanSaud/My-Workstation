
import React, { useMemo, useState, useEffect } from 'react';
import { CourseSummaryItem } from '../hooks/useCourseAggregation';
import { ProgramDataRow } from '../types';
import { X, Users, BookOpen, BarChart3, Check, Copy, Pencil, Save, Loader2, Undo2 } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

interface CourseDetailsPanelProps {
    course: CourseSummaryItem;
    programData?: ProgramDataRow[];
    onClose: () => void;
}

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

const GroupHeader: React.FC<{
    title: string;
    Icon: React.ElementType;
    themeClasses: {
        text: string;
        border: string;
        icon: string;
    };
    onCopy?: () => Promise<void>;
}> = ({ title, Icon, themeClasses, onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleClick = async () => {
        if (onCopy) {
            await onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-1.5 mb-2`}>
            <h4 className={`text-xs font-bold ${themeClasses.text} uppercase tracking-wider flex items-center`}>
                <Icon className={`w-3.5 h-3.5 mr-2 ${themeClasses.icon}`} />
                {title}
            </h4>
            {onCopy && (
                <button 
                    onClick={handleClick}
                    className={`p-0.5 rounded hover:bg-white/50 transition-all ${themeClasses.text} opacity-70 hover:opacity-100`}
                    title={`Copy ${title} as Table`}
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            )}
        </div>
    );
};

export const CourseDetailsPanel: React.FC<CourseDetailsPanelProps> = ({ course, programData = [], onClose }) => {
    const { referenceData, updateReferenceData, updateSectionData } = useSheetData();
    
    // Program Info Calculation
    const programInfo = useMemo(() => {
        return programData.find(p => normalizeId(p.PID) === normalizeId(course.pid));
    }, [programData, course.pid]);

    const programName = programInfo ? programInfo['Program Short Name'] : course.program;
    const facultyName = programInfo ? programInfo['Faculty Full Name'] : 'Unknown Faculty';

    // Global Edit State
    const [isEditing, setIsEditing] = useState(false);
    
    // Form States
    const [selectedType, setSelectedType] = useState(course.courseType || '');
    const [capacityInput, setCapacityInput] = useState(course.unitCapacity || '');
    const [weeklyInput, setWeeklyInput] = useState(course.weeklyClass || '');

    // Sync state when course changes
    useEffect(() => {
        setSelectedType(course.courseType || '');
        setCapacityInput(course.unitCapacity || '');
        setWeeklyInput(course.weeklyClass || '');
    }, [course]);

    // Derived Options for Dropdown
    const courseTypeOptions = useMemo(() => {
        const types = new Set<string>(['Theory', 'Lab', 'Project', 'Thesis', 'Internship', 'Viva']);
        referenceData.forEach(r => {
            if (r['Course Type']) types.add(r['Course Type']);
        });
        return Array.from(types).sort();
    }, [referenceData]);

    const handleSaveAll = () => {
        if (!course.ref) {
            alert('Cannot update: Missing Reference ID');
            return;
        }

        // 1. Prepare Payload
        const updatePayload = { 
            Ref: course.ref, 
            'Course Type': selectedType,
            'Section Capacity': capacityInput,
            'Weekly Class': weeklyInput
        };

        // 2. Optimistic Update (Immediate)
        updateReferenceData(prev => prev.map(r => normalizeId(r.Ref) === normalizeId(course.ref) ? { ...r, ...updatePayload } : r));
        updateSectionData(prev => prev.map(s => {
            if (normalizeId(s.Ref) === normalizeId(course.ref)) {
                return { 
                    ...s, 
                    'Course Type': selectedType,
                    Capacity: capacityInput,
                    'Weekly Class': weeklyInput
                };
            }
            return s;
        }));
        
        setIsEditing(false);

        // 3. Background API Call
        (async () => {
            try {
                let result = await submitSheetData(
                    'update',
                    SHEET_NAMES.REFERENCE,
                    updatePayload,
                    'Ref',
                    course.ref.trim(),
                    REF_SHEET_ID
                );

                // Fallback: If record not found, attempt to ADD it
                const errorMsg = (result.message || result.error || '').toLowerCase();
                if (result.result === 'error' && (errorMsg.includes('not found') || errorMsg.includes('no match'))) {
                    console.log("Reference not found for update, creating new entry...");
                    
                    const newEntryPayload = {
                        ...updatePayload,
                        'P-ID': course.pid,
                        'Program Short Name': programName,
                        'Credit': course.credit,
                        'Type': course.type || ''
                    };

                    result = await submitSheetData(
                        'add',
                        SHEET_NAMES.REFERENCE,
                        newEntryPayload,
                        'Ref',
                        course.ref.trim(),
                        REF_SHEET_ID,
                        { insertMethod: 'first_empty' }
                    );

                    if (result.result === 'success') {
                        updateReferenceData(prev => {
                             const exists = prev.some(r => normalizeId(r.Ref) === normalizeId(course.ref));
                             return exists ? prev : [...prev, newEntryPayload as any];
                        });
                    }
                }

                if (result.result !== 'success') {
                    console.error("Background Save Failed:", result.message);
                    alert("Failed to save changes to Google Sheet: " + (result.message || 'Unknown error'));
                }
            } catch (error) {
                console.error("Background Save Error:", error);
                alert("Network error while saving to Google Sheet.");
            }
        })();
    };

    const handleCancel = () => {
        setIsEditing(false);
        setSelectedType(course.courseType || '');
        setCapacityInput(course.unitCapacity || '');
        setWeeklyInput(course.weeklyClass || '');
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isEditing) onClose();
    };

    return (
        <div 
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[400px] lg:w-[450px] shrink-0 transition-all duration-300 animate-in fade-in"
        >
            <div className="w-[95vw] h-[90vh] md:w-full md:h-full md:max-w-none md:max-h-none bg-white rounded-2xl md:rounded-none md:rounded-l-lg shadow-2xl md:shadow-xl flex flex-col overflow-hidden font-sans border-l border-gray-200">
                
                {/* Header */}
                <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50 shrink-0 relative text-center shadow-sm z-10">
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={handleSaveAll}
                                    className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-full transition-colors"
                                    title="Save Changes"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleCancel}
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
                        <div className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">
                            {programName}
                        </div>
                        <p className="text-xs text-gray-500 font-medium leading-snug mb-2">
                            {facultyName}
                        </p>
                        <h2 className="text-lg font-extrabold text-gray-800 leading-tight">
                            {course.courseTitle}
                        </h2>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 thin-scrollbar">
                    
                    {/* GROUP 1: Course Information */}
                    <div className={`bg-indigo-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-indigo-100'} shadow-inner p-3 relative transition-all`}>
                        <GroupHeader 
                            title="Course Information" 
                            Icon={BookOpen} 
                            themeClasses={{ 
                                text: 'text-indigo-700', 
                                border: 'border-indigo-200/50', 
                                icon: 'text-indigo-500' 
                            }}
                            onCopy={() => copyToClipboardWithTable('Course Information', [
                                { label: 'Course Code', value: course.courseCode },
                                { label: 'Credit', value: course.credit },
                                { label: 'Type', value: course.type || '-' },
                                { label: 'Course Type', value: course.courseType },
                                { label: 'Section Capacity', value: course.unitCapacity },
                                { label: 'Weekly Class', value: course.weeklyClass }
                            ], '#4338ca')}
                        />
                        
                        <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center border-t border-indigo-200/30 pt-2 mt-1">
                            {/* Row 1 */}
                            <div className="px-1">
                                <div className="text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase">Code</div>
                                <div className="text-sm font-bold text-indigo-700 truncate" title={course.courseCode}>{course.courseCode}</div>
                            </div>
                            <div className="px-1 border-l border-indigo-100">
                                <div className="text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase">Credit</div>
                                <div className="text-sm font-bold text-slate-800">{course.credit}</div>
                            </div>
                            <div className="px-1 border-l border-indigo-100">
                                <div className="text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase">Type</div>
                                <div className="text-sm font-bold text-slate-500 truncate" title={course.type || '-'}>{course.type || '-'}</div>
                            </div>

                            {/* Row 2 */}
                            <div className="px-1 border-t border-indigo-100 pt-2">
                                <div className="text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase flex items-center justify-center">
                                    Course Type
                                </div>
                                {isEditing ? (
                                    <div className="flex items-center justify-center mt-1">
                                        <select 
                                            value={selectedType}
                                            onChange={(e) => setSelectedType(e.target.value)}
                                            className="text-xs p-1 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white w-full text-center font-bold text-indigo-700 shadow-sm"
                                        >
                                            <option value="">Select Type</option>
                                            {courseTypeOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="text-sm font-bold text-slate-800 border-b border-transparent">
                                        {course.courseType || '-'}
                                    </div>
                                )}
                            </div>

                            <div className="px-1 border-l border-t border-indigo-100 pt-2">
                                <div className="text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase flex items-center justify-center">
                                    Capacity
                                </div>
                                {isEditing ? (
                                    <div className="flex items-center justify-center mt-1">
                                        <input 
                                            type="text"
                                            value={capacityInput}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d+$/.test(val)) setCapacityInput(val);
                                            }}
                                            className="text-xs p-1 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white w-full text-center font-bold shadow-sm text-indigo-700"
                                            placeholder="0"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-sm font-bold text-slate-800 border-b border-transparent">
                                        {course.unitCapacity || '-'}
                                    </div>
                                )}
                            </div>

                            <div className="px-1 border-l border-t border-indigo-100 pt-2">
                                <div className="text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase flex items-center justify-center">
                                    Weekly
                                </div>
                                {isEditing ? (
                                    <div className="flex items-center justify-center mt-1">
                                        <input 
                                            type="text"
                                            value={weeklyInput}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) setWeeklyInput(val);
                                            }}
                                            className="text-xs p-1 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white w-full text-center font-bold shadow-sm text-indigo-700"
                                            placeholder="0"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-sm font-bold text-slate-800 border-b border-transparent">
                                        {course.weeklyClass || '-'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* GROUP 2: Enrollment Statistics */}
                    <div className={`bg-fuchsia-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-fuchsia-100'} shadow-inner p-3 relative transition-all`}>
                        <GroupHeader 
                            title="Enrollment Statistics" 
                            Icon={BarChart3} 
                            themeClasses={{ 
                                text: 'text-fuchsia-700', 
                                border: 'border-fuchsia-200/50', 
                                icon: 'text-fuchsia-500' 
                            }}
                            onCopy={() => copyToClipboardWithTable('Enrollment Statistics', [
                                { label: 'Total Sections', value: course.totalSections },
                                { label: 'Total Capacity', value: course.totalCapacity },
                                { label: 'Total Students', value: course.totalStudents },
                                { label: 'Total Vacancy', value: course.totalVacancy },
                                { label: 'Extra Sections', value: course.extraSections }
                            ], '#a21caf')}
                        />
                        <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center border-t border-fuchsia-200/30 pt-2 mt-1">
                            <div className="px-1">
                                <div className="text-[10px] font-semibold text-fuchsia-400 mb-0.5 uppercase">Sections</div>
                                <div className="text-sm font-bold text-slate-800">{course.totalSections}</div>
                            </div>
                            <div className="px-1 border-l border-fuchsia-200/30">
                                <div className="text-[10px] font-semibold text-fuchsia-400 mb-0.5 uppercase">Tot. Capacity</div>
                                <div className="text-sm font-bold text-slate-800">{course.totalCapacity}</div>
                            </div>
                            <div className="px-1 border-l border-fuchsia-200/30">
                                <div className="text-[10px] font-semibold text-fuchsia-400 mb-0.5 uppercase">Tot. Students</div>
                                <div className="text-sm font-bold text-fuchsia-800">{course.totalStudents}</div>
                            </div>

                            <div className="px-1 border-t border-fuchsia-200/30 pt-2">
                                <div className="text-[10px] font-semibold text-fuchsia-400 mb-0.5 uppercase">Vacancy</div>
                                <div className={`text-sm font-bold ${course.totalVacancy < 0 ? 'text-red-600' : 'text-green-600'}`}>{course.totalVacancy}</div>
                            </div>
                            <div className="px-1 border-l border-t border-fuchsia-200/30 pt-2">
                                <div className="text-[10px] font-semibold text-fuchsia-400 mb-0.5 uppercase">Extra Sec</div>
                                <div className="text-sm font-bold text-slate-500">{course.extraSections}</div>
                            </div>
                        </div>
                    </div>

                    {/* GROUP 3: Section List */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center">
                                <Users className="w-3 h-3 text-gray-500 mr-2" />
                                <span className="text-[11px] font-bold text-gray-700 uppercase">Section List ({course.rows.length})</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase text-center w-10">Sec</th>
                                        <th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase text-center w-16">Students</th>
                                        <th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase text-center whitespace-nowrap">Class Taken</th>
                                        <th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase">Teacher</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {course.rows.map((section, idx) => {
                                        const teacherName = section['Teacher ID'] !== 'TBA' 
                                            ? (section['Employee Name'] || section['Teacher ID']) 
                                            : 'TBA';
                                        
                                        const req = parseFloat(section.ClassRequirement || '0');
                                        const taken = parseFloat(section['Class Taken'] || '0');
                                        const percentage = req > 0 ? Math.round((taken / req) * 100) : (taken > 0 ? 100 : 0);

                                        let percentageColor = 'text-green-600';
                                        if (percentage < 30) percentageColor = 'text-red-600';
                                        else if (percentage < 60) percentageColor = 'text-orange-500';

                                        return (
                                            <tr key={idx} className="hover:bg-gray-50/80">
                                                <td className="px-2 py-1 text-[10px] font-bold text-blue-700 text-center">{section.Section}</td>
                                                <td className="px-2 py-1 text-center text-[10px] text-gray-700">
                                                    {section.Student} <span className="text-gray-400">/ {section.Capacity}</span>
                                                </td>
                                                <td className="px-2 py-1 text-center text-[10px]">
                                                    <div className="font-medium text-gray-700 flex items-center justify-center space-x-1">
                                                        <span className="text-gray-500">{section.ClassRequirement || '0'}</span>
                                                        <span className="text-gray-300">/</span>
                                                        <span className="font-bold text-gray-800">{section['Class Taken'] || '0'}</span>
                                                    </div>
                                                    <div className={`text-[8px] font-bold mt-0.5 ${percentageColor}`}>
                                                        {percentage}%
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1 text-[10px]">
                                                    <div className="font-medium text-gray-800 line-clamp-1">{teacherName}</div>
                                                    <div className="text-[8px] text-gray-400 truncate">
                                                        {section.Designation ? `${section.Designation} (${section['Teacher ID']})` : section['Teacher ID']}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
