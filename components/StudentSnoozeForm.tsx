import React, { useState, useEffect } from 'react';
import { Clock, Save, Loader2, X, MessageSquare, Calendar, RefreshCcw, CheckCircle2, UserCheck } from 'lucide-react';
import { StudentDataRow } from '../types';
import { SearchableSelect } from './EditEntryModal';

interface StudentSnoozeFormProps {
    student: StudentDataRow;
    isSaving: boolean;
    onSave: (data: { snoozeDate: string; remark: string; status?: string; contactedBy?: string }) => void;
    onClose: () => void;
    initialData?: any; 
    statusOptions?: string[];
    employeeOptions?: string[];
    isRegistration?: boolean;
}

export const StudentSnoozeForm: React.FC<StudentSnoozeFormProps> = ({
    student, isSaving, onSave, onClose, initialData, statusOptions = [], employeeOptions = [], isRegistration = false
}) => {
    const [snoozeDate, setSnoozeDate] = useState('');
    const [remark, setRemark] = useState('');
    const [status, setStatus] = useState('');
    const [contactedBy, setContactedBy] = useState('');

    useEffect(() => {
        if (initialData) {
            const dateStr = initialData['Re-follow up'] || '';
            const cleanDate = dateStr.split(' ')[0].split('T')[0];
            setSnoozeDate(cleanDate);
            setRemark(initialData.Remark || '');
            setStatus(initialData.Status || '');
            setContactedBy(initialData['Contacted By'] || '');
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!snoozeDate || !remark || !status || !contactedBy) return;

        onSave({ 
            snoozeDate, 
            remark, 
            status: status, 
            contactedBy: contactedBy
        });
    };

    const isInvalid = !snoozeDate || !remark || !status || !contactedBy;

    return (
        /* 
           Positioning updates: 
           - Left/Translate-X: Centers the form.
           - Top: Lowered from 180px to 280px to align below the History Log title area.
           - Width: Increased max-width to 440px (from 380px) and adjusted percentage for small screens.
        */
        <div className="absolute left-1/2 -translate-x-1/2 top-[280px] z-[170] w-[96%] max-w-[440px] bg-white border border-indigo-100 rounded-xl flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.25)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 max-h-[70vh]">
            <div className="flex flex-col border-b border-indigo-100/50 bg-indigo-50/30 rounded-t-xl shrink-0">
                <div className="flex items-center justify-between p-3.5 pb-2.5">
                    <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <h5 className="text-[10px] font-black text-indigo-800 uppercase tracking-tight">
                            Follow-up Setting — {student['Student ID']}
                        </h5>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <form id="snooze-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 thin-scrollbar">
                {/* Row 1: Status and Date side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Response Status *
                        </label>
                        <SearchableSelect 
                            value={status} 
                            onChange={setStatus} 
                            options={statusOptions} 
                            placeholder="Select Status..." 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Snooze Until *
                        </label>
                        <input 
                            required
                            type="date" 
                            value={snoozeDate} 
                            onChange={e => setSnoozeDate(e.target.value)} 
                            className="w-full px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Row 2: Follow-up By full width */}
                <div className="space-y-1.5 pt-1">
                    <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider flex items-center">
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Follow-up By *
                    </label>
                    <SearchableSelect 
                        value={contactedBy} 
                        onChange={setContactedBy} 
                        options={employeeOptions} 
                        placeholder="Search Personnel..." 
                    />
                </div>

                {/* Row 3: Remark full width with long text field */}
                <div className="space-y-1.5 pt-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Snooze Remark *
                    </label>
                    <textarea 
                        required
                        value={remark} 
                        onChange={e => setRemark(e.target.value)} 
                        rows={4}
                        className="w-full px-4 py-3 text-xs font-medium border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none bg-slate-50/30"
                        placeholder="Type detailed reason or follow-up notes here..."
                    />
                </div>
            </form>

            <div className="p-4 pt-3 flex space-x-3 shrink-0 border-t bg-slate-50/50 rounded-b-xl">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-xl uppercase hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button 
                    type="submit"
                    form="snooze-form"
                    disabled={isSaving || isInvalid} 
                    className="flex-[1.5] py-3 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                        <Save className="w-4 h-4 mr-1.5" />
                    )}
                    Log & Apply Snooze
                </button>
            </div>
        </div>
    );
};