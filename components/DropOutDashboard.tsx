import React from 'react';
import { UserPlus, UserCheck, UserX, Award, ShieldCheck, GraduationCap, Clock, PowerOff, AlertCircle } from 'lucide-react';

interface DropOutDashboardProps {
    stats: {
        enrolled: number;
        registered: number;
        unregistered: number;
        pDrop: number;
        tDrop: number;
        crCom: number;
        defense: number;
        regPending: number;
    };
    comparisonSemester: string;
}

export const DropOutDashboard: React.FC<DropOutDashboardProps> = ({ stats, comparisonSemester }) => {
    const cards = [
        { label: 'Total Enroll', value: stats.enrolled, icon: UserPlus, color: 'bg-blue-600', sub: 'Historical Total' },
        { label: 'Registered', value: stats.registered, icon: UserCheck, color: 'bg-green-600', sub: `In ${comparisonSemester}` },
        { label: 'Unregistered', value: stats.unregistered, icon: UserX, color: 'bg-red-600', sub: 'Not Registered' },
        { label: 'P-Drop', value: stats.pDrop, icon: PowerOff, color: 'bg-rose-700', sub: 'Permanent Drop' },
        { label: 'T-Drop', value: stats.tDrop, icon: Clock, color: 'bg-orange-600', sub: 'Temporary Drop' },
        { label: 'Credit Completed', value: stats.crCom, icon: GraduationCap, color: 'bg-emerald-600', sub: 'Requirement Met' },
        { label: 'Defense Reg.', value: stats.defense, icon: ShieldCheck, color: 'bg-teal-600', sub: 'Thesis/Project' },
        { label: 'Reg. Pending', value: stats.regPending, icon: AlertCircle, color: 'bg-amber-600', sub: 'Priority Target' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {cards.map((card) => (
                <div key={card.label} className={`${card.color} rounded-lg p-2.5 text-white shadow-sm flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all min-h-[75px]`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-xl font-black leading-none tracking-tighter">{card.value}</div>
                        <div className="p-1 rounded bg-white/10">
                            <card.icon className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    {/* Increased title text size from 8px to 10px */}
                    <div className="text-[10px] font-black uppercase tracking-wider opacity-90 leading-tight truncate">
                        {card.label}
                    </div>
                    {/* Increased subtext size from 7px to 8px */}
                    <div className="text-[8px] opacity-60 truncate mt-0.5 font-bold uppercase tracking-tighter">
                        {card.sub}
                    </div>
                </div>
            ))}
        </div>
    );
};