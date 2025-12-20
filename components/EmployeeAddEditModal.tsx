
import React, { useState, useEffect } from 'react';
import { X, Save, Undo2, User, Hash, Briefcase, Mail, Phone, ImageIcon, Facebook, Linkedin, ExternalLink } from 'lucide-react';
import { DiuEmployeeRow } from '../types';
import { SearchableSelect, MultiSearchableSelect } from './EditEntryModal';
import { submitSheetData } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

interface EmployeeAddEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    initialData?: Partial<DiuEmployeeRow>;
    fieldOptions?: Record<string, string[]>;
    onSuccess: (data: DiuEmployeeRow) => void;
}

export const EmployeeAddEditModal: React.FC<EmployeeAddEditModalProps> = ({
    isOpen,
    onClose,
    mode,
    initialData,
    fieldOptions,
    onSuccess
}) => {
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || {
                'Employee ID': '',
                'Employee Name': '',
                'Department': '',
                'Status': 'Active',
                'Group Name': 'Teacher',
                'Administrative Designation': '',
                'Academic Designation': '',
                'E-mail': '',
                'Mobile': '',
                'IP-Ext': '',
                'Photo': '',
                'Facebook': '',
                'Linkedin': ''
            });
        }
    }, [isOpen, initialData]);

    const handleChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = { ...formData };
        const keyColumn = 'Employee ID';
        const keyValue = mode === 'edit' ? initialData?.[keyColumn] : undefined;
        const apiAction = mode === 'edit' ? 'update' : 'add';

        try {
            // Persist to API first to avoid race conditions and handle the single source of truth
            let result = await submitSheetData(apiAction, SHEET_NAMES.EMPLOYEE, payload, keyColumn, keyValue, REF_SHEET_ID);
            
            // If update fails because record not found, try adding it
            if (mode === 'edit' && result.result === 'error' && (result.message || '').toLowerCase().includes('not found')) {
                result = await submitSheetData('add', SHEET_NAMES.EMPLOYEE, payload, keyColumn, undefined, REF_SHEET_ID);
            }

            // Only notify success if the API call didn't error out significantly
            if (result.result !== 'error') {
                onSuccess(payload as DiuEmployeeRow);
                onClose();
            } else {
                console.error("API Save failed", result.message);
                alert("Failed to save employee to the database.");
            }
        } catch (error) {
            console.error("Employee save error:", error);
            alert("An error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <User className="w-5 h-5 mr-2 text-blue-600" />
                            {mode === 'add' ? 'Register New Employee' : 'Edit Employee Profile'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Employee Directory</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-white thin-scrollbar">
                    <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Section: Basic Identity */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 text-blue-600 border-b border-blue-50 pb-1.5">
                                <Hash className="w-3.5 h-3.5" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">Identity</h4>
                            </div>
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Employee ID</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={formData['Employee ID'] || ''} 
                                        onChange={(e) => handleChange('Employee ID', e.target.value)} 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono font-bold"
                                        placeholder="e.g. 71000..."
                                        disabled={mode === 'edit'}
                                    />
                                </div>
                                <div className="col-span-8">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Full Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={formData['Employee Name'] || ''} 
                                        onChange={(e) => handleChange('Employee Name', e.target.value)} 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold"
                                        placeholder="Enter full name"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Organization */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center space-x-2 text-indigo-600 border-b border-indigo-50 pb-1.5">
                                <Briefcase className="w-3.5 h-3.5" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">Organization</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Department</label>
                                    <SearchableSelect 
                                        value={formData['Department'] || ''} 
                                        onChange={(val) => handleChange('Department', val)} 
                                        options={fieldOptions?.['Department'] || []} 
                                        placeholder="Select Dept"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Status</label>
                                    <SearchableSelect 
                                        value={formData['Status'] || ''} 
                                        onChange={(val) => handleChange('Status', val)} 
                                        options={fieldOptions?.['Status'] || ['Active', 'Inactive', 'On Leave']} 
                                        placeholder="Set Status"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Group</label>
                                    <MultiSearchableSelect 
                                        value={formData['Group Name'] || ''} 
                                        onChange={(val) => handleChange('Group Name', val)} 
                                        options={fieldOptions?.['Group Name'] || []} 
                                        placeholder="Select Groups"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Designation */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center space-x-2 text-purple-600 border-b border-purple-50 pb-1.5">
                                <Briefcase className="w-3.5 h-3.5" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">Designation</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Administrative</label>
                                    <SearchableSelect 
                                        value={formData['Administrative Designation'] || ''} 
                                        onChange={(val) => handleChange('Administrative Designation', val)} 
                                        options={fieldOptions?.['Administrative Designation'] || []} 
                                        placeholder="e.g. Dean, Head"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Academic</label>
                                    <SearchableSelect 
                                        value={formData['Academic Designation'] || ''} 
                                        onChange={(val) => handleChange('Academic Designation', val)} 
                                        options={fieldOptions?.['Academic Designation'] || []} 
                                        placeholder="e.g. Professor"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Contact */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center space-x-2 text-orange-600 border-b border-orange-50 pb-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">Contact Details</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-6">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">E-mail</label>
                                    <input 
                                        type="email" 
                                        value={formData['E-mail'] || ''} 
                                        onChange={(e) => handleChange('E-mail', e.target.value)} 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="example@diu.edu.bd"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Mobile</label>
                                    <input 
                                        type="text" 
                                        value={formData['Mobile'] || ''} 
                                        onChange={(e) => handleChange('Mobile', e.target.value)} 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="01xxxxxxxxx"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">IP-Ext</label>
                                    <input 
                                        type="text" 
                                        value={formData['IP-Ext'] || ''} 
                                        onChange={(e) => handleChange('IP-Ext', e.target.value)} 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Ext"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Links */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center space-x-2 text-emerald-600 border-b border-emerald-50 pb-1.5">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider">Social & Photo</h4>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Photo URL (Drive/Direct Link)</label>
                                    <input 
                                        type="text" 
                                        value={formData['Photo'] || ''} 
                                        onChange={(e) => handleChange('Photo', e.target.value)} 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">Facebook</label>
                                        <div className="relative">
                                            <input type="text" value={formData['Facebook'] || ''} onChange={e => handleChange('Facebook', e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 pl-10 focus:border-blue-500 outline-none" />
                                            <Facebook className="absolute left-3 top-2.5 w-4 h-4 text-blue-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tight">LinkedIn</label>
                                        <div className="relative">
                                            <input type="text" value={formData['Linkedin'] || ''} onChange={e => handleChange('Linkedin', e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 pl-10 focus:border-blue-500 outline-none" />
                                            <Linkedin className="absolute left-3 top-2.5 w-4 h-4 text-blue-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0 pb-8 md:pb-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-all flex items-center shadow-sm"
                    >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="employee-form"
                        disabled={isSaving}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {mode === 'add' ? 'Register Employee' : 'Update Profile'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
