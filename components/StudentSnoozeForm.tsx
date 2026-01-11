import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Save, Loader2, X, MessageSquare, Calendar, RefreshCcw, CheckCircle2, UserCheck, Phone, Banknote, Plus, Check, Search, GraduationCap, ShieldCheck, FileText, ClipboardList, Tags } from 'lucide-react';
import { StudentDataRow } from '../types';
import { SearchableSelect } from './EditEntryModal';

interface StudentSnoozeFormProps {
    student: StudentDataRow;
    isSaving: boolean;
    onSave: (data: { snoozeDate: string; remark: string; status?: string; contactedBy?: string; amount?: string; defenseData?: any; isTrackingUpdate?: boolean; targetSemester?: string }) => void;
    onClose: () => void;
    initialData?: any; 
    statusOptions?: string[];
    employeeOptions?: string[];
    isRegistration?: boolean;
    isDues?: boolean;
    isDefense?: boolean;
    defenseMode?: 'tracking' | 'snooze'; 
    studentSemester?: string; // Enrollment semester
}

export const StudentSnoozeForm: React.FC<StudentSnoozeFormProps> = ({
    student, isSaving, onSave, onClose, initialData, statusOptions = [], employeeOptions = [], isRegistration = false, isDues = false, isDefense = false, defenseMode = 'snooze', studentSemester
}) => {
    const [snoozeDate, setSnoozeDate] = useState('');
    const [remark, setRemark] = useState('');
    const [status, setStatus] = useState('');
    const [contactedBy, setContactedBy] = useState('');
    const [amount, setAmount] = useState('');
    
    // Target Semester Selection (State remains but UI will be hidden for Dues/Registration)
    const [targetSem, setTargetSem] = useState('Spring');
    const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString());
    
    // Defense Specific States
    const [regFormDate, setRegFormDate] = useState('');
    const [defenseSupervisor, setDefenseSupervisor] = useState('');
    const [defenseType, setDefenseType] = useState('Thesis');
    const [reportTitle, setReportTitle] = useState('');
    const [libraryClearance, setLibraryClearance] = useState('Pending');
    
    // Manage dynamic status tabs
    const [localStatusOptions, setLocalStatusOptions] = useState<string[]>([]);
    const [isAddingStatus, setIsAddingStatus] = useState(false);
    const [newStatusValue, setNewStatusValue] = useState('');

    const [defenseTypeOptions, setDefenseTypeOptions] = useState(['Thesis', 'Project', 'Internship']);
    const [isAddingDefType, setIsAddingDefType] = useState(false);
    const [newDefTypeValue, setNewDefTypeValue] = useState('');

    const defenseStatusOptions = ['On going', 'Pre-defense', 'Final Defense', 'Grade Sheet', 'Degree'];
    const semesterOptions = ['Spring', 'Summer', 'Fall'];

    useEffect(() => {
        if (statusOptions.length > 0) {
            setLocalStatusOptions(statusOptions);
        }
    }, [statusOptions]);

    useEffect(() => {
        // Handle Target Semester Defaulting
        if (initialData && initialData['Target Semester']) {
            const parts = initialData['Target Semester'].split(' ');
            if (parts.length >= 2) {
                setTargetSem(parts[0]);
                setTargetYear(parts[1]);
            }
        } else if (studentSemester) {
            // Default to Enrollment Semester if no initial data
            const parts = studentSemester.split(' ');
            if (parts.length >= 2) {
                setTargetSem(parts[0]);
                setTargetYear(parts[1]);
            }
        }

        // Parse existing packed defense status if available
        const rawDefStatus = student['Defense Status'] || '';
        if (isDefense && rawDefStatus.includes(' ;; ')) {
            const fields = rawDefStatus.split(' ;; ').map(f => f.trim());
            setRegFormDate(fields[0] || '');
            setStatus(fields[1] || 'On going');
            setDefenseSupervisor(fields[2] || '');
            setDefenseType(fields[3] || 'Thesis');
            setReportTitle(fields[4] || '');
            setLibraryClearance(fields[5] || 'Pending');
        } else if (isDefense) {
            setStatus(rawDefStatus || 'On going');
            setDefenseSupervisor(student['Defense Supervisor'] || '');
            setDefenseType(student['Defense Type'] || 'Thesis');
            setRegFormDate(student['Defense Registration'] || '');
        }

        if (initialData) {
            const dateStr = initialData['Re-follow up'] || '';
            const cleanDate = dateStr.split(' ')[0].split('T')[0];
            setSnoozeDate(cleanDate);
            setRemark(initialData.Remark || '');
            setContactedBy(initialData['Contacted By'] || '');
            
            if (isDues) {
                const rawStatus = initialData.Status || '';
                const match = String(rawStatus).match(/\d+/);
                setAmount(match ? match[0] : '');
                const semanticStatus = initialData.SemanticStatus || '';
                if (semanticStatus.includes(':')) {
                    setStatus(semanticStatus.split(':')[1].trim());
                } else {
                    setStatus(rawStatus.startsWith('BDT') ? 'Pending' : rawStatus);
                }
            }
        }
    }, [initialData, isDues, isDefense, student, studentSemester]);

    const handleAddDefType = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDefTypeValue.trim() && !defenseTypeOptions.includes(newDefTypeValue.trim())) {
            setDefenseTypeOptions(prev => [...prev, newDefTypeValue.trim()].sort());
            setDefenseType(newDefTypeValue.trim());
            setNewDefTypeValue('');
            setIsAddingDefType(false);
        }
    };

    const handleAddStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatusValue.trim() && !localStatusOptions.includes(newStatusValue.trim())) {
            const newVal = newStatusValue.trim();
            setLocalStatusOptions(prev => [...prev, newVal].sort());
            setStatus(newVal);
            setNewStatusValue('');
            setIsAddingStatus(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isDefense && defenseMode === 'tracking') {
            if (!regFormDate || !defenseSupervisor || !status) return;
            onSave({
                snoozeDate: '', 
                remark: '', 
                isTrackingUpdate: true,
                defenseData: {
                    regFormDate,
                    defenseStatus: status,
                    defenseSupervisor,
                    defenseType,
                    reportTitle,
                    libraryClearance
                }
            });
            return;
        }

        if (!snoozeDate || !status || !contactedBy) return;

        onSave({ 
            snoozeDate, 
            remark, 
            status: status,
            contactedBy: contactedBy,
            amount: isDues ? amount : undefined,
            targetSemester: `${targetSem} ${targetYear}`
        });
    };

    const isTrackingMode = isDefense && defenseMode === 'tracking';
    const isInvalid = isTrackingMode 
        ? (!regFormDate || !defenseSupervisor || !status)
        : (!snoozeDate || !status || !contactedBy || (isDues && !amount));

    return (
        <div className="absolute left-1/2 -translate-x-1/2 top-[215px] bottom-2 z-[170] w-[calc(100%-24px)] max-w-[600px] bg-white border border-indigo-100 rounded-xl flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.35)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex flex-col border-b border-indigo-100/50 bg-indigo-50/30 rounded-t-xl shrink-0">
                <div className="flex items-center justify-between p-3 pb-2">
                    <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <h5 className="text-[9px] font-black text-indigo-800 uppercase tracking-tight">
                            {isTrackingMode ? 'Defense Tracking Details' : isDues ? 'Dues Follow-up' : isRegistration ? 'Registration Follow-up' : 'Snooze Action'} — {student['Student ID']}
                        </h5>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            
            <form id="snooze-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden p-4 bg-white/50">
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2 mb-4 shadow-inner shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter flex items-center">
                            <Phone className="w-2 h-2 mr-1" /> Student
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 font-mono leading-tight truncate">{student['Mobile'] || '-'}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-2">
                        <span className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter">Father Mob</span>
                        <span className="text-[10px] font-bold text-slate-700 font-mono leading-tight truncate">{student['Father Mobile'] || '-'}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-2">
                        <span className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter">Mother Mob</span>
                        <span className="text-[10px] font-bold text-slate-700 font-mono leading-tight truncate">{student['Mother Mobile'] || '-'}</span>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar space-y-4">
                    {!isTrackingMode ? (
                        <>
                            {(isDues || isRegistration) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Left Column */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider flex items-center">
                                                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Follow-up By *
                                            </label>
                                            <SearchableSelect 
                                                value={contactedBy} 
                                                onChange={setContactedBy} 
                                                options={employeeOptions} 
                                                placeholder="Select Personnel..." 
                                            />
                                        </div>
                                        
                                        {isDues && (
                                            <div className="space-y-1">
                                                <label className="block text-[9px] font-black text-amber-600 uppercase tracking-wider flex items-center">
                                                    <Banknote className="w-3.5 h-3.5 mr-1.5" /> Dues Amount (BDT) *
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        value={amount}
                                                        onChange={e => setAmount(e.target.value)}
                                                        className="w-full pl-10 pr-3 py-2 text-[13px] font-black text-red-600 border border-slate-200 rounded-lg shadow-sm focus:ring-1 focus:ring-amber-500 outline-none transition-all bg-white"
                                                        placeholder="0"
                                                    />
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-[9px]">BDT</div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5" /> Snooze Until *
                                            </label>
                                            <input 
                                                required
                                                type="date" 
                                                value={snoozeDate} 
                                                onChange={e => setSnoozeDate(e.target.value)} 
                                                className="w-full px-3 py-2 text-[11px] font-bold border border-slate-200 rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all h-[38px] bg-white"
                                            />
                                        </div>
                                    </div>
                                    {/* Right Column */}
                                    <div className="space-y-4">
                                        <div className="space-y-1 h-full flex flex-col">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                                <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Remark / Note
                                            </label>
                                            <textarea 
                                                value={remark} 
                                                onChange={e => setRemark(e.target.value)} 
                                                className={`w-full px-3 py-2 text-[11px] font-medium border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none bg-white flex-1 ${isRegistration ? 'h-[100px] md:h-[102px]' : 'h-[100px] md:h-[160px]'}`}
                                                placeholder="Type interaction notes here..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider flex items-center">
                                                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Follow-up By *
                                            </label>
                                            <SearchableSelect 
                                                value={contactedBy} 
                                                onChange={setContactedBy} 
                                                options={employeeOptions} 
                                                placeholder="Select Personnel..." 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5" /> Snooze Until *
                                            </label>
                                            <input 
                                                required
                                                type="date" 
                                                value={snoozeDate} 
                                                onChange={e => setSnoozeDate(e.target.value)} 
                                                className="w-full px-3 py-2 text-[11px] font-bold border border-slate-200 rounded-lg shadow-sm focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all h-[38px] bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Remark / Note
                                        </label>
                                        <textarea 
                                            value={remark} 
                                            onChange={e => setRemark(e.target.value)} 
                                            className="w-full px-3 py-2 text-[12px] font-medium border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none min-h-[60px] bg-white"
                                            placeholder="Type interaction notes here..."
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-1.5 mt-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Current Status *
                                    </label>
                                    {!isDefense && (
                                        isAddingStatus ? (
                                            <div className="flex items-center space-x-1">
                                                <input 
                                                    autoFocus 
                                                    value={newStatusValue} 
                                                    onChange={e => setNewStatusValue(e.target.value)} 
                                                    onKeyDown={e => e.key === 'Enter' && handleAddStatus(e)} 
                                                    className="text-[9px] px-1.5 py-0.5 border rounded outline-none w-24 bg-white" 
                                                    placeholder="Status..." 
                                                />
                                                <button type="button" onClick={handleAddStatus} className="text-blue-600"><Check className="w-3 h-3"/></button>
                                                <button type="button" onClick={() => setIsAddingStatus(false)} className="text-slate-400"><X className="w-3 h-3"/></button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => setIsAddingStatus(true)} className="text-[8px] font-black text-blue-600 uppercase flex items-center"><Plus className="w-2.5 h-2.5 mr-0.5" /> Add</button>
                                        )
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {(isDefense ? defenseStatusOptions : localStatusOptions.slice(0, 15)).map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setStatus(opt)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${
                                                status === opt 
                                                ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                        <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Defense Supervisor *
                                    </label>
                                    <SearchableSelect 
                                        value={defenseSupervisor} 
                                        onChange={setDefenseSupervisor} 
                                        options={employeeOptions} 
                                        placeholder="Search supervisor..." 
                                    />
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <label className="block text-[8px] font-black text-blue-600 uppercase tracking-tighter flex items-center">
                                        <ClipboardList className="w-2.5 h-2.5 mr-1" /> Submission Date *
                                    </label>
                                    <input 
                                        required
                                        type="date" 
                                        value={regFormDate} 
                                        onChange={e => setRegFormDate(e.target.value)} 
                                        className="w-full px-2 py-1 text-[10px] font-bold border border-slate-200 rounded-md shadow-sm focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all h-[38px] bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Defense Status *
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {defenseStatusOptions.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setStatus(opt)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border ${
                                                status === opt 
                                                ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                        <Tags className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Defense Type
                                    </label>
                                    {isAddingDefType ? (
                                        <div className="flex items-center space-x-1">
                                            <input autoFocus value={newDefTypeValue} onChange={e => setNewDefTypeValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDefType(e)} className="text-[9px] px-1.5 py-0.5 border rounded outline-none w-24 bg-white" placeholder="Type..." />
                                            <button type="button" onClick={handleAddDefType} className="text-blue-600"><Check className="w-3 h-3"/></button>
                                            <button type="button" onClick={() => setIsAddingDefType(false)} className="text-slate-400"><X className="w-3 h-3"/></button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => setIsAddingDefType(true)} className="text-[8px] font-black text-blue-600 uppercase flex items-center"><Plus className="w-2.5 h-2.5 mr-0.5" /> Add</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {defenseTypeOptions.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setDefenseType(opt)}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all border ${
                                                defenseType === opt 
                                                ? 'bg-slate-700 text-white border-slate-800' 
                                                : 'bg-white text-slate-500 border-slate-200'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                    <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Report Title
                                </label>
                                <textarea 
                                    value={reportTitle} 
                                    onChange={e => setReportTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none h-16 bg-white shadow-sm"
                                    placeholder="Enter thesis/project report title..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-teal-500" /> Library Clearance
                                </label>
                                <div className="flex p-0.5 bg-slate-100 rounded-lg w-fit border border-slate-200">
                                    {['Pending', 'Done'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setLibraryClearance(opt)}
                                            className={`px-4 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                                libraryClearance === opt 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>

            <div className="p-3 pt-2 flex space-x-2 shrink-0 border-t bg-slate-50/80 rounded-b-xl">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[9px] font-black text-slate-500 bg-white border border-slate-200 rounded-lg uppercase hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button 
                    type="submit"
                    form="snooze-form"
                    disabled={isSaving || isInvalid} 
                    className="flex-[1.5] py-2.5 text-[9px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg flex items-center justify-center uppercase transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {isTrackingMode ? 'Save Tracking' : 'Apply Snooze'}
                </button>
            </div>
        </div>
    );
};
