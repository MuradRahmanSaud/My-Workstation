import React, { useMemo } from 'react';
import { GraduationCap, Calendar, Award, Banknote, CalendarCheck, ShieldQuestion, Pencil } from 'lucide-react';
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
    const cardBase = "rounded border p-1.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md relative group";
    const activeRing = "shadow-lg ring-2 ring-blue-500/20";

    // Parse the semantically latest amount from the Dues history string
    const displayDues = useMemo(() => {
        const raw = student['Dues'];
        if (!raw || raw.trim() === '') return '0';
        
        // If it's just a number (legacy), return it
        if (!raw.includes(' ;; ')) return raw;

        try {
            // Split into individual records
            const records = raw.split(' || ').map(r => r.trim()).filter(Boolean);
            
            // Map to sortable objects
            // Schema: [Date, Amount, Period, TargetSemester, ApproverId, HistoryRemark]
            const parsedRecords = records.map(r => {
                const fields = r.split(' ;; ').map(f => f.trim());
                return {
                    amount: fields[1] || '0',
                    period: fields[2] || '',
                    semesterStr: fields[3] || '',
                };
            });

            // Weights for sorting
            const semWeight: Record<string, number> = { 'fall': 3, 'summer': 2, 'spring': 1 };
            const periodWeight: Record<string, number> = { 'final-term': 3, 'mid-term': 2, 'registration': 1 };

            // Sort by Semester Year (DESC) > Semester Type (DESC) > Period (DESC)
            parsedRecords.sort((a, b) => {
                const partsA = a.semesterStr.split(' ');
                const partsB = b.semesterStr.split(' ');

                const yearA = parseInt(partsA[1] || '0');
                const yearB = parseInt(partsB[1] || '0');

                // 1. Compare Year (Descending)
                if (yearA !== yearB) return yearB - yearA;

                // 2. Compare Semester (Descending: Fall > Summer > Spring)
                const sWeightA = semWeight[partsA[0]?.toLowerCase()] || 0;
                const sWeightB = semWeight[partsB[0]?.toLowerCase()] || 0;
                if (sWeightA !== sWeightB) return sWeightB - sWeightA;

                // 3. Compare Period (Descending: Final > Mid > Registration)
                const pWeightA = periodWeight[a.period.toLowerCase()] || 0;
                const pWeightB = periodWeight[b.period.toLowerCase()] || 0;
                return pWeightB - pWeightA;
            });

            // Return the amount from the semantically latest record
            return parsedRecords[0]?.amount || '0';
        } catch (e) {
            console.error("Dues parsing error in StatsGrid:", e);
            return '0';
        }
    }, [student['Dues']]);

    return (
        <div className="space-y-1.5 mt-3">
            <div className="grid grid-cols-3 gap-1.5">
                {/* Credits Card */}
                <div onClick={() => onCardClick('history')} className={`${cardBase} ${activePopup === 'history' ? activeRing : ''} ${isCreditsMet ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onCardClick('credits');
                        }}
                        className="absolute top-1 right-1 p-0.5 rounded bg-white/50 text-slate-400 hover:text-blue-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100"
                        title="Edit Credits"
                    >
                        <Pencil className="w-2 h-2" />
                    </button>
                    
                    <div className="flex items-center space-x-1 mb-0.5">
                        <GraduationCap className={`w-2.5 h-2.5 ${isCreditsMet ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className={`text-[8px] uppercase font-black tracking-tight ${isCreditsMet ? 'text-emerald-600' : 'text-red-600'}`}>Credits</span>
                    </div>
                    <div className={`text-[12px] font-black leading-none ${isCreditsMet ? 'text-emerald-800' : 'text-red-800'}`}>
                        {student['Credit Completed'] || '0'}<span className="text-[9px] font-normal mx-0.5 opacity-60">/</span>{student['Credit Requirement'] || '0'}
                    </div>
                </div>

                {/* Defense Card */}
                <div onClick={() => onCardClick('remarks-defense')} className={`${cardBase} ${activePopup === 'remarks' ? activeRing : ''} ${isDefenseSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onCardClick('defense');
                        }}
                        className="absolute top-1 right-1 p-0.5 rounded bg-white/50 text-slate-400 hover:text-blue-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100"
                        title="Edit Defense Details"
                    >
                        <Pencil className="w-2 h-2" />
                    </button>

                    <div className="flex items-center space-x-1 mb-0.5">
                        <Calendar className={`w-2.5 h-2.5 ${isDefenseSuccess ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className={`text-[8px] uppercase font-black tracking-tight ${isDefenseSuccess ? 'text-emerald-600' : 'text-red-600'}`}>Defense</span>
                    </div>
                    <div className={`text-[9px] font-black leading-none truncate w-full text-center ${isDefenseSuccess ? 'text-emerald-800' : 'text-red-800'}`}>
                        {student['Defense Status'] || 'Pending'}
                    </div>
                </div>

                <div onClick={() => onCardClick('degree')} className={`${cardBase} ${activePopup === 'degree' ? activeRing : ''} ${isDegreeDone ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center space-x-1 mb-0.5">
                        <Award className={`w-2.5 h-2.5 ${isDegreeDone ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className={`text-[8px] uppercase font-black tracking-tight ${isDegreeDone ? 'text-emerald-600' : 'text-red-600'}`}>Degree</span>
                    </div>
                    <div className={`text-[9px] font-black leading-none truncate w-full text-center ${isDegreeDone ? 'text-emerald-800' : 'text-red-800'}`}>
                        {student['Degree Status'] || 'Pending'}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {/* Dues Card - Triggers Remarks panel with Dues context */}
                <div onClick={() => onCardClick('remarks-dues')} className={`bg-amber-50 border border-amber-100 ${cardBase} ${activePopup === 'remarks' ? activeRing : ''}`}>
                    <div className="flex items-center space-x-1 mb-0.5">
                        <Banknote className="w-3 h-3 text-amber-500" />
                        <span className="text-[8px] uppercase font-black tracking-tight text-amber-600">Dues</span>
                    </div>
                    <div className="text-[12px] font-black text-amber-800 leading-none truncate w-full text-center">{displayDues}</div>
                </div>
                <div onClick={() => onCardClick('remarks')} className={`bg-emerald-50 border border-emerald-100 ${cardBase} ${activePopup === 'remarks' ? activeRing : ''}`}>
                    <div className="flex items-center space-x-1 mb-0.5">
                        <CalendarCheck className="w-3 h-3 text-emerald-500" />
                        <span className="text-[8px] uppercase font-black tracking-tight text-emerald-600">Last Reg</span>
                    </div>
                    <div className="text-[10px] font-black text-emerald-800 leading-none truncate w-full text-center">{lastRegSemester}</div>
                </div>
                <div onClick={() => onCardClick('mentor')} className={`bg-blue-50 border border-blue-100 ${cardBase} ${activePopup === 'mentor' ? activeRing : ''}`}>
                    <div className="flex items-center space-x-1 mb-0.5">
                        <ShieldQuestion className="w-3 h-3 text-blue-500" />
                        <span className="text-[8px] uppercase font-bold tracking-tight text-blue-600">Mentor</span>
                    </div>
                    <div className={`text-[10px] font-black leading-none truncate w-full text-center ${mentorAssigned ? 'text-emerald-700' : 'text-red-600'}`}>{mentorAssigned ? 'Assigned' : 'Unassigned'}
                    </div>
                </div>
            </div>
        </div>
    );
});