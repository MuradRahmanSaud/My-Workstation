
import React, { useState, useEffect } from 'react';
import { DiuEmployeeRow } from '../types';
import { X, User, Phone, Mail, MapPin, Globe, Linkedin, Facebook, Copy, Check, Briefcase, Hash, Pencil, Save, Undo2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';
import { getImageUrl, isValEmpty } from '../views/EmployeeView';

interface EmployeeDetailsPanelProps {
    employee: DiuEmployeeRow;
    onClose: () => void;
    onUpdate: (data: DiuEmployeeRow) => void;
    fieldOptions?: Record<string, string[]>;
    isInline?: boolean; // New prop to handle nested usage
}

export const EmployeeDetailsPanel: React.FC<EmployeeDetailsPanelProps> = ({ 
    employee, 
    onClose, 
    onUpdate, 
    fieldOptions,
    isInline = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        setIsEditing(false);
        setFormData(employee || {});
    }, [employee]);

    const handleCopy = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const handleEditChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
        (async () => {
            try {
                let result = await submitSheetData('update', SHEET_NAMES.EMPLOYEE, formData, 'Employee ID', employee['Employee ID'].trim(), REF_SHEET_ID);
                const errorMsg = (result.message || result.error || '').toLowerCase();
                if (result.result === 'error' && (errorMsg.includes('not found') || errorMsg.includes('no match'))) {
                    result = await submitSheetData('add', SHEET_NAMES.EMPLOYEE, formData, 'Employee ID', employee['Employee ID'].trim(), REF_SHEET_ID, { insertMethod: 'first_empty' });
                }
                if (result.result !== 'success') {
                    alert("Failed to save changes to Google Sheet: " + (result.message || 'Unknown error'));
                }
            } catch (e) {
                alert("Network error while saving to Google Sheet.");
            }
        })();
    };

    const handleCancelEdit = () => {
        setFormData(employee);
        setIsEditing(false);
    };

    const imgUrl = getImageUrl(employee.Photo);
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (!isInline && e.target === e.currentTarget) onClose();
    };

    // Determine container classes based on mode
    const containerClasses = isInline
        ? "relative w-full h-full flex flex-col bg-white overflow-hidden"
        : "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:w-[320px] lg:w-[400px] shrink-0 transition-all duration-300 animate-in fade-in";

    const innerContentClasses = isInline
        ? "w-full h-full bg-white flex flex-col overflow-hidden font-sans"
        : "w-[95vw] h-[95vh] md:w-full md:h-full bg-white md:rounded-xl shadow-2xl flex flex-col overflow-hidden md:border md:border-gray-200 font-sans transform transition-all animate-in zoom-in-95 duration-200 md:animate-none";

    return (
        <div onClick={handleBackdropClick} className={containerClasses}>
            <div className={innerContentClasses}>
                <div className="px-5 py-4 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
                    <h3 className="text-base md:text-sm font-bold text-gray-800 uppercase tracking-wide">
                        {isEditing ? 'Edit Profile' : 'Profile Details'}
                    </h3>
                    <div className="flex items-center space-x-1">
                        {!isEditing && employee.Status !== 'Unregistered' && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2 md:p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-full text-gray-500 transition-colors"
                                title="Edit Employee"
                            >
                                <Pencil className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 md:p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X className="w-6 h-6 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar bg-slate-50/50">
                    {isEditing ? (
                        <div className="space-y-3 pt-1 pb-4">
                            {/* Basic Info */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Basic Information</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Name</label>
                                    <input type="text" value={formData['Employee Name'] || ''} onChange={(e) => handleEditChange('Employee Name', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Department</label>
                                        <SearchableSelect value={formData['Department'] || ''} onChange={(val) => handleEditChange('Department', val)} options={fieldOptions?.['Department'] || []} />
                                    </div>
                                    <div className="w-[40%]">
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Status</label>
                                        <SearchableSelect value={formData['Status'] || 'Active'} onChange={(val) => handleEditChange('Status', val)} options={fieldOptions?.['Status'] || ['Active', 'Inactive', 'On Leave']} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Group</label>
                                    <MultiSearchableSelect value={formData['Group Name'] || ''} onChange={(val) => handleEditChange('Group Name', val)} options={fieldOptions?.['Group Name'] || []} />
                                </div>
                            </div>

                            {/* Designation */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Designation</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Administrative</label>
                                        <SearchableSelect value={formData['Administrative Designation'] || ''} onChange={(val) => handleEditChange('Administrative Designation', val)} options={fieldOptions?.['Administrative Designation'] || []} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">Academic</label>
                                        <SearchableSelect value={formData['Academic Designation'] || ''} onChange={(val) => handleEditChange('Academic Designation', val)} options={fieldOptions?.['Academic Designation'] || []} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Contact</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Email</label>
                                    <input type="text" value={formData['E-mail'] || ''} onChange={(e) => handleEditChange('E-mail', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Mobile</label>
                                        <input type="text" value={formData['Mobile'] || ''} onChange={(e) => handleEditChange('Mobile', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">IP / Ext</label>
                                        <input type="text" value={formData['IP-Ext'] || ''} onChange={(e) => handleEditChange('IP-Ext', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Social & Media */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-1">Social & Media</h4>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Photo Link (Drive/Direct)</label>
                                    <div className="relative">
                                        <input type="text" value={formData['Photo'] || ''} onChange={(e) => handleEditChange('Photo', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none pr-8" placeholder="https://..." />
                                        <ImageIcon className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">Facebook Profile</label>
                                        <div className="relative">
                                            <input type="text" value={formData['Facebook'] || ''} onChange={(e) => handleEditChange('Facebook', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none pr-8" placeholder="facebook.com/..." />
                                            <Facebook className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">LinkedIn Profile</label>
                                        <div className="relative">
                                            <input type="text" value={formData['Linkedin'] || ''} onChange={(e) => handleEditChange('Linkedin', e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:border-blue-500 outline-none pr-8" placeholder="linkedin.com/in/..." />
                                            <Linkedin className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-blue-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 mb-3 relative group ring-1 ring-gray-200 shrink-0">
                                    {imgUrl ? <img src={imgUrl} alt={employee['Employee Name']} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : null}
                                    <div className={`w-full h-full flex items-center justify-center text-gray-300 ${imgUrl ? 'hidden' : ''}`}><User className="w-12 h-12" /></div>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2 px-2">{employee['Employee Name']}</h2>
                                <div className="space-y-0.5 w-full px-2">
                                    {employee['Academic Designation'] && <p className="text-sm text-blue-600 font-bold leading-tight">{employee['Academic Designation']}</p>}
                                    {employee['Administrative Designation'] && <p className={`text-sm leading-tight ${employee['Academic Designation'] ? 'text-gray-600 font-medium' : 'text-blue-600 font-bold'}`}>{employee['Administrative Designation']}</p>}
                                </div>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <div className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">{employee['Group Name'] || 'Employee'}</div>
                                    <div className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${employee.Status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{employee.Status}</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start group">
                                            <Briefcase className="w-4 h-4 text-gray-400 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Department</p><p className="text-sm font-medium text-gray-800 leading-tight mt-0.5">{employee.Department || '-'}</p></div>
                                        </div>
                                        <div className="flex items-start group">
                                            <Hash className="w-4 h-4 text-gray-400 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0" onClick={() => handleCopy(employee['Employee ID'], 'id')}><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide flex items-center">ID{copiedField === 'id' && <Check className="w-3 h-3 ml-1 text-green-600" />}</p><p className="text-sm font-mono font-medium text-gray-800 mt-0.5">{employee['Employee ID']}</p></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <h4 className="text-xs font-bold text-gray-900 mb-3 pb-1.5 border-b border-gray-100">Contact Information</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-start group">
                                            <Phone className="w-4 h-4 text-blue-500 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Mobile</p><p className="text-sm font-medium text-gray-800 mt-0.5">{employee.Mobile || '-'}</p></div>
                                        </div>
                                        <div className="flex items-start group">
                                            <Mail className="w-4 h-4 text-orange-500 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Email</p><p className="text-sm font-medium text-gray-800 break-all mt-0.5">{employee['E-mail'] || '-'}</p></div>
                                        </div>
                                        {!isValEmpty(employee['IP-Ext']) && (
                                            <div className="flex items-start group">
                                                <ExternalLink className="w-4 h-4 text-green-500 mt-1 mr-3 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">IP-Ext</p><p className="text-sm font-medium text-gray-800 mt-0.5">{employee['IP-Ext']}</p></div>
                                            </div>
                                        )}
                                        {(employee.Facebook || employee.Linkedin) && (
                                            <div className="pt-2 border-t border-gray-50 flex gap-4">
                                                {employee.Facebook && <a href={employee.Facebook} target="_blank" rel="noreferrer" className="flex items-center text-[10px] font-bold text-blue-600 hover:underline"><Facebook className="w-3.5 h-3.5 mr-1.5" /> Facebook</a>}
                                                {employee.Linkedin && <a href={employee.Linkedin} target="_blank" rel="noreferrer" className="flex items-center text-[10px] font-bold text-blue-700 hover:underline"><Linkedin className="w-3.5 h-3.5 mr-1.5" /> LinkedIn</a>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {isEditing && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-white flex space-x-3 shrink-0 pb-8 md:pb-4">
                        <button onClick={handleCancelEdit} className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
                            <Undo2 className="w-4 h-4 mr-2" /> Cancel
                        </button>
                        <button onClick={handleSave} className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all active:scale-95">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
