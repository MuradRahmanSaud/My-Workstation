import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { SectionIcon } from './icons/SectionIcon';
import { UserQuestionIcon } from './icons/UserQuestionIcon';
import { UserMinusIcon } from './icons/UserMinusIcon';

interface DashboardMetricsProps {
    totalCourses: number;
    totalSections: number;
    totalTeachers: number;
    totalUnassigned: number;
    lowStudentCount: number;
    lowStudentThreshold: number;
    onLowStudentThresholdChange: (value: number) => void;
    onSelectCoursesView: () => void;
    onSelectSectionsView: () => void;
    onSelectTeachersView: () => void;
    onSelectUnassignedView: () => void;
    onSelectLowStudentView: () => void;
    maxStudentCount: number;
    classTakenCount: number;
    classTakenThreshold: number;
    onClassTakenThresholdChange: (value: number) => void;
    onSelectClassTakenView: () => void;
    maxClassTaken: number;
    activeView: 'sections' | 'courses' | 'teachers' | 'unassigned' | 'lowStudent' | 'lowClassTaken';
    hasIncompleteCourseData: boolean;
    onToggleCourseValidationSheet: () => void;
}

const MetricCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    color: string;
    ringColor: string;
    onClick?: () => void;
    isActive?: boolean;
}> = ({ icon, title, value, color, ringColor, onClick, isActive = false }) => {
    
    const cardClasses = `w-full text-left ${color} rounded-lg shadow p-3 flex items-center transition-all duration-200 text-white
    ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
    ${isActive ? `ring-2 ${ringColor}` : ''}`;

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={cardClasses}
        >
            <div className="rounded-full p-2 bg-white/20">
                {icon}
            </div>
            <div className="ml-3">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs font-medium opacity-80">{title}</p>
            </div>
        </button>
    );
};

const ThresholdMetricCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    color: string;
    ringColor: string;
    onClick?: () => void;
    isActive?: boolean;
    threshold: number;
    onThresholdChange: (value: number) => void;
    inputAriaLabel: string;
    max: number;
}> = ({ icon, title, value, color, ringColor, onClick, isActive = false, threshold, onThresholdChange, inputAriaLabel, max }) => {
    
    const cardClasses = `w-full text-left ${color} rounded-lg shadow p-3 flex items-center transition-all duration-200 text-white
    ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
    ${isActive ? `ring-2 ${ringColor}` : ''}`;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === '') {
            onThresholdChange(0);
            return;
        }
        let numValue = parseInt(e.target.value, 10);
        if (!isNaN(numValue)) {
            if (numValue < 0) numValue = 0;
            if (numValue > max) numValue = max;
            onThresholdChange(numValue);
        }
    };
    
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={cardClasses}
        >
            <div className="rounded-full p-2 bg-white/20">
                {icon}
            </div>
            <div className="ml-3 flex-1 text-left">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs font-medium opacity-80">{title}</p>
            </div>
            <input
                type="number"
                min="0"
                max={max}
                value={threshold}
                onChange={handleInputChange}
                onClick={(e) => e.stopPropagation()}
                className="w-12 text-center text-sm font-semibold bg-white/30 text-white rounded border border-white/50 placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white py-0.5"
                aria-label={inputAriaLabel}
            />
        </button>
    );
};

const CourseMetricCard: React.FC<{
    totalCourses: number;
    hasIncompleteCourseData: boolean;
    onToggleCourseValidationSheet: () => void;
    onSelectCoursesView: () => void;
    isActive: boolean;
}> = ({ totalCourses, hasIncompleteCourseData, onToggleCourseValidationSheet, onSelectCoursesView, isActive }) => {
    
    const cardClasses = `w-full text-left bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow p-3 flex items-center transition-all duration-200 text-white
    ${'cursor-pointer hover:shadow-lg'}
    ${isActive ? 'ring-2 ring-blue-300' : ''}`;

    const handleBookIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleCourseValidationSheet();
    };

    return (
        <div className={cardClasses} onClick={onSelectCoursesView}>
            <div className="relative">
                <button
                    onClick={handleBookIconClick}
                    className="rounded-full p-2 bg-white/20 hover:bg-white/30"
                    aria-label="Show course validation sheet"
                    title="Show incomplete course data sheet"
                >
                    <BookOpenIcon className="h-6 w-6 text-white" />
                </button>
                {hasIncompleteCourseData && (
                    <span className="absolute top-0 right-0 pointer-events-none">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    </span>
                )}
            </div>
            
            <div className="ml-3 flex-1 text-left">
                <p className="text-xl font-bold">{totalCourses}</p>
                <p className="text-xs font-medium opacity-80">Total Courses</p>
            </div>
        </div>
    );
};


export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
    totalCourses,
    totalSections,
    totalTeachers,
    totalUnassigned,
    lowStudentCount,
    lowStudentThreshold,
    onLowStudentThresholdChange,
    onSelectCoursesView,
    onSelectSectionsView,
    onSelectTeachersView,
    onSelectUnassignedView,
    onSelectLowStudentView,
    maxStudentCount,
    classTakenCount,
    classTakenThreshold,
    onClassTakenThresholdChange,
    onSelectClassTakenView,
    maxClassTaken,
    activeView,
    hasIncompleteCourseData,
    onToggleCourseValidationSheet,
}) => {
    return (
        <div className="px-4 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-dark-primary">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <CourseMetricCard 
                    totalCourses={totalCourses}
                    hasIncompleteCourseData={hasIncompleteCourseData}
                    onToggleCourseValidationSheet={onToggleCourseValidationSheet}
                    onSelectCoursesView={onSelectCoursesView}
                    isActive={activeView === 'courses'}
                />
                 <MetricCard 
                    title="Total Sections" 
                    value={totalSections}
                    color="bg-gradient-to-br from-purple-400 to-purple-600"
                    ringColor="ring-purple-300"
                    icon={<SectionIcon className="h-6 w-6 text-white" />} 
                    onClick={onSelectSectionsView}
                    isActive={activeView === 'sections'}
                />
                <MetricCard 
                    title="Total Teachers" 
                    value={totalTeachers} 
                    color="bg-gradient-to-br from-yellow-400 to-orange-500"
                    ringColor="ring-yellow-300"
                    icon={<UsersIcon className="h-6 w-6 text-white" />}
                    onClick={onSelectTeachersView}
                    isActive={activeView === 'teachers'}
                />
                <MetricCard 
                    title="Total Unassigned" 
                    value={totalUnassigned}
                    color="bg-gradient-to-br from-red-400 to-red-600"
                    ringColor="ring-red-300"
                    icon={<UserQuestionIcon className="h-6 w-6 text-white" />} 
                    onClick={onSelectUnassignedView}
                    isActive={activeView === 'unassigned'}
                />
                <ThresholdMetricCard
                    title="Low Student"
                    value={lowStudentCount}
                    color="bg-gradient-to-br from-green-400 to-green-600"
                    ringColor="ring-green-300"
                    icon={<UserMinusIcon className="h-6 w-6 text-white" />}
                    onClick={onSelectLowStudentView}
                    isActive={activeView === 'lowStudent'}
                    threshold={lowStudentThreshold}
                    onThresholdChange={onLowStudentThresholdChange}
                    inputAriaLabel="Low student threshold"
                    max={maxStudentCount}
                />
                <ThresholdMetricCard 
                    title="Class Taken" 
                    value={classTakenCount} 
                    color="bg-gradient-to-br from-cyan-400 to-cyan-600"
                    ringColor="ring-cyan-300"
                    icon={<CalculatorIcon className="h-6 w-6 text-white" />} 
                    onClick={onSelectClassTakenView}
                    isActive={activeView === 'lowClassTaken'}
                    threshold={classTakenThreshold}
                    onThresholdChange={onClassTakenThresholdChange}
                    inputAriaLabel="Class taken threshold"
                    max={maxClassTaken}
                />
            </div>
        </div>
    );
};