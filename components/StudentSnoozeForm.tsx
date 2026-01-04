
import React, { useState, useEffect } from 'react';
import { Clock, Save, Loader2, X, MessageSquare, Calendar, RefreshCcw } from 'lucide-react';
import { StudentDataRow } from '../types';

interface StudentSnoozeFormProps {
    student: StudentDataRow;
    isSaving: boolean;
    onSave: (data: { snoozeDate: string; remark: string }) => void;
    onClose: () => void;
    initialData?: any; // Added to support editing
}

export const StudentSnoozeForm: React.FC<StudentSnoozeFormProps> = ({
    student, isSaving, onSave, onClose, initialData
}) => {
    const [snoozeDate, setSnoozeDate] = useState('');
    const [remark, setRemark] = useState('');

    useEffect(() => {
        if (initialData) {
            // Re-follow up date is at index 3 in the remark string, but passed as an object here
            const dateStr = initialData['Re-follow up'] || '';
            const cleanDate = dateStr.split(' ')[0].split('T')[0];
            setSnoozeDate(cleanDate);
            setRemark(initialData.Remark || '');
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!snoozeDate || !remark) return;
        onSave({ snoozeDate, remark });
    };

    return (
        <div className="absolute inset-x-3 top-1/4 z-[170] bg-white border border-indigo-100 rounded-xl flex flex-col shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-indigo-100/50 p-4 shrink-0 bg-indigo-50/30 rounded-t-xl">
                <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h5 className="text-[10px] font-black text-indigo-800 uppercase tracking-tight">
                        {initialData ? 'Edit Snooze Dues' : 'Snooze Dues'} — {student['Student Name']}
                    </h5>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div>
                    <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-1.5 flex items-center">
                        <Calendar className="w-3 h-3 mr-1.5" /> Snooze Until (Date)
                    </label>
                    <input 
                        required
                        type="date" 
                        value={snoozeDate} 
                        onChange={e => setSnoozeDate(e.target.value)} 
                        className="w-full px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-1.5 flex items-center">
                        <MessageSquare className="w-3 h-3 mr-1.5" /> Snooze Remark
                    </label>
                    <textarea 
                        required
                        value={remark} 
                        onChange={e => setRemark(e.target.value)} 
                        rows={3}
                        className="w-full px-4 py-2.5 text-xs font-medium border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none"
                        placeholder="Why are you snoozing this?"
                    />
                </div>

                <div className="flex space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-xl uppercase hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={isSaving || !snoozeDate || !remark} 
                        className="flex-[1.5] py-2.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : initialData ? (
                            <RefreshCcw className="w-4 h-4 mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {initialData ? 'Update Snooze' : 'Apply Snooze'}
                    </button>
                </div>
            </form>
        </div>
    );
};
