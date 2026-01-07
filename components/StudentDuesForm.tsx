
import React, { useState, useEffect, useMemo } from 'react';
import { Banknote, Save, Loader2, X, Calendar, UserCheck, Layers, RefreshCcw, AlertTriangle, Clock, MessageSquare, Phone } from 'lucide-react';
import { SearchableSelect } from './EditEntryModal';
import { StudentDataRow } from '../types';

interface StudentDuesFormProps {
    student: StudentDataRow;
    employeeOptions: string[];
    isSaving: boolean;
    onSave: (data: any) => void;
    onClose: () => void;
    initialData?: any; // Added for edit support
}

export const StudentDuesForm: React.FC<StudentDuesFormProps> = ({
    student, employeeOptions, isSaving, onSave, onClose, initialData
}) => {
    const [semester, setSemester] = useState('Spring');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [period, setPeriod] = useState('Registration');
    const [amount, setAmount] = useState('');
    const [approver, setApprover] = useState('');
    
    // New Snooze fields
    const [snoozeUntil, setSnoozeUntil] = useState('');
    const [snoozeRemark, setSnoozeRemark] = useState('');

    useEffect(() => {
        if (initialData) {
            // Parse semester and year from Target Semester field if exists
            if (initialData['Target Semester']) {
                const parts = initialData['Target Semester'].split(' ');
                if (parts.length >= 2) {
                    setSemester(parts[0]);
                    setYear(parts[1]);
                }
            }
            // Status field stores "BDT XXX", extract number
            if (initialData.Status) {
                const match = initialData.Status.match(/\d+/);
                if (match) setAmount(match[0]);
            }
            // Remark field often contains "Dues for [Period]...", extract period
            const periodMatch = (initialData as any)['Exam Period'];
            if (periodMatch) {
                setPeriod(periodMatch);
            } else if (initialData.Remark) {
                const match = initialData.Remark.match(/Dues for (Registration|Mid-Term|Final-Term)/i);
                if (match) setPeriod(match[1]);
            }
            setApprover(initialData['Contacted By'] || '');
        } else {
            setAmount(student.Dues && !student.Dues.includes(' ;; ') ? student.Dues : '');
        }
    }, [initialData, student.Dues]);

    // Duplicate Check Logic
    const isDuplicate = useMemo(() => {
        const rawDues = student['Dues'] || '';
        if (!rawDues || !rawDues.includes(' ;; ')) return false;

        const currentTarget = `${semester} ${year}`;
        const entries = rawDues.split(' || ').map(s => s.trim()).filter(Boolean);

        return entries.some((entry) => {
            const fields = entry.split(' ;; ').map(f => f.trim());
            // Format in Dues column: [Date, Amount, Period, TargetSemester, ApproverId, HistoryRemark]
            const entryPeriod = fields[2];
            const entrySemesterYear = fields[3];

            const match = entryPeriod === period && entrySemesterYear === currentTarget;
            
            if (match && initialData) {
                // If editing, ignore the specific record being edited
                const initialSemYear = initialData['Target Semester'];
                const initialPeriod = (initialData as any)['Exam Period'];
                if (initialSemYear === currentTarget && initialPeriod === period) {
                    return false;
                }
            }
            return match;
        });
    }, [semester, year, period, student, initialData]);

    const semesters = ['Spring', 'Summer', 'Fall'];
    const periods = ['Registration', 'Mid-Term', 'Final-Term'];

    const handleInternalSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (isDuplicate) return;
        
        const finalData = {
            semester,
            year,
            period,
            amount,
            approver,
            snoozeDate: snoozeUntil, // Send snooze info to save logic
            snoozeRemark: snoozeRemark,
            historyRemark: `Dues for ${period} (${semester} ${year}) set to ${amount} BDT. Sent to ${approver} for approval.`
        };
        onSave(finalData);
    };

    return (
        <div className="absolute inset-x-3 top-12 bottom-3 z-[160] bg-white border border-amber-100 rounded-xl flex flex-col shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-top-2">
            <div className="flex flex-col space-y-3 border-b border-amber-100/50 p-4 shrink-0 bg-amber-50/30 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                        <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                        <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-tight truncate">
                            {initialData ? 'Edit Dues Entry' : 'New Dues Entry'} — {student['Student Name']}
                        </h5>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded-full text-amber-400 transition-colors shrink-0 ml-2">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Contact Info */}
                <div className="grid grid-cols-3 gap-2 bg-white/60 p-2 rounded-lg border border-amber-100/50">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">Student Mob</span>
                        <span className="text-[11px] font-black text-slate-800 font-mono leading-tight truncate">{student.Mobile || '-'}</span>
                    </div>
                    <div className="flex flex-col border-l border-amber-100 pl-2">
                        <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">Father Mob</span>
                        <span className="text-[11px] font-black text-slate-800 font-mono leading-tight truncate">{student['Father Mobile'] || '-'}</span>
                    </div>
                    <div className="flex flex-col border-l border-amber-100 pl-2">
                        <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">Mother Mob</span>
                        <span className="text-[11px] font-black text-slate-800 font-mono leading-tight truncate">{student['Mother Mobile'] || '-'}</span>
                    </div>
                </div>
            </div>
            
            <form onSubmit={handleInternalSave} className="flex-1 overflow-y-auto p-5 space-y-5 thin-scrollbar">
                {isDuplicate && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 animate-in shake duration-300">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-red-700 leading-tight">
                            Duplicate Entry Detected: A record for <span className="underline">{semester} {year}</span> (<span className="underline">{period}</span>) already exists in this student's history.
                        </p>
                    </div>
                )}

                {/* Unified Academic Session & Period Selection */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                    <label className="block text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-2" /> Academic Session & Exam Period
                    </label>
                    
                    {/* Primary Semester Tabs */}
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        {semesters.map(sem => (
                            <button
                                key={sem}
                                type="button"
                                onClick={() => setSemester(sem)}
                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all ${semester === sem ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {sem}
                            </button>
                        ))}
                    </div>

                    {/* Secondary Period Tabs + Year integrated */}
                    <div className="flex items-center space-x-2">
                        <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm flex-1">
                            {periods.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPeriod(p)}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${period === p ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="w-20 shrink-0">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Year"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-lg shadow-sm font-black focus:ring-1 focus:ring-amber-200 focus:border-amber-500 outline-none text-center bg-white text-slate-800"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Amount & Approver Grid - Adjusted for narrower Amount field */}
                <div className="grid grid-cols-[2fr_3fr] gap-4">
                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="block text-[9px] font-black text-amber-600 uppercase tracking-wider">Dues Amount (BDT)</label>
                        <div className="relative">
                            <input 
                                required
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                className="w-full px-3 py-2.5 text-[13px] font-black text-red-600 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all"
                                placeholder="0.00" 
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase">BDT</span>
                        </div>
                    </div>

                    {/* Approver */}
                    <div className="space-y-2">
                        <label className="block text-[9px] font-black text-amber-600 uppercase tracking-wider flex items-center">
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Send for Approval to
                        </label>
                        <SearchableSelect 
                            value={approver} 
                            onChange={setApprover} 
                            options={employeeOptions} 
                            placeholder="Search employee..." 
                        />
                    </div>
                </div>

                {/* Optional Snooze Section */}
                <div className="pt-2 border-t border-slate-100 space-y-4">
                    <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        <h4 className="text-[10px] font-black uppercase tracking-wider">Follow-up Setting (Optional)</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Snooze Until</label>
                            <input 
                                type="date" 
                                value={snoozeUntil} 
                                onChange={e => setSnoozeUntil(e.target.value)} 
                                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-indigo-50/20"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Snooze Remark</label>
                            <textarea 
                                value={snoozeRemark} 
                                onChange={e => setSnoozeRemark(e.target.value)} 
                                rows={1}
                                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none bg-indigo-50/20"
                                placeholder="Follow-up reason..."
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
                    disabled={isSaving || isDuplicate || !amount || !approver} 
                    className="flex-[1.5] py-3 text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : initialData ? (
                        <RefreshCcw className="w-4 h-4 mr-2" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {initialData ? 'Update Dues' : 'Save Dues Info'}
                </button>
            </div>
        </div>
    );
};
