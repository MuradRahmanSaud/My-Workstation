import React from 'react';
import { CalendarRange, X, Save, Loader2 } from 'lucide-react';
import { SearchableSelect } from './EditEntryModal';

interface DisciplinaryFormProps {
    discReason: string;
    setDiscReason: (val: string) => void;
    discFromDate: string;
    setDiscFromDate: (val: string) => void;
    discToDate: string;
    setDiscToDate: (val: string) => void;
    isExpired: boolean;
    isSaving: boolean;
    onSave: () => void;
    onClose: () => void;
}

export const StudentDisciplinaryForm: React.FC<DisciplinaryFormProps> = ({
    discReason, setDiscReason, discFromDate, setDiscFromDate, discToDate, setDiscToDate,
    isExpired, isSaving, onSave, onClose
}) => {
    const themeColor = isExpired ? 'yellow' : 'red';

    return (
        <div className={`rounded-xl shadow-lg border overflow-visible flex flex-col p-5 space-y-4 animate-in slide-in-from-top-2 ${isExpired ? 'bg-yellow-50 border-yellow-300 shadow-yellow-100/50' : 'bg-red-50 border-red-200'}`}>
            <div className={`flex items-center justify-between border-b pb-2 ${isExpired ? 'border-yellow-200' : 'border-red-200'}`}>
                <h4 className={`text-xs font-black uppercase tracking-widest flex items-center ${isExpired ? 'text-yellow-700' : 'text-red-700'}`}>
                    <CalendarRange className="w-4 h-4 mr-2" /> 
                    {isExpired ? 'Update Disciplinary Record' : 'Disciplinary Action Setting'}
                </h4>
                <button onClick={onClose} className={`${isExpired ? 'text-yellow-400 hover:text-yellow-600' : 'text-red-400 hover:text-red-600'}`}>
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="space-y-3 relative">
                {isExpired && (
                    <div className="p-2 bg-white/70 border border-yellow-200 rounded text-[9px] font-bold text-yellow-700 italic">
                        Note: Current restriction period has ended. Updating will append/log the new state.
                    </div>
                )}
                <div className="relative z-[70]">
                    <label className={`block text-[10px] font-black uppercase mb-1 ${isExpired ? 'text-yellow-600' : 'text-red-600'}`}>Explanation / Action Type</label>
                    <SearchableSelect 
                        value={discReason} 
                        onChange={setDiscReason} 
                        options={['Probation', 'Suspension', 'Expulsion', 'Warning', 'Fine Paid', 'Investigation Pending']} 
                        placeholder="Select or add action type" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-[10px] font-black uppercase mb-1 ${isExpired ? 'text-yellow-600' : 'text-red-600'}`}>Effective From</label>
                        <input 
                            type="date" 
                            value={discFromDate} 
                            onChange={e => setDiscFromDate(e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none ${isExpired ? 'border-yellow-300 focus:ring-yellow-100' : 'border-red-200 focus:ring-red-100'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-[10px] font-black uppercase mb-1 ${isExpired ? 'text-yellow-600' : 'text-red-600'}`}>Effective To (Optional)</label>
                        <input 
                            type="date" 
                            value={discToDate} 
                            onChange={e => setDiscToDate(e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none ${isExpired ? 'border-yellow-300 focus:ring-yellow-100' : 'border-red-200 focus:ring-red-100'}`}
                        />
                    </div>
                </div>
                <p className={`text-[10px] italic bg-white/50 p-2 rounded border ${isExpired ? 'text-yellow-600 border-yellow-200' : 'text-red-500 border-red-100'}`}>
                    Note: Dates will be formatted as MMM DD, YYYY. Empty "Effective To" marks as Permanent.
                </p>
            </div>
            <div className="flex space-x-3 pt-2">
                <button onClick={onClose} className={`flex-1 py-2.5 text-xs font-bold border rounded-lg transition-colors ${isExpired ? 'text-yellow-700 bg-white border-yellow-300 hover:bg-yellow-50' : 'text-red-700 bg-white border-red-200 hover:bg-red-100'}`}>Cancel</button>
                <button 
                    onClick={onSave} 
                    disabled={isSaving}
                    className={`flex-1 py-2.5 text-xs font-bold text-white rounded-lg shadow-md flex items-center justify-center ${isExpired ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Apply Record
                </button>
            </div>
        </div>
    );
};