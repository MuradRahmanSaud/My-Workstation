import React from 'react';
import { User, ShieldAlert, GraduationCap, Calendar, Award, Banknote, CalendarCheck, ShieldQuestion, Trash2 } from 'lucide-react';
import { StudentDataRow, ProgramDataRow } from '../types';

interface StudentProfileHeaderProps {
    student: StudentDataRow;
    program: ProgramDataRow;
    discStatus: { isActive: boolean; isExpired: boolean; message: string };
    dropInfo: { type: string; label: string; color: string } | null;
    onOpenDisciplinary: () => void;
    onRemoveDisciplinary: () => void;
    isSaving: boolean;
    isCreditsMet: boolean;
    isDefenseSuccess: boolean;
    isDegreeDone: boolean;
    lastRegSemester: string;
    mentorAssigned: boolean;
    onCardClick: (type: string) => void;
    activePopup: string | null;
}

export const StudentProfileHeader: React.FC<StudentProfileHeaderProps> = ({
    student, program, discStatus, dropInfo, onOpenDisciplinary, onRemoveDisciplinary, isSaving,
    isCreditsMet, isDefenseSuccess, isDegreeDone, lastRegSemester, mentorAssigned, onCardClick, activePopup
}) => {
    return (
        <div className="bg-white border-b border-slate-100 p-5 shadow-sm shrink-0">
            <div className="flex items-start space-x-5">
                <div className="w-16 h-16 rounded-full border-2 border-white shadow-md flex items-center justify-center bg-blue-50 ring-1 ring-blue-100 overflow-hidden shrink-0">
                    <User className="w-8 h-8 text-blue-200" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 leading-tight tracking-tight truncate">{student['Student Name']}</h2>
                        {discStatus.isActive && (
                            <button 
                                onClick={onOpenDisciplinary} 
                                title={discStatus.message}
                                className={`p-1 rounded-full transition-colors ${discStatus.isExpired ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' : 'text-red-600 hover:bg-red-50 animate-pulse'}`}
                            >
                                <ShieldAlert className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center mt-1">
                        <p className="text-[10px] font-mono font-bold text-blue-600 tracking-wider flex items-center">
                            {student['Student ID']}
                            {dropInfo && (
                                <span className={`ml-2 px-1 rounded text-[8px] font-black uppercase tracking-tighter border border-current ${dropInfo.color} bg-white shadow-sm`}>
                                    ({dropInfo.label})
                                </span>
                            )}
                        </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-1.5 truncate">{program['Program Full Name']}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5 truncate uppercase tracking-tighter">{program['Faculty Full Name']}</p>
                    
                    {discStatus.isActive && discStatus.isExpired && (
                        <div className="mt-1 flex items-center">
                             <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[8px] uppercase font-black border border-yellow-200">Notice Expired</span>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveDisciplinary(); }}
                                disabled={isSaving}
                                className="ml-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-30"
                                title="Clear Expired Record"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2 mt-4">
                <div className="grid grid-cols-3 gap-2">
                    <div onClick={() => onCardClick('credits')} className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${activePopup === 'credits' ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isCreditsMet ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center space-x-1 mb-1.5"><GraduationCap className={`w-3 h-3 ${isCreditsMet ? 'text-emerald-500' : 'text-red-500'}`} /><span className={`text-[10px] uppercase font-bold tracking-tight ${isCreditsMet ? 'text-emerald-600' : 'text-red-600'}`}>Credits</span></div>
                        <div className={`text-sm font-bold leading-none ${isCreditsMet ? 'text-emerald-800' : 'text-red-800'}`}>{student['Credit Completed'] || '0'}<span className="text-[10px] font-normal mx-0.5 opacity-60">/</span>{student['Credit Requirement'] || '0'}</div>
                    </div>
                    <div onClick={() => onCardClick('defense')} className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${activePopup === 'defense' ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isDefenseSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center space-x-1 mb-1.5"><Calendar className={`w-3 h-3 ${isDefenseSuccess ? 'text-emerald-500' : 'text-red-500'}`} /><span className={`text-[10px] uppercase font-bold tracking-tight ${isDefenseSuccess ? 'text-emerald-600' : 'text-red-600'}`}>Defense</span></div>
                        <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDefenseSuccess ? 'text-emerald-800' : 'text-red-800'}`}>{student['Defense Status'] || 'Pending'}</div>
                    </div>
                    <div onClick={() => onCardClick('degree')} className={`rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${activePopup === 'degree' ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'} ${isDegreeDone ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center space-x-1 mb-1.5"><Award className={`w-3 h-3 ${isDegreeDone ? 'text-emerald-500' : 'text-red-500'}`} /><span className={`text-[10px] uppercase font-bold tracking-tight ${isDegreeDone ? 'text-emerald-600' : 'text-red-600'}`}>Degree</span></div>
                        <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDegreeDone ? 'text-emerald-800' : 'text-red-800'}`}>{student['Degree Status'] || 'Pending'}</div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div onClick={() => onCardClick('dues')} className={`bg-amber-50 border border-amber-100 rounded p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${activePopup === 'dues' ? 'shadow-lg ring-2 ring-amber-500/20' : 'shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-center space-x-1 mb-1.5"><Banknote className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] uppercase font-bold tracking-tight text-amber-600">Dues</span></div>
                        <div className="text-sm font-bold text-amber-800 leading-none truncate w-full text-center">{student['Dues'] || '0'}</div>
                    </div>
                    <div onClick={() => onCardClick('history')} className={`bg-emerald-50 border border-emerald-100 rounded p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer ${activePopup === 'history' ? 'shadow-lg ring-2 ring-emerald-500/20' : 'shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-center space-x-1 mb-1.5"><CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] uppercase font-bold tracking-tight text-emerald-600">Last Reg</span></div>
                        <div className="text-[11px] font-bold text-emerald-800 leading-none truncate w-full text-center">{lastRegSemester}</div>
                    </div>
                    <div onClick={() => onCardClick('mentor')} className={`bg-blue-50 border border-blue-100 rounded p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer ${activePopup === 'mentor' ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-center space-x-1 mb-1.5"><ShieldQuestion className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] uppercase font-bold tracking-tight text-blue-600">Mentor</span></div>
                        <div className={`text-[11px] font-bold leading-none truncate w-full text-center ${mentorAssigned ? 'text-emerald-700' : 'text-red-600'}`}>{mentorAssigned ? 'Assigned' : 'Unassigned'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};