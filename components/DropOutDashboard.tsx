import React from 'react';
import { UserPlus, UserCheck, Award, ShieldCheck, GraduationCap, Clock, PowerOff, AlertCircle, MessageSquare } from 'lucide-react';

export type DropoutKpiType = 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'crcom' | 'defense' | 'regPending' | 'followup';

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
        followup: number;
    };
    comparisonSemester: string;
    onCardClick?: (type: DropoutKpiType) => void;
    activeType?: DropoutKpiType;
}

// Map tailwind classes to specific shadow values for color coordination
const COLOR_SHADOW_MAP: Record<string, string> = {
    'bg-blue-600': '0 12px 20px -5px rgba(37, 99, 235, 0.5)',
    'bg-green-600': '0 12px 20px -5px rgba(22, 163, 74, 0.5)',
    'bg-rose-700': '0 12px 20px -5px rgba(190, 18, 60, 0.5)',
    'bg-orange-600': '0 12px 20px -5px rgba(234, 88, 12, 0.5)',
    'bg-emerald-600': '0 12px 20px -5px rgba(5, 150, 105, 0.5)',
    'bg-teal-600': '0 12px 20px -5px rgba(13, 148, 136, 0.5)',
    'bg-amber-600': '0 12px 20px -5px rgba(217, 119, 6, 0.5)',
    'bg-pink-600': '0 12px 20px -5px rgba(219, 39, 119, 0.5)',
};

export const DropOutDashboard: React.FC<DropOutDashboardProps> = ({ stats, comparisonSemester, onCardClick, activeType }) => {
    const cards: { id: DropoutKpiType; label: string; value: number | string; icon: any; color: string }[] = [
        { id: 'all', label: 'Total Enroll', value: stats.enrolled, icon: UserPlus, color: 'bg-blue-600' },
        { id: 'registered', label: 'Registered', value: stats.registered, icon: UserCheck, color: 'bg-green-600' },
        { id: 'pdrop', label: 'Permanent Drop', value: stats.pDrop, icon: PowerOff, color: 'bg-rose-700' },
        { id: 'tdrop', label: 'Temporary Drop', value: stats.tDrop, icon: Clock, color: 'bg-orange-600' },
        { id: 'crcom', label: 'Credit Completed', value: stats.crCom, icon: GraduationCap, color: 'bg-emerald-600' },
        { id: 'defense', label: 'Defense Reg.', value: stats.defense, icon: ShieldCheck, color: 'bg-teal-600' },
        { id: 'regPending', label: 'Reg. Pending', value: stats.regPending, icon: AlertCircle, color: 'bg-amber-600' },
        { id: 'followup', label: 'Follow-up', value: stats.followup, icon: MessageSquare, color: 'bg-pink-600' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {cards.map((card) => {
                const isActive = activeType === card.id;
                return (
                    <div 
                        key={card.id} 
                        onClick={() => onCardClick?.(card.id)}
                        className={`${card.color} rounded-lg p-2 text-white flex flex-col justify-center relative overflow-visible group transition-all duration-300 cursor-pointer border-none ${isActive ? 'scale-[1.05] z-10' : 'opacity-90 hover:opacity-100 shadow-sm'}`}
                        style={{
                            boxShadow: isActive ? COLOR_SHADOW_MAP[card.color] : 'none'
                        }}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xl font-black leading-none tracking-tighter">{card.value}</div>
                            <div className="p-1 rounded bg-white/10">
                                <card.icon className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-wider opacity-90 leading-tight truncate">
                            {card.label}
                        </div>
                        {isActive && (
                            <div className="absolute top-1 right-1">
                                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};