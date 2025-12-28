import React, { useState } from 'react';
import { MessageSquarePlus, Save, Loader2, X, Trash2, PowerOff, Clock } from 'lucide-react';
import { SearchableSelect } from './EditEntryModal';
import { StudentDataRow } from '../types';

interface FollowupFormProps {
    student: StudentDataRow;
    formData: any;
    setFormData: (val: any) => void;
    employeeOptions: string[];
    isSaving: boolean;
    onSave: (finalData?: any) => void; 
    onClose: () => void;
}

export const StudentFollowupForm: React.FC<FollowupFormProps> = ({
    student, formData, setFormData, employeeOptions, isSaving, onSave, onClose
}) => {
    const handleInternalSave = () => {
        // We ensure a default status if none is selected
        const finalData = { 
            ...formData, 
            Status: formData.Status || 'Call Busy'
        };
        
        onSave(finalData);
    };

    const isEdit = !!formData.uniqueid;

    return (
        <div className="absolute inset-x-3 top-12 bottom-3 z-[150] bg-white border border-rose-100 rounded-xl flex flex-col shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-top-2">
            <div className="flex flex-col space-y-3 border-b border-rose-100/50 p-4 shrink-0 bg-slate-50/30 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <MessageSquarePlus className="w-4 h-4 text-rose-500" />
                        <h5 className="text-[10px] font-black text-rose-700 uppercase tracking-tight">
                            {isEdit ? 'Update Conversation' : 'New Conversation'}
                        </h5>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-rose-100 rounded-full text-rose-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Student</span><span className="text-[11px] md:text-[13px] font-black text-slate-800 font-mono leading-tight truncate">{student.Mobile || '-'}</span></div>
                    <div className="flex flex-col border-l border-slate-100 pl-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Father</span><span className="text-[11px] md:text-[13px] font-black text-slate-800 font-mono leading-tight truncate">{student['Father Name'] || '-'}</span></div>
                    <div className="flex flex-col border-l border-slate-100 pl-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Mother</span><span className="text-[11px] md:text-[13px] font-black text-slate-800 font-mono leading-tight truncate">{student['Mother Name'] || '-'}</span></div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[9px] font-black text-rose-600 uppercase mb-1">Contact Date *</label>
                        <input type="date" value={formData.Date} onChange={e => setFormData({...formData, Date: e.target.value})} className="w-full px-2 py-2 text-xs border rounded shadow-sm font-bold focus:ring-1 focus:ring-rose-200 outline-none" />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-rose-600 uppercase mb-1">Contacted By</label>
                        <SearchableSelect value={formData['Contacted By']} onChange={v => setFormData({...formData, 'Contacted By': v})} options={employeeOptions} placeholder="Select employee" />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[9px] font-black text-rose-600 uppercase mb-1">Response Status *</label>
                        <SearchableSelect value={formData.Status} onChange={v => setFormData({...formData, Status: v})} options={['Call Busy', 'Switched Off', 'Not Reachable', 'Department Change', 'University Change']} placeholder="Select status" />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-rose-600 uppercase mb-1">Re-follow up Date</label>
                        <input type="date" value={formData['Re-follow up']} onChange={e => setFormData({...formData, 'Re-follow up': e.target.value})} className="w-full px-2 py-2 text-xs border rounded shadow-sm font-bold focus:ring-1 focus:ring-rose-200 outline-none" />
                    </div>
                </div>
                
                <div>
                    <label className="block text-[9px] font-black text-rose-600 uppercase mb-1">Discussion Remark *</label>
                    <textarea 
                        value={formData.Remark} 
                        onChange={e => setFormData({...formData, Remark: e.target.value})} 
                        rows={3} 
                        className="w-full px-3 py-2 text-xs border rounded shadow-sm font-medium resize-none focus:ring-1 focus:ring-rose-200 outline-none" 
                        placeholder="What did you talk about?" 
                    />
                </div>
            </div>
            
            <div className="p-4 pt-3 flex space-x-2 shrink-0 border-t bg-slate-50/50">
                <button onClick={onClose} className="flex-1 py-2.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg uppercase hover:bg-slate-50 transition-colors">Cancel</button>
                <button 
                    onClick={handleInternalSave} 
                    disabled={isSaving} 
                    className="flex-[1.5] py-2.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md flex items-center justify-center uppercase transition-all active:scale-95"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} {isEdit ? 'Update Record' : 'Save Record'}
                </button>
            </div>
        </div>
    );
};