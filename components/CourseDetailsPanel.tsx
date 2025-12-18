
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

const GroupHeader: React.FC<{
    title: string;
    Icon: React.ElementType;
    themeClasses: { text: string; border: string; icon: string; };
    onCopy?: () => Promise<void>;
}> = ({ title, Icon, themeClasses, onCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleClick = async () => { if (onCopy) { await onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
    return (
        <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-1.5 mb-2`}>
            <h4 className={`text-[11px] font-bold ${themeClasses.text} uppercase tracking-wider flex items-center`}>
                <Icon className={`w-3.5 h-3.5 mr-2 ${themeClasses.icon}`} />
                {title}
            </h4>
            {onCopy && <button onClick={handleClick} className="p-1 rounded opacity-70 hover:opacity-100">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>}
        </div>
    );
};

export const CourseDetailsPanel: React.FC<CourseDetailsPanelProps> = ({ course, programData = [], onClose }) => {
    const { referenceData, updateReferenceData, updateSectionData } = useSheetData();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedType, setSelectedType] = useState(course.courseType || '');
    const [capacityInput, setCapacityInput] = useState(course.unitCapacity || '');
    const [weeklyInput, setWeeklyInput] = useState(course.weeklyClass || '');

    useEffect(() => {
        setSelectedType(course.courseType || '');
        setCapacityInput(course.unitCapacity || '');
        setWeeklyInput(course.weeklyClass || '');
    }, [course]);

    const programInfo = useMemo(() => programData.find(p => normalizeId(p.PID) === normalizeId(course.pid)), [programData, course.pid]);
    const programName = programInfo ? programInfo['Program Short Name'] : course.program;
    const courseTypeOptions = useMemo(() => {
        const types = new Set<string>(['Theory', 'Lab', 'Project', 'Thesis', 'Internship', 'Viva']);
        referenceData.forEach(r => { if (r['Course Type']) types.add(r['Course Type']); });
        return Array.from(types).sort();
    }, [referenceData]);

    const handleSave = async () => {
        if (!course.ref) return;
        const payload = { Ref: course.ref, 'Course Type': selectedType, 'Section Capacity': capacityInput, 'Weekly Class': weeklyInput };
        updateReferenceData(prev => prev.map(r => normalizeId(r.Ref) === normalizeId(course.ref) ? { ...r, ...payload } : r));
        updateSectionData(prev => prev.map(s => normalizeId(s.Ref) === normalizeId(course.ref) ? { ...s, 'Course Type': selectedType, Capacity: capacityInput, 'Weekly Class': weeklyInput } : s));
        setIsEditing(false);
        try { await submitSheetData('update', SHEET_NAMES.REFERENCE, payload, 'Ref', course.ref.trim(), REF_SHEET_ID); } catch (e) {}
    };

    return (
        <div className="fixed inset-0 md:static z-[100] md:z-auto bg-black/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none flex items-end md:items-start justify-center md:flex-col w-full md:w-[350px] lg:w-[400px] shrink-0 animate-in slide-in-from-bottom-5 md:animate-none">
            <div className="w-full h-[85vh] md:h-full bg-white rounded-t-2xl md:rounded-none md:rounded-l-lg shadow-2xl flex flex-col overflow-hidden font-sans border-l border-gray-200">
                <div className="px-4 py-4 border-b border-gray-100 bg-white shrink-0 relative text-center">
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
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">{programName}</div>
                        <h2 className="text-sm font-extrabold text-gray-800 leading-tight">{course.courseTitle}</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 thin-scrollbar">
                    <div className={`bg-indigo-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-indigo-100'} p-3 shadow-inner`}>
                        <GroupHeader title="Course Detail" Icon={BookOpen} themeClasses={{ text: 'text-indigo-700', border: 'border-indigo-200/50', icon: 'text-indigo-500' }} />
                        <div className="grid grid-cols-3 gap-y-2 gap-x-2 text-center border-t border-indigo-200/30 pt-2">
                            <div><div className="text-[9px] font-bold text-indigo-400 uppercase">Code</div><div className="text-[11px] font-bold text-indigo-700 truncate">{course.courseCode}</div></div>
                            <div className="border-l border-indigo-100"><div className="text-[9px] font-bold text-indigo-400 uppercase">Credit</div><div className="text-[11px] font-bold text-slate-800">{course.credit}</div></div>
                            <div className="border-l border-indigo-100"><div className="text-[9px] font-bold text-indigo-400 uppercase">Type</div><div className="text-[11px] font-bold text-slate-500">{course.type || '-'}</div></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase text-gray-500">Sections ({course.rows.length})</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] text-left">
                                <thead className="bg-gray-100 border-b"><tr><th className="p-1.5 text-center">Sec</th><th className="p-1.5 text-center">Std</th><th className="p-1.5">Teacher</th></tr></thead>
                                <tbody className="divide-y">
                                    {course.rows.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-1.5 text-center font-bold text-blue-600">{r.Section}</td>
                                            <td className="p-1.5 text-center">{r.Student}</td>
                                            <td className="p-1.5 truncate max-w-[120px]">{r['Employee Name'] || 'TBA'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
