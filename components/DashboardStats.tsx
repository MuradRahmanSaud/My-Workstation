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
    
    // Use override if provided, otherwise default to unique Course Code
    const uniqueCourses = totalCoursesOverride !== undefined 
        ? totalCoursesOverride
        : new Set(data.map(d => d['Course Code'])).size;

    const uniqueTeachers = new Set(data.map(d => d['Teacher ID']).filter(id => id && id.trim() !== '')).size;
    
    const totalUnassigned = data.filter(d => !d['Teacher ID'] || d['Teacher ID'] === 'TBA').length;
    
    let maxStudent = 0;
    
    const lowStudent = data.filter(d => {
        const students = parseInt(d.Student || '0', 10);
        if (!isNaN(students) && students > maxStudent) maxStudent = students;
        return students > 0 && students < lowStudentThreshold;
    }).length;

    // Filter based on Class Taken Percentage Threshold (<= threshold%)
    const classTaken = data.filter(d => {
        const taken = parseFloat(d['Class Taken'] || '0');
        const req = parseFloat(d['ClassRequirement'] || '0');
        let percentage = 0;
        if (req > 0) {
            percentage = (taken / req) * 100;
        } else if (taken > 0) {
            percentage = 100;
        }
        
        return percentage <= classTakenThreshold;
    }).length;
    
    // Calculate max values for inputs
    maxStudent = 0;
    data.forEach(d => {
        const s = parseInt(d.Student || '0', 10);
        if (!isNaN(s) && s > maxStudent) maxStudent = s;
    });

    return {
      totalSections,
      uniqueCourses,
      uniqueTeachers,
      totalUnassigned,
      lowStudent,
      classTaken,
      maxStudent
    };
  }, [data, totalCoursesOverride, lowStudentThreshold, classTakenThreshold]);

  const cards = [
    {
      label: 'Total Courses',
      value: stats.uniqueCourses,
      icon: missingDataCount > 0 ? Bell : BookOpen, // Swap icon if data missing
      bg: 'bg-blue-500', // Keep original color
      badge: missingDataCount > 0 ? `${missingDataCount}!` : '0', // Show count of missing
      clickable: true,
      mode: missingDataCount > 0 ? 'missing_data' : 'courses'
    },
    {
      label: 'Total Sections',
      value: stats.totalSections,
      icon: List,
      bg: 'bg-purple-500',
      badge: null,
      clickable: true,
      mode: 'sections'
    },
    {
      label: 'Total Teachers',
      value: stats.uniqueTeachers,
      icon: Users,
      bg: 'bg-orange-400',
      badge: null,
      clickable: true,
      mode: 'teachers'
    },
    {
      label: 'Total Admitted',
      value: totalAdmitted,
      icon: UserPlus,
      bg: 'bg-teal-600',
      badge: null,
      clickable: true,
      mode: 'admitted'
    },
    {
      label: 'Class Room',
      value: totalClassRooms,
      icon: Building2,
      bg: 'bg-indigo-500',
      badge: null,
      clickable: true,
      mode: 'classroom'
    },
    {
      label: 'Total Unassigned',
      value: stats.totalUnassigned,
      icon: HelpCircle,
      bg: 'bg-red-500',
      badge: null,
      clickable: true,
      mode: 'unassigned'
    },
    {
      label: 'Low Student',
      value: stats.lowStudent,
      icon: UserMinus,
      bg: 'bg-green-500',
      badge: null,
      clickable: true,
      mode: 'low_student'
    },
    {
      label: 'Class Taken (%)',
      value: stats.classTaken,
      icon: Calendar,
      bg: 'bg-cyan-500',
      badge: null,
      clickable: true,
      mode: 'class_taken'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-2 mb-2 shrink-0">
      {cards.map((card, idx) => {
        const isActive = card.mode === currentViewMode || (card.label === 'Total Courses' && (currentViewMode === 'courses' || currentViewMode === 'missing_data'));
        const isReport = reportModePreferences && card.mode ? reportModePreferences[card.mode] : false;

        return (
            <div 
                key={idx} 
                data-dashboard-card="true"
                onClick={() => card.clickable && onCardClick && onCardClick(card.label)}
                className={`${card.bg} rounded p-3 text-white shadow-sm flex flex-col justify-center items-center relative min-h-[100px] md:min-h-[70px] ${card.clickable ? 'cursor-pointer' : ''} ${isActive ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
            >
            
            {/* Icon - Top Left Corner */}
            <div 
                onClick={(e) => {
                    if (card.label === 'Total Courses') {
                        e.stopPropagation();
                        onCardClick && onCardClick('Total Courses Icon');
                    }
                }}
                className={`absolute top-2 left-2 z-20 transition-transform ${card.label === 'Total Courses' ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}`}
            >
                <card.icon 
                    className={`w-5 h-5 opacity-60 hover:opacity-100 transition-opacity ${card.label === 'Total Courses' && missingDataCount > 0 ? '' : ''}`} 
                />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-center w-full text-center">
                {/* Centered Text - Larger for Mobile */}
                <h3 className="text-3xl md:text-xl font-bold leading-none truncate mb-1">{card.value}</h3>
                {/* Centered Label */}
                <p className="text-xs md:text-xs font-bold md:font-medium uppercase tracking-wider opacity-90 leading-tight w-full">{card.label}</p>
            </div>

            {/* Input Fields (Stop Propagation) */}
            {card.label === 'Total Courses' ? (
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-1 right-1 md:top-2 md:right-2 flex items-center justify-center z-20"
                >
                    <input 
                        type="number" 
                        value={capacityBonus}
                        min={0}
                        onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            setCapacityBonus(val);
                        }}
                        className="w-8 md:w-10 h-5 md:h-6 text-[10px] md:text-xs font-bold text-center text-blue-700 bg-white/90 rounded border-none focus:ring-1 focus:ring-blue-700 shadow-sm appearance-none"
                        title="Add Capacity Bonus per Section"
                    />
                </div>
            ) : card.label === 'Low Student' ? (
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute top-1 right-1 md:top-2 md:right-2 flex items-center justify-center z-20"
                >
                    <input 
                        type="number" 
                        value={lowStudentThreshold}
                        min={0}
                        onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            if (val < 0) val = 0;
                            setLowStudentThreshold(val);
                        }}
                        className="w-8 md:w-10 h-5 md:h-6 text-[10px] md:text-xs font-bold text-center text-green-700 bg-white/90 rounded border-none focus:ring-1 focus:ring-green-700 shadow-sm appearance-none"
                        title="Set Student Threshold"
                    />
                </div>
            ) : card.label === 'Class Taken (%)' ? (
                <div 
                onClick={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute top-1 right-1 md:top-2 md:right-2 flex items-center justify-center z-20"
                >
                    <input 
                    type="number" 
                    value={classTakenThreshold}
                    min={0}
                    max={100}
                    onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) val = 0;
                            if (val < 0) val = 0;
                            if (val > 100) val = 100;
                            setClassTakenThreshold(val);
                    }}
                    className="w-8 md:w-10 h-5 md:h-6 text-[10px] md:text-xs font-bold text-center text-cyan-700 bg-white/90 rounded border-none focus:ring-1 focus:ring-cyan-700 shadow-sm appearance-none"
                    title="Set Class Taken Percentage Threshold"
                    />
                </div>
            ) : card.badge && (
                <div className={`absolute top-1 right-1 md:top-2 md:right-2 ${card.label === 'Total Courses' && missingDataCount > 0 ? 'bg-red-500 text-white animate-bounce' : 'bg-white/20'} px-1.5 py-0.5 rounded text-[10px] font-bold z-20`}>
                    {card.badge}
                </div>
            )}

            {/* View Toggle Button (Only on Active Card) */}
            {isActive && onToggleReportMode && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const targetMode = card.mode === 'missing_data' ? 'courses' : card.mode;
                        onToggleReportMode(targetMode);
                    }}
                    className="absolute bottom-1 right-1 md:bottom-2 md:right-2 p-1 md:p-1 rounded bg-white/20 hover:bg-white/40 text-white transition-colors z-20 shadow-sm backdrop-blur-sm border border-white/10"
                    title={isReport ? "Switch to List View" : "Switch to Report View"}
                >
                    {isReport ? <List className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <BarChart3 className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                </button>
            )}
            </div>
        );
      })}
    </div>
  );
};