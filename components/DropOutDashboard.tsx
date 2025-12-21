import React from 'react';
import { UserPlus, UserCheck, UserX, Info, Award } from 'lucide-react';

interface DropOutDashboardProps {
    stats: {
        enrolled: number;
        registered: number;
        unregistered: number;
        totalCreditsCompleted: number;
    };
    comparisonSemester: string;
}

export const DropOutDashboard: React.FC<DropOutDashboardProps> = ({ stats, comparisonSemester }) => {
    const cards = [
        { label: 'Enrollment', value: stats.enrolled, icon: UserPlus, color: 'bg-blue-600', sub: 'From history' },
        { label: 'Registered', value: stats.registered, icon: UserCheck, color: 'bg-green-600', sub: `In ${comparisonSemester}` },
        { label: 'Unregistered', value: stats.unregistered, icon: UserX, color: 'bg-red-600', sub: 'Potential Dropouts' },
        { label: 'Credit Completed', value: stats.totalCreditsCompleted.toLocaleString(), icon: Award, color: 'bg-purple-600', sub: 'Total for selection' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {cards.map((card) => (
                <div key={card.label} className={`${card.color} rounded-lg p-3 text-white shadow-sm flex items-center space-x-3 relative overflow-hidden group hover:shadow-md transition-all`}>
                    <div className="p-2 rounded bg-white/20 shrink-0">
                        <card.icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="text-xl font-black leading-none tracking-tight">{card.value}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-80 leading-tight mt-1">
                            {card.label}
                        </div>
                        <div className="text-[8px] opacity-60 truncate mt-0.5 font-medium">{card.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};