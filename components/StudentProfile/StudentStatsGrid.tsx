
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

    // Deriving latest Dues amount strictly from History Logs (Discussion Remark)
    const displayDues = useMemo(() => {
        const rawRemarks = student['Discussion Remark'];
        if (!rawRemarks || rawRemarks.trim() === '') return '0';

        try {
            // Split into individual interaction records
            const records = rawRemarks.split(' || ').map(r => r.trim()).filter(Boolean);
            
            // Filter only Dues related interactions and map to objects
            // Fields: [0:Date, 1:Status, 2:Personnel, 3:Snooze, 4:TargetSem, 5:Remark, 6:Category, 7:Period, 8:SemanticStatus]
            const duesLogs = records.map(r => {
                const fields = r.split(' ;; ').map(f => f.trim());
                return {
                    date: new Date(fields[0]).getTime(),
                    status: fields[1] || '0',
                    category: (fields[6] || '').toLowerCase(),
                    amount: (fields[1] || '').match(/\d+/) ? (fields[1] || '').match(/\d+/)![0] : '0'
                };
            }).filter(log => !isNaN(log.date) && log.category === 'dues follow up');

            if (duesLogs.length === 0) return '0';

            // Sort by date descending to get the absolute latest interaction
            duesLogs.sort((a, b) => b.date - a.date);

            return duesLogs[0].amount;
        } catch (e) {
            console.error("Dues parsing error in StatsGrid:", e);
            return '0';
        }
    }, [student['Discussion Remark']]);

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
