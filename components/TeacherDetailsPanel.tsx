
import React, { useMemo, useState, useEffect } from 'react';
import { TeacherSummaryItem } from '../hooks/useTeacherAggregation';
import { DiuEmployeeRow } from '../types';
import { X, User, Phone, Mail, BookOpen, BarChart3, GraduationCap, Building2, Briefcase, Globe, Pencil, Save, Undo2, Facebook, Linkedin, Image as ImageIcon } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

interface TeacherDetailsPanelProps {
    teacher: TeacherSummaryItem;
    employeeData: DiuEmployeeRow[];
    onClose: () => void;
}

const getImageUrl = (link: string | undefined) => {
    if (!link) return '';
    const cleanLink = link.trim();
    if (cleanLink.includes('drive.google.com') || cleanLink.includes('docs.google.com')) {
        const idMatch = cleanLink.match(/\/d\/([^/]+)/) || cleanLink.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return cleanLink;
};

export const TeacherDetailsPanel: React.FC<TeacherDetailsPanelProps> = ({ teacher, employeeData, onClose }) => {
    const { updateDiuEmployeeData } = useSheetData();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    
    const employee = useMemo(() => {
        if (!employeeData) return undefined;
        const targetId = normalizeId(teacher.teacherId);
        return employeeData.find(e => normalizeId(e['Employee ID']) === targetId);
    }, [teacher, employeeData]);

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

    const handleSaveProfile = async () => {
        try {
            const newData = { ...formData };
            updateDiuEmployeeData(prev => prev.map(e => normalizeId(e['Employee ID']) === normalizeId(newData['Employee ID']) ? { ...e, ...newData } : e));
            setIsEditing(false);
            await submitSheetData('update', SHEET_NAMES.EMPLOYEE, newData, 'Employee ID', teacher.teacherId.trim(), REF_SHEET_ID);
        } catch (e) {
            alert("Failed to save changes.");
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(employee || {});
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[350px] lg:w-[400px] shrink-0 transition-all duration-300 animate-in fade-in">
            <div className="w-[95vw] h-[90vh] md:w-full md:h-full bg-white rounded-2xl md:rounded-none md:rounded-l-lg shadow-2xl flex flex-col overflow-hidden font-sans border-l border-gray-200">
                <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50 shrink-0 relative text-center shadow-sm">
                    <div className="absolute top-3 right-3 flex items-center space-x-1">
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 mb-2 ring-1 ring-gray-200">
                            {getImageUrl(formData.Photo) ? <img src={getImageUrl(formData.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><User className="w-10 h-10" /></div>}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 leading-tight">{formData['Employee Name'] || teacher.teacherName}</h2>
                        <p className="text-[10px] font-mono font-bold text-gray-400">ID: {teacher.teacherId}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 thin-scrollbar">
                    {isEditing ? (
                        <div className="space-y-4 pb-4">
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Name</label>
                                    <input type="text" value={formData['Employee Name'] || ''} onChange={(e) => setFormData({...formData, 'Employee Name': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Mobile</label>
                                        <input type="text" value={formData['Mobile'] || ''} onChange={(e) => setFormData({...formData, 'Mobile': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Email</label>
                                        <input type="text" value={formData['E-mail'] || ''} onChange={(e) => setFormData({...formData, 'E-mail': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Media & Links</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Photo Link</label>
                                    <input type="text" value={formData['Photo'] || ''} onChange={(e) => setFormData({...formData, 'Photo': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Facebook</label>
                                    <input type="text" value={formData['Facebook'] || ''} onChange={(e) => setFormData({...formData, 'Facebook': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">LinkedIn</label>
                                    <input type="text" value={formData['Linkedin'] || ''} onChange={(e) => setFormData({...formData, 'Linkedin': e.target.value})} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sections</span><span className="text-xl font-bold text-purple-600">{teacher.totalSections}</span></div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Credits</span><span className="text-xl font-bold text-blue-600">{teacher.creditLoad.toFixed(1)}</span></div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Students</span><span className="text-xl font-bold text-green-600">{teacher.studentCount}</span></div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-3 space-y-3">
                                <div className="flex items-center text-xs"><Phone className="w-3.5 h-3.5 text-gray-400 mr-2.5" /><span className="text-gray-700">{formData.Mobile || '-'}</span></div>
                                <div className="flex items-center text-xs"><Mail className="w-3.5 h-3.5 text-gray-400 mr-2.5" /><span className="text-gray-700 break-all">{formData['E-mail'] || '-'}</span></div>
                                {(formData.Facebook || formData.Linkedin) && (
                                    <div className="pt-2 border-t border-gray-100 flex gap-4">
                                        {formData.Facebook && <a href={formData.Facebook} target="_blank" rel="noreferrer" className="text-blue-600"><Facebook className="w-4 h-4" /></a>}
                                        {formData.Linkedin && <a href={formData.Linkedin} target="_blank" rel="noreferrer" className="text-blue-700"><Linkedin className="w-4 h-4" /></a>}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {isEditing && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-white flex space-x-3 shrink-0 pb-8 md:pb-4">
                        <button onClick={handleCancel} className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                            <Undo2 className="w-4 h-4 mr-2" /> Cancel
                        </button>
                        <button onClick={handleSaveProfile} className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md active:scale-95 transition-all">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
