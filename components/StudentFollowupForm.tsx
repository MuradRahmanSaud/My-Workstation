import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, Save, Loader2, X, Calendar, Clock, CheckCircle2, UserCheck } from 'lucide-react';
import { SearchableSelect } from './EditEntryModal';
import { StudentDataRow } from '../types';

interface FollowupFormProps {
    student: StudentDataRow;
    formData: any;
    setFormData: (val: any) => void;
    employeeOptions: string[];
    statusOptions: string[];
    isSaving: boolean;
    onSave: (finalData?: any) => void; 
    onClose: () => void;
    studentSemester?: string; // Enrollment semester
}

export const StudentFollowupForm: React.FC<FollowupFormProps> = ({
    student, formData, setFormData, employeeOptions, statusOptions, isSaving, onSave, onClose, studentSemester
}) => {
    const [targetSem, setTargetSem] = useState('Spring');
    const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString());
    
    // Snooze States
    const [snoozeUntil, setSnoozeUntil] = useState('');
    const [snoozeRemark, setSnoozeRemark] = useState('');

    useEffect(() => {
        if (formData['Target Semester']) {
            const parts = formData['Target Semester'].split(' ');
            if (parts.length >= 2) {
                setTargetSem(parts[0]);
                setTargetYear(parts[1]);
            }
        } else if (studentSemester) {
            // Default to Enrollment Semester if no target is currently set
            const parts = studentSemester.split(' ');
            if (parts.length >= 2) {
                setTargetSem(parts[0]);
                setTargetYear(parts[1]);
            }
        }
    }, [formData, studentSemester]);

    const handleInternalSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalData = { 
            ...formData, 
            'Target Semester': `${targetSem} ${targetYear}`,
            'Re-follow up': snoozeUntil, 
            Remark: snoozeRemark || formData.Status,
            snoozeDate: snoozeUntil, 
            snoozeRemark: snoozeRemark
        };
        onSave(finalData);
    };

    const semesters = ['Spring', 'Summer', 'Fall'];
    const isFormInvalid = !formData.Status || !formData['Contacted By'];

    // Specific categories that should not show the target session selector
    const isDuesOrReg = formData.Category === 'Dues Follow up' || formData.Category === 'Registration Follow up';

    return (
        <div className="absolute inset-x-3 top-12 bottom-3 z-[150] bg-white border border-rose-100 rounded-xl flex flex-col shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-top-2">
            <div className="flex flex-col space-y-3 border-b border-rose-100/50 p-4 shrink-0 bg-slate-50/30 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                        <MessageSquarePlus className="w-4 h-4 text-rose-500 shrink-0" />
                        <h5 className="text-[10px] font-black text-rose-700 uppercase tracking-tight truncate">
                            Student Follow-up — {student['Student Name']}
                        </h5>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-rose-100 rounded-full text-rose-400 transition-colors shrink-0 ml-2">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <form onSubmit={handleInternalSave} className="flex-1 overflow-y-auto p-5 space-y-6 thin-scrollbar">
                
                {/* PART 1: Academic Session (Target) - Hidden for Dues/Registration */}
                {!isDuesOrReg && (
                    <div className="space-y-3 bg-rose-50/30 p-4 rounded-xl border border-rose-100/50 shadow-inner">
                        <label className="block text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-2" /> Academic Session (Target)
                        </label>
                        <div className="flex items-center space-x-3">
                            <div className="flex bg-white p-1 rounded-lg border border-rose-200 shadow-sm flex-1">
                                {semesters.map(sem => (
                                    <button
                                        key={sem}
                                        type="button"
                                        onClick={() => setTargetSem(sem)}
                                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${targetSem === sem ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {sem}
                                    </button>
                                ))}
                            </div>
                            <div className="w-24 shrink-0">
                                <input 
                                    type="text" 
                                    placeholder="Year"
                                    value={targetYear}
                                    onChange={(e) => setTargetYear(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-rose-200 rounded-lg shadow-sm font-black focus:ring-1 focus:ring-rose-300 outline-none text-center bg-white"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <h4 className="text-[10px] font-black uppercase tracking-wider">Follow-up Setting</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-rose-600 uppercase tracking-wider flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Response Status *
                            </label>
                            <SearchableSelect 
                                value={formData.Status} 
                                onChange={v => setFormData({...formData, Status: v})} 
                                options={statusOptions} 
                                placeholder="Select status..." 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Follow-up By *
                            </label>
                            <SearchableSelect 
                                value={formData['Contacted By']} 
                                onChange={v => setFormData({...formData, 'Contacted By': v})} 
                                options={employeeOptions} 
                                placeholder="Search personnel..." 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Snooze Until</label>
                            <input 
                                type="date" 
                                value={snoozeUntil} 
                                onChange={e => setSnoozeUntil(e.target.value)} 
                                className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-indigo-50/20"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Snooze Remark</label>
                            <textarea 
                                value={snoozeRemark} 
                                onChange={e => setSnoozeRemark(e.target.value)} 
                                rows={1}
                                className="w-full px-3 py-2.5 text-xs font-medium border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none bg-indigo-50/20"
                                placeholder="Reason for follow-up..."
                            />
                        </div>
                    </div>
                </div>
            </form>
            
            <div className="p-4 pt-3 flex space-x-2 shrink-0 border-t bg-slate-50/50 rounded-b-xl">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-[10px] font-black text-slate-500 bg-white border border-slate-200 rounded-xl uppercase hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button 
                    onClick={handleInternalSave} 
                    disabled={isSaving || isFormInvalid} 
                    className="flex-[1.5] py-3 text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Follow-up Info
                </button>
            </div>
        </div>
    );
};
