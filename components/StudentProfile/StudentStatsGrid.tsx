import React from 'react';
import { GraduationCap, Calendar, Award, Banknote, CalendarCheck, ShieldQuestion } from 'lucide-react';
import { StudentDataRow } from '../../types';

interface StudentStatsGridProps {
    student: StudentDataRow;
    activePopup: string | null;
    onCardClick: (type: string) => void;
    isCreditsMet: boolean;
    isDefenseSuccess: boolean;
    isDegreeDone: boolean;
    lastRegSemester: string;
    mentorAssigned: boolean;
}

export const StudentStatsGrid: React.FC<StudentStatsGridProps> = React.memo(({
    student, activePopup, onCardClick, isCreditsMet, isDefenseSuccess, isDegreeDone, lastRegSemester, mentorAssigned
}) => {
    const cardBase = "rounded border p-2.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md";
    const activeRing = "shadow-lg ring-2 ring-blue-500/20";

    return (
        <div className="space-y-2 mt-4">
            <div className="grid grid-cols-3 gap-2">
                <div onClick={() => onCardClick('credits')} className={`${cardBase} ${activePopup === 'credits' ? activeRing : ''} ${isCreditsMet ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center space-x-1 mb-1.5">
                        <GraduationCap className={`w-3 h-3 ${isCreditsMet ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className={`text-[10px] uppercase font-bold tracking-tight ${isCreditsMet ? 'text-emerald-600' : 'text-red-600'}`}>Credits</span>
                    </div>
                    <div className={`text-sm font-bold leading-none ${isCreditsMet ? 'text-emerald-800' : 'text-red-800'}`}>
                        {student['Credit Completed'] || '0'}<span className="text-[10px] font-normal mx-0.5 opacity-60">/</span>{student['Credit Requirement'] || '0'}
                    </div>
                </div>
                <div onClick={() => onCardClick('defense')} className={`${cardBase} ${activePopup === 'defense' ? activeRing : ''} ${isDefenseSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center space-x-1 mb-1.5">
                        <Calendar className={`w-3 h-3 ${isDefenseSuccess ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className={`text-[10px] uppercase font-bold tracking-tight ${isDefenseSuccess ? 'text-emerald-600' : 'text-red-600'}`}>Defense</span>
                    </div>
                    <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDefenseSuccess ? 'text-emerald-800' : 'text-red-800'}`}>
                        {student['Defense Status'] || 'Pending'}
                    </div>
                </div>
                <div onClick={() => onCardClick('degree')} className={`${cardBase} ${activePopup === 'degree' ? activeRing : ''} ${isDegreeDone ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center space-x-1 mb-1.5">
                        <Award className={`w-3 h-3 ${isDegreeDone ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className={`text-[10px] uppercase font-bold tracking-tight ${isDegreeDone ? 'text-emerald-600' : 'text-red-600'}`}>Degree</span>
                    </div>
                    <div className={`text-[10px] font-bold leading-none truncate w-full text-center ${isDegreeDone ? 'text-emerald-800' : 'text-red-800'}`}>
                        {student['Degree Status'] || 'Pending'}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div onClick={() => onCardClick('dues')} className={`bg-amber-50 border border-amber-100 ${cardBase} ${activePopup === 'dues' ? activeRing : ''}`}>
                    <div className="flex items-center space-x-1 mb-1.5">
                        <Banknote className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] uppercase font-bold tracking-tight text-amber-600">Dues</span>
                    </div>
                    <div className="text-sm font-bold text-amber-800 leading-none truncate w-full text-center">{student['Dues'] || '0'}</div>
                </div>
                <div onClick={() => onCardClick('history')} className={`bg-emerald-50 border border-emerald-100 ${cardBase} ${activePopup === 'history' ? activeRing : ''}`}>
                    <div className="flex items-center space-x-1 mb-1.5">
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] uppercase font-bold tracking-tight text-emerald-600">Last Reg</span>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-800 leading-none truncate w-full text-center">{lastRegSemester}</div>
                </div>
                <div onClick={() => onCardClick('mentor')} className={`bg-blue-50 border border-blue-100 ${cardBase} ${activePopup === 'mentor' ? activeRing : ''}`}>
                    <div className="flex items-center space-x-1 mb-1.5">
                        <ShieldQuestion className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] uppercase font-bold tracking-tight text-blue-600">Mentor</span>
                    </div>
                    <div className={`text-[11px] font-bold leading-none truncate w-full text-center ${mentorAssigned ? 'text-emerald-700' : 'text-red-600'}`}>
                        {mentorAssigned ? 'Assigned' : 'Unassigned'}
                    </div>
                </div>
            </div>
        </div>
    );
});