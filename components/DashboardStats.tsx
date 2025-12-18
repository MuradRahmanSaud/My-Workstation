
import React, { useMemo } from 'react';
import { CourseSectionData } from '../types';
import { BookOpen, List, Users, HelpCircle, UserMinus, Calendar, UserPlus, BarChart3, Building2, Bell } from 'lucide-react';

interface DashboardStatsProps {
  data: CourseSectionData[];
  onCardClick?: (cardLabel: string) => void;
  totalCoursesOverride?: number;
  lowStudentThreshold: number;
  setLowStudentThreshold: (val: number) => void;
  classTakenThreshold: number;
  setClassTakenThreshold: (val: number) => void;
  capacityBonus: number;
  setCapacityBonus: (val: number) => void;
  totalAdmitted: number;
  totalClassRooms?: number;
  missingDataCount?: number;
  
  // New props for View Toggle inside Card
  currentViewMode?: string;
  reportModePreferences?: Record<string, boolean>;
  onToggleReportMode?: (mode: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  data, 
  onCardClick, 
  totalCoursesOverride,
  lowStudentThreshold,
  setLowStudentThreshold,
  classTakenThreshold,
  setClassTakenThreshold,
  capacityBonus,
  setCapacityBonus,
  totalAdmitted,
  totalClassRooms = 0,
  missingDataCount = 0,
  currentViewMode,
  reportModePreferences,
  onToggleReportMode
}) => {
  const stats = useMemo(() => {
    const totalSections = data.length;
    const uniqueCourses = totalCoursesOverride !== undefined 
        ? totalCoursesOverride
        : new Set(data.map(d => d['Course Code'])).size;
    const uniqueTeachers = new Set(data.map(d => d['Teacher ID']).filter(id => id && id.trim() !== '' && id !== 'TBA')).size;
    const totalUnassigned = data.filter(d => !d['Teacher ID'] || d['Teacher ID'] === 'TBA').length;
    
    const lowStudent = data.filter(d => {
        const students = parseInt(d.Student || '0', 10);
        return students > 0 && students < lowStudentThreshold;
    }).length;

    const classTaken = data.filter(d => {
        const taken = parseFloat(d['Class Taken'] || '0');
        const req = parseFloat(d['ClassRequirement'] || '0');
        let percentage = req > 0 ? (taken / req) * 100 : (taken > 0 ? 100 : 0);
        return percentage <= classTakenThreshold;
    }).length;
    
    return { totalSections, uniqueCourses, uniqueTeachers, totalUnassigned, lowStudent, classTaken };
  }, [data, totalCoursesOverride, lowStudentThreshold, classTakenThreshold]);

  const cards = [
    { label: 'Total Courses', value: stats.uniqueCourses, icon: missingDataCount > 0 ? Bell : BookOpen, bg: 'bg-blue-500', badge: missingDataCount > 0 ? `${missingDataCount}!` : null, mode: 'courses' },
    { label: 'Total Sections', value: stats.totalSections, icon: List, bg: 'bg-purple-500', mode: 'sections' },
    { label: 'Total Teachers', value: stats.uniqueTeachers, icon: Users, bg: 'bg-orange-400', mode: 'teachers' },
    { label: 'Student Dir.', value: totalAdmitted, icon: UserPlus, bg: 'bg-teal-600', mode: 'admitted' },
    { label: 'Class Rooms', value: totalClassRooms, icon: Building2, bg: 'bg-indigo-500', mode: 'classroom' },
    { label: 'Unassigned', value: stats.totalUnassigned, icon: HelpCircle, bg: 'bg-red-500', mode: 'unassigned' },
    { label: 'Low Student', value: stats.lowStudent, icon: UserMinus, bg: 'bg-green-500', mode: 'low_student' },
    { label: 'Class Taken', value: stats.classTaken, icon: Calendar, bg: 'bg-cyan-500', mode: 'class_taken' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-2 shrink-0">
      {cards.map((card, idx) => {
        const isActive = card.mode === currentViewMode || (card.label.includes('Courses') && (currentViewMode === 'courses' || currentViewMode === 'missing_data'));
        const isReport = reportModePreferences && card.mode ? reportModePreferences[card.mode] : false;

        return (
            <div 
                key={idx} 
                onClick={() => onCardClick && onCardClick(card.label.includes('Courses') && isActive && currentViewMode === 'missing_data' ? 'Total Courses' : card.label)}
                className={`${card.bg} rounded p-2.5 text-white shadow-sm flex flex-col justify-center items-center relative min-h-[90px] md:min-h-[75px] cursor-pointer transition-all hover:brightness-110 ${isActive ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900' : ''}`}
            >
            <div className="absolute top-1.5 left-1.5 opacity-40">
                <card.icon className="w-3.5 h-3.5" />
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center w-full text-center">
                <h3 className="text-2xl md:text-xl font-black leading-none mb-1">{card.value}</h3>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider opacity-90 leading-tight">{card.label}</p>
            </div>

            {card.label === 'Total Courses' && (
                <div onClick={e => e.stopPropagation()} className="absolute top-1 right-1">
                    <input type="number" value={capacityBonus} onChange={e => setCapacityBonus(parseInt(e.target.value, 10) || 0)} className="w-7 h-4 text-[9px] font-bold text-center text-blue-700 bg-white/90 rounded border-none shadow-sm" title="Capacity Bonus" />
                </div>
            )}
            
            {card.label === 'Low Student' && (
                <div onClick={e => e.stopPropagation()} className="absolute top-1 right-1">
                    <input type="number" value={lowStudentThreshold} onChange={e => setLowStudentThreshold(parseInt(e.target.value, 10) || 0)} className="w-7 h-4 text-[9px] font-bold text-center text-green-700 bg-white/90 rounded border-none shadow-sm" />
                </div>
            )}

            {card.badge && <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] px-1 rounded-full animate-pulse">{card.badge}</div>}

            {isActive && onToggleReportMode && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleReportMode(card.mode === 'missing_data' ? 'courses' : card.mode as string);
                    }}
                    className="absolute bottom-1 right-1 p-1 rounded bg-white/20 hover:bg-white/40 text-white transition-colors"
                >
                    {isReport ? <List className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
                </button>
            )}
            </div>
        );
      })}
    </div>
  );
};
