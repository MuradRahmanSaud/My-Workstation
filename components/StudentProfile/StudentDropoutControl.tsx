import React from 'react';
import { X, ShieldMinus, PowerOff, Clock, Trash2 } from 'lucide-react';

interface StudentDropoutControlProps {
    onClose: () => void;
    onUpdate: (type: string) => void;
}

export const StudentDropoutControl: React.FC<StudentDropoutControlProps> = React.memo(({ onClose, onUpdate }) => {
    return (
        <div className="absolute inset-0 z-[150] bg-black/5 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center">
                        <ShieldMinus className="w-3.5 h-3.5 mr-2 text-blue-600" /> Drop Classification
                    </h4>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex flex-col space-y-2">
                    <button onClick={() => onUpdate('Permanent Drop')} className="flex items-center space-x-3 p-3 rounded-xl border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 transition-all">
                        <div className="p-2 rounded-lg bg-white shadow-sm"><PowerOff className="w-4 h-4" /></div>
                        <span className="text-xs font-black uppercase tracking-tight">Permanent Drop</span>
                    </button>
                    <button onClick={() => onUpdate('Temporary Drop')} className="flex items-center space-x-3 p-3 rounded-xl border border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all">
                        <div className="p-2 rounded-lg bg-white shadow-sm"><Clock className="w-4 h-4" /></div>
                        <span className="text-xs font-black uppercase tracking-tight">Temporary Drop</span>
                    </button>
                    <button onClick={() => onUpdate('')} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all">
                        <div className="p-2 rounded-lg bg-white shadow-sm text-slate-400"><Trash2 className="w-4 h-4" /></div>
                        <span className="text-xs font-black uppercase tracking-tight">Clear Classification</span>
                    </button>
                </div>
            </div>
        </div>
    );
});