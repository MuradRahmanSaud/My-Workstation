
import React from 'react';
import { BookOpen, List, Users, GraduationCap, HelpCircle, UserMinus, Calendar, TrendingUp } from 'lucide-react';

interface ProgramDashboardProps {
    stats: {
        uniqueCourses: number;
        totalSections: number;
        uniqueTeachers: number;
        totalStudents: number;
        unassigned: number;
        lowEnrollment: number;
        avgProgress: number;
    };
    onCardClick: (reportType: string) => void;
    activeReport: string | null;
}

export const ProgramDashboard: React.FC<ProgramDashboardProps> = ({ stats, onCardClick, activeReport }) => {
    const statCards = [
        { id: 'courses', label: 'Total Course', value: stats.uniqueCourses, icon: BookOpen, color: 'bg-blue-600' },
        { id: 'sections', label: 'Total Section', value: stats.totalSections, icon: List, color: 'bg-purple-600' },
        { id: 'teachers', label: 'Total Teacher', value: stats.uniqueTeachers, icon: Users, color: 'bg-orange-500' },
        { id: 'unassigned', label: 'Unassign Sec', value: stats.unassigned, icon: HelpCircle, color: 'bg-red-600' },
        { id: 'low_student', label: 'Low Student', value: stats.lowEnrollment, icon: UserMinus, color: 'bg-green-600' },
        { id: 'class_taken', label: 'Class Taken', value: `${stats.avgProgress}%`, icon: Calendar, color: 'bg-cyan-600' },
        { id: 'admitted', label: 'Students', value: stats.totalStudents, icon: GraduationCap, color: 'bg-teal-600' },
    ];

    return (
        <div className="w-full">
            {/* KPI Grid - Compact Horizontal Design */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-1.5">
                {statCards.map((card) => {
                    const isActive = activeReport === card.id;
                    return (
                        <div 
                            key={card.id} 
                            onClick={() => onCardClick(card.id)}
                            className={`${card.color} rounded-md p-2 text-white shadow-sm flex items-center space-x-2 relative overflow-hidden group transition-all cursor-pointer hover:shadow-md min-h-[48px] ${isActive ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-white scale-[1.02] z-10' : 'opacity-90 hover:opacity-100'}`}
                        >
                            {/* Small Boxed Icon */}
                            <div className={`p-1.5 rounded bg-white/20 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                                <card.icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Value and Label Stack */}
                            <div className="flex flex-col min-w-0">
                                <div className="text-base font-black leading-none truncate tracking-tight">{card.value}</div>
                                <div className="text-[8px] font-bold uppercase tracking-tighter opacity-80 leading-none mt-1 truncate">
                                    {card.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Placeholder when no report selected */}
            {!activeReport && (
                <div className="mt-3 bg-white rounded-lg border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-slate-300">
                    <TrendingUp className="w-8 h-8 mb-2 opacity-10" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Select a metric to analyze</p>
                </div>
            )}
        </div>
    );
};
