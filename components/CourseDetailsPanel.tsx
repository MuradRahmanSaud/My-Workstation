
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

const copyToClipboardWithTable = async (title: string, data: { label: string; value: string | number | undefined | null }[], colorHex: string) => {
    const html = `<div style="font-family: Arial, sans-serif; display: inline-block;"><table style="border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;"><thead><tr style="background-color: ${colorHex}; color: white;"><th colspan="2" style="padding: 4px 6px; text-align: left; font-weight: bold; border: 1px solid ${colorHex};">${title}</th></tr></thead><tbody>${data.map((d, i) => `<tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};"><td style="padding: 2px 6px; font-weight: bold; color: #4b5563; border: 1px solid #e5e7eb; width: 100px;">${d.label}</td><td style="padding: 2px 6px; color: #1f2937; border: 1px solid #e5e7eb; min-width: 120px;">${d.value ?? '-'}</td></tr>`).join('')}</tbody></table></div>`;
    const text = `*${title}*\n${data.map(d => `${d.label}: ${d.value ?? 'N/A'}`).join('\n')}`;
    try {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
    } catch (err) { navigator.clipboard.writeText(text); }
};

const GroupHeader: React.FC<{ title: string; Icon: React.ElementType; themeClasses: { text: string; border: string; icon: string; }; onCopy?: () => Promise<void>; }> = ({ title, Icon, themeClasses, onCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleClick = async () => { if (onCopy) { await onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
    return (
        <div className={`flex items-center justify-between border-b ${themeClasses.border} pb-1.5 mb-2`}>
            <h4 className={`text-xs font-bold ${themeClasses.text} uppercase tracking-wider flex items-center`}><Icon className={`w-3.5 h-3.5 mr-2 ${themeClasses.icon}`} />{title}</h4>
            {onCopy && <button onClick={handleClick} className={`p-0.5 rounded hover:bg-white/50 transition-all ${themeClasses.text} opacity-70 hover:opacity-100`}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>}
        </div>
    );
};

export const CourseDetailsPanel: React.FC<CourseDetailsPanelProps> = ({ course, programData = [], onClose }) => {
    const { referenceData, updateReferenceData, updateSectionData } = useSheetData();
    const programInfo = useMemo(() => programData.find(p => normalizeId(p.PID) === normalizeId(course.pid)), [programData, course.pid]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedType, setSelectedType] = useState(course.courseType || '');
    const [capacityInput, setCapacityInput] = useState(course.unitCapacity || '');
    const [weeklyInput, setWeeklyInput] = useState(course.weeklyClass || '');

    useEffect(() => { setSelectedType(course.courseType || ''); setCapacityInput(course.unitCapacity || ''); setWeeklyInput(course.weeklyClass || ''); }, [course]);

    const handleSaveAll = async () => {
        if (!course.ref) return;
        const updatePayload = { Ref: course.ref, 'Course Type': selectedType, 'Section Capacity': capacityInput, 'Weekly Class': weeklyInput };
        updateReferenceData(prev => prev.map(r => normalizeId(r.Ref) === normalizeId(course.ref) ? { ...r, ...updatePayload } : r));
        updateSectionData(prev => prev.map(s => normalizeId(s.Ref) === normalizeId(course.ref) ? { ...s, 'Course Type': selectedType, Capacity: capacityInput, 'Weekly Class': weeklyInput } : s));
        setIsEditing(false);
        try { await submitSheetData('update', SHEET_NAMES.REFERENCE, updatePayload, 'Ref', course.ref.trim(), REF_SHEET_ID); } catch (error) {}
    };

    const handleCancel = () => { setIsEditing(false); setSelectedType(course.courseType || ''); setCapacityInput(course.unitCapacity || ''); setWeeklyInput(course.weeklyClass || ''); };

    return (
        <div className="fixed inset-0 md:static z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[400px] lg:w-[450px] shrink-0 transition-all duration-300 animate-in fade-in">
            <div className="w-[95vw] h-[90vh] md:w-full md:h-full bg-white rounded-2xl md:rounded-none md:rounded-l-lg shadow-2xl flex flex-col overflow-hidden font-sans border-l border-gray-200">
                <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50 shrink-0 relative text-center shadow-sm">
                    <div className="absolute top-2 right-2 flex items-center space-x-1">
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="px-2">
                        <div className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">{programInfo ? programInfo['Program Short Name'] : course.program}</div>
                        <h2 className="text-lg font-extrabold text-gray-800 leading-tight">{course.courseTitle}</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 thin-scrollbar">
                    <div className={`bg-indigo-50/40 rounded-lg border ${isEditing ? 'border-blue-300 ring-1 ring-blue-100' : 'border-indigo-100'} shadow-inner p-3 relative transition-all`}>
                        <GroupHeader title="Course Info" Icon={BookOpen} themeClasses={{ text: 'text-indigo-700', border: 'border-indigo-200/50', icon: 'text-indigo-500' }} onCopy={() => copyToClipboardWithTable('Course Info', [{ label: 'Code', value: course.courseCode }, { label: 'Credit', value: course.credit }], '#4338ca')} />
                        <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center border-t border-indigo-200/30 pt-2 mt-1">
                            <div><div className="text-[10px] font-semibold text-indigo-400 uppercase">Code</div><div className="text-sm font-bold text-indigo-700 truncate">{course.courseCode}</div></div>
                            <div className="border-l border-indigo-100"><div className="text-[10px] font-semibold text-indigo-400 uppercase">Credit</div><div className="text-sm font-bold text-slate-800">{course.credit}</div></div>
                            <div className="border-l border-indigo-100"><div className="text-[10px] font-semibold text-indigo-400 uppercase">Type</div><div className="text-sm font-bold text-slate-500">{course.type || '-'}</div></div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider border-b border-blue-100 pb-1 mb-1">Edit Reference Data</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Course Type</label>
                                    <input type="text" value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Section Capacity</label>
                                    <input type="number" value={capacityInput} onChange={e => setCapacityInput(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Weekly Class</label>
                                <input type="number" step="0.5" value={weeklyInput} onChange={e => setWeeklyInput(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between"><div className="flex items-center"><Users className="w-3 h-3 text-gray-500 mr-2" /><span className="text-[11px] font-bold text-gray-700 uppercase">Section List ({course.rows.length})</span></div></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase text-center w-10">Sec</th><th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase text-center">Students</th><th className="px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase">Teacher</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">{course.rows.map((section, idx) => (<tr key={idx} className="hover:bg-gray-50/80"><td className="px-2 py-1 text-[10px] font-bold text-blue-700 text-center">{section.Section}</td><td className="px-2 py-1 text-center text-[10px] text-gray-700">{section.Student} / {section.Capacity}</td><td className="px-2 py-1 text-[10px]"><div className="font-medium text-gray-800 line-clamp-1">{section['Employee Name'] || section['Teacher ID']}</div></td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-white flex space-x-3 shrink-0 pb-8 md:pb-4">
                        <button onClick={handleCancel} className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                            <Undo2 className="w-4 h-4 mr-2" /> Cancel
                        </button>
                        <button onClick={handleSaveAll} className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md active:scale-95 transition-all">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
