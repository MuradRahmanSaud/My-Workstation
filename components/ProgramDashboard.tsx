import React from 'react';
import { BookOpen, List, Users, GraduationCap, HelpCircle, UserMinus, TrendingUp } from 'lucide-react';

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
}

export const ProgramDashboard: React.FC<ProgramDashboardProps> = ({ stats }) => {
    const statCards = [
        { label: 'Courses', value: stats.uniqueCourses, icon: BookOpen, color: 'bg-blue-600' },
        { label: 'Sections', value: stats.totalSections, icon: List, color: 'bg-purple-600' },
        { label: 'Teachers', value: stats.uniqueTeachers, icon: Users, color: 'bg-orange-500' },
        { label: 'Students', value: stats.totalStudents, icon: GraduationCap, color: 'bg-teal-600' },
        { label: 'Unassigned', value: stats.unassigned, icon: HelpCircle, color: 'bg-red-600' },
        { label: 'Low Std.', value: stats.lowEnrollment, icon: UserMinus, color: 'bg-green-600' },
        { label: 'Progress', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'bg-cyan-600' },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-5 thin-scrollbar bg-slate-50/50 border-r border-gray-100">
            <div className="w-full space-y-4">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                    {statCards.map((card, idx) => (
                        <div key={idx} className={`${card.color} rounded-lg p-2.5 text-white shadow flex flex-col items-center justify-center relative overflow-hidden group transition-all hover:scale-[1.01] hover:shadow-md min-h-[64px]`}>
                            <card.icon className="w-3.5 h-3.5 absolute left-1.5 top-1.5 opacity-40 group-hover:scale-110 group-hover:opacity-70 transition-all" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="text-xl font-black leading-none shadow-black/10 drop-shadow-sm">{card.value}</div>
                                <div className="text-[9px] font-bold uppercase tracking-wider opacity-90 text-center">{card.label}</div>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/10 group-hover:bg-white/30 transition-colors" />
                        </div>
                    ))}
                </div>

                {/* Statistics Visualization Placeholder */}
                <div className="bg-white/40 rounded-xl border border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-gray-300">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-30">Program Statistics Visualization</p>
                </div>
            </div>
        </div>
    );
};