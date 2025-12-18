
import React, { useMemo, useState } from 'react';
import { X, Building2, Calendar, Copy, Check } from 'lucide-react';
import { ClassRoomDataRow, CourseSectionData } from '../types';

interface ProgramAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    programName: string;
    programId: string;
    classroomData: ClassRoomDataRow[];
    sectionData: CourseSectionData[];
    lowStudentThreshold: number;
    selectedSemester?: string;
}

interface CategoryStats {
    roomCount: number;
    avgSlotDuration: number;
    avgSlotPerRoom: number;
    slotsPerRoom: number;
    totalSlots: number;
    
    totalCourses: number;
    totalSections: number;
    belowStudentSections: number;
    actualSections: number;
    
    slotRequirement: number;
    slotSurplus: number;
}

export const ProgramAnalysisModal: React.FC<ProgramAnalysisModalProps> = ({
    isOpen,
    onClose,
    programName,
    programId,
    classroomData = [],
    sectionData = [],
    lowStudentThreshold,
    selectedSemester
}) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [includeTheory, setIncludeTheory] = useState(true);
    const [includeLab, setIncludeLab] = useState(true);
    
    // Determine active semester: Use selectedSemester if valid, otherwise find latest from data
    const activeSemester = useMemo(() => {
        if (selectedSemester && selectedSemester !== 'All') {
            return selectedSemester;
        }

        if (!Array.isArray(sectionData) || sectionData.length === 0) return '';

        // Get all unique semester strings, ensuring they are valid
        const uniqueSemesters = Array.from(new Set(sectionData.map(s => s.Semester)))
            .filter(s => s && typeof s === 'string' && s.trim().length > 0) as string[];
        
        if (uniqueSemesters.length === 0) return '';

        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        
        // Sort descending: Year DESC, then Season Weight DESC
        const sorted = uniqueSemesters.sort((a, b) => {
            const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
            const matchA = a.match(regex);
            const matchB = b.match(regex);
            
            // If regex fails for both, fallback to simple string comparison
            if (!matchA && !matchB) return b.localeCompare(a);
            if (!matchA) return 1; // b (valid) comes first
            if (!matchB) return -1; // a (valid) comes first
            
            // Safe integer parsing with fallback
            let yearA = parseInt(matchA[2] || '0', 10);
            if (yearA < 100) yearA += 2000;
            const seasonA = (matchA[1] || '').toLowerCase(); 

            let yearB = parseInt(matchB[2] || '0', 10);
            if (yearB < 100) yearB += 2000;
            const seasonB = (matchB[1] || '').toLowerCase();
            
            if (yearA !== yearB) return yearB - yearA;
            return (seasonWeight[seasonB] || 0) - (seasonWeight[seasonA] || 0);
        });

        // Pick the top one
        return sorted.length > 0 ? sorted[0] : '';
    }, [sectionData, selectedSemester]);

    const stats = useMemo(() => {
        // Filter sections by active semester. 
        // Use trim() comparison to be robust against data anomalies.
        const currentSections = (activeSemester && Array.isArray(sectionData))
            ? sectionData.filter(s => (s.Semester || '').trim() === activeSemester.trim())
            : [];

        // Helper to categorize Room
        const isLabRoom = (type: string) => (type || '').toLowerCase().includes('lab');
        
        // Helper to categorize Section
        const isLabSection = (courseType: string) => (courseType || '').toLowerCase().includes('lab');

        // Process Rooms
        const safeClassroomData = Array.isArray(classroomData) ? classroomData : [];
        const theoryRooms = safeClassroomData.filter(r => !isLabRoom(r['Room Type']));
        const labRooms = safeClassroomData.filter(r => isLabRoom(r['Room Type']));

        const calculateRoomStats = (rooms: ClassRoomDataRow[]): Partial<CategoryStats> => {
            if (rooms.length === 0) return { roomCount: 0, avgSlotDuration: 0, avgSlotPerRoom: 0, slotsPerRoom: 0, totalSlots: 0 };

            let totalDuration = 0;
            let validDurationCount = 0;
            let totalSlotsPerRoomFromData = 0;
            let validSlotPerRoomCount = 0;
            
            // Calculate strict total slots summing each room's capacity
            let strictTotalWeeklySlots = 0;

            rooms.forEach(r => {
                const d = parseInt(r['Slot Duration'] || '0', 10);
                if (!isNaN(d) && d > 0) {
                    totalDuration += d;
                    validDurationCount++;
                }

                // Check for Slot Per Room column data
                const s = parseFloat(r['Slot Per Room'] || '0');
                if (!isNaN(s) && s > 0) {
                    totalSlotsPerRoomFromData += s;
                    validSlotPerRoomCount++;
                    strictTotalWeeklySlots += (s * 6); // 6 days a week
                } else {
                    // Fallback calculation if Slot Per Room is missing
                    const duration = (!isNaN(d) && d > 0) ? d : 90;
                    // Default operating time 540 mins (9 hours)
                    const calcSlots = Math.floor(540 / duration);
                    strictTotalWeeklySlots += (calcSlots * 6);
                }
            });

            const avgDuration = validDurationCount > 0 ? Math.round(totalDuration / validDurationCount) : 90;
            
            // Calculate Average Slot Per Room
            let avgDailySlots = 0;
            if (validSlotPerRoomCount > 0) {
                // If we have explicit data, use average of that
                avgDailySlots = parseFloat((totalSlotsPerRoomFromData / validSlotPerRoomCount).toFixed(1));
            } else {
                // Otherwise calculate based on average duration
                avgDailySlots = avgDuration > 0 ? parseFloat((540 / avgDuration).toFixed(1)) : 0;
            }
            
            return {
                roomCount: rooms.length,
                avgSlotDuration: avgDuration,
                avgSlotPerRoom: avgDailySlots,
                slotsPerRoom: rooms.length > 0 ? Math.round(strictTotalWeeklySlots / rooms.length) : 0, // Weekly average
                totalSlots: Math.round(strictTotalWeeklySlots)
            };
        };

        const theoryRoomStats = calculateRoomStats(theoryRooms);
        const labRoomStats = calculateRoomStats(labRooms);

        // Process Sections
        const theorySections = currentSections.filter(s => !isLabSection(s['Course Type']));
        const labSections = currentSections.filter(s => isLabSection(s['Course Type']));

        const calculateSectionStats = (sections: CourseSectionData[], defaultWeeklyClass: number): Partial<CategoryStats> => {
            // Count unique courses using composite key: Semester + PID + Code + Title + Credit
            const uniqueCourses = new Set(sections.map(s => 
                `${s.Semester || ''}||${s.PID || ''}||${s['Course Code'] || ''}||${s['Course Title'] || ''}||${s.Credit || ''}`
            )).size;

            // Total Section is simply the count of section entries
            const totalSections = sections.length;
            
            let belowStudentCount = 0;
            let totalWeeklyClasses = 0;

            sections.forEach(s => {
                const students = parseInt(s.Student || '0', 10);
                if (!isNaN(students) && students > 0 && students < lowStudentThreshold) {
                    belowStudentCount++;
                }

                const weekly = parseFloat(s['Weekly Class'] || '0');
                totalWeeklyClasses += (!isNaN(weekly) && weekly > 0 ? weekly : defaultWeeklyClass);
            });

            return {
                totalCourses: uniqueCourses,
                totalSections: totalSections,
                belowStudentSections: belowStudentCount,
                actualSections: totalSections - belowStudentCount,
                slotRequirement: Math.ceil(totalWeeklyClasses)
            };
        };

        const theorySecStats = calculateSectionStats(theorySections, 2);
        const labSecStats = calculateSectionStats(labSections, 2);

        return {
            Theory: {
                ...theoryRoomStats,
                ...theorySecStats,
                slotSurplus: (theoryRoomStats.totalSlots || 0) - (theorySecStats.slotRequirement || 0)
            } as CategoryStats,
            Lab: {
                ...labRoomStats,
                ...labSecStats,
                slotSurplus: (labRoomStats.totalSlots || 0) - (labSecStats.slotRequirement || 0)
            } as CategoryStats
        };

    }, [classroomData, sectionData, activeSemester, lowStudentThreshold]);

    const handleCopyReport = async () => {
        // Must select at least one
        if (!includeTheory && !includeLab) {
            alert("Please select at least one column (Theory or Lab) to copy.");
            return;
        }

        const theorySurplusColor = stats.Theory.slotSurplus >= 0 ? '#16a34a' : '#dc2626';
        const labSurplusColor = stats.Lab.slotSurplus >= 0 ? '#16a34a' : '#dc2626';

        // Helper to construct rows
        const getRow = (label: string, theoryVal: string | number, labVal: string | number) => {
            let rowHtml = `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #f3f4f6; color: #4b5563;">${label}</td>`;
            if (includeTheory) {
                rowHtml += `<td style="text-align: center; padding: 5px 10px; border-bottom: 1px solid #f3f4f6; border-left: 1px solid #f3f4f6; color: #1f2937;">${theoryVal}</td>`;
            }
            if (includeLab) {
                rowHtml += `<td style="text-align: center; padding: 5px 10px; border-bottom: 1px solid #f3f4f6; border-left: 1px solid #f3f4f6; color: #1f2937;">${labVal}</td>`;
            }
            rowHtml += `</tr>`;
            return rowHtml;
        };

        let headerCols = '';
        if (includeTheory) headerCols += `<th style="text-align: center; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; color: #1d4ed8;">Theory</th>`;
        if (includeLab) headerCols += `<th style="text-align: center; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; color: #7e22ce;">Lab</th>`;

        let footerRow = `<tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                            <td style="padding: 8px 10px; font-weight: bold; color: #1f2937;">Slot Surplus / (Deficit)</td>`;
        if (includeTheory) footerRow += `<td style="text-align: center; padding: 8px 10px; border-left: 1px solid #e2e8f0; font-weight: bold; color: ${theorySurplusColor};">${stats.Theory.slotSurplus}</td>`;
        if (includeLab) footerRow += `<td style="text-align: center; padding: 8px 10px; border-left: 1px solid #e2e8f0; font-weight: bold; color: ${labSurplusColor};">${stats.Lab.slotSurplus}</td>`;
        footerRow += `</tr>`;

        let html = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; max-width: 500px; background-color: white;">
                <div style="background-color: #f9fafb; padding: 10px 15px; border-bottom: 1px solid #e5e7eb;">
                    <h3 style="margin: 0; font-size: 14px; color: #111827;">${programName} <span style="color: #6b7280; font-weight: normal;">(${programId})</span></h3>
                    <div style="margin-top: 4px; font-size: 11px; color: #6b7280;">
                        Resource & Requirement Analysis 
                        ${activeSemester ? `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 5px;">${activeSemester}</span>` : ''}
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="text-align: left; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; color: #374151;">Metric</th>
                            ${headerCols}
                        </tr>
                    </thead>
                    <tbody>
                        ${getRow('Classroom', stats.Theory.roomCount, stats.Lab.roomCount)}
                        ${getRow('Total Slot', stats.Theory.totalSlots, stats.Lab.totalSlots)}
                        ${getRow('Slot Duration', `${stats.Theory.avgSlotDuration} min`, `${stats.Lab.avgSlotDuration} min`)}
                        ${getRow('Offered Section', stats.Theory.actualSections, stats.Lab.actualSections)}
                        ${getRow('Slot Requirement', stats.Theory.slotRequirement, stats.Lab.slotRequirement)}
                        ${footerRow}
                    </tbody>
                </table>
                <div style="background-color: #f9fafb; padding: 8px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                    * Calculations based on active semester (${activeSemester || 'None'}), 6-day week, 08:30-17:30.
                </div>
            </div>
        `;

        try {
            const blob = new Blob([html], { type: 'text/html' });
            const textBlob = new Blob([html.replace(/<[^>]+>/g, ' ')], { type: 'text/plain' });
            await navigator.clipboard.write([
                new ClipboardItem({ 
                    'text/html': blob,
                    'text/plain': textBlob
                })
            ]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy report', err);
        }
    };

    if (!isOpen) return null;

    const renderRow = (label: string, theoryVal: string | number, labVal: string | number, isSurplus = false) => (
        <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2 text-xs text-gray-600 font-medium">{label}</td>
            <td className={`px-4 py-2 text-xs text-center border-l border-gray-100 ${isSurplus ? (Number(theoryVal) < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold') : 'text-gray-800'}`}>
                {theoryVal}
            </td>
            <td className={`px-4 py-2 text-xs text-center border-l border-gray-100 ${isSurplus ? (Number(labVal) < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold') : 'text-gray-800'}`}>
                {labVal}
            </td>
        </tr>
    );

    return (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center">
                            <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                            {programName} <span className="ml-1 text-gray-400 font-normal">({programId})</span>
                        </h3>
                        <div className="flex items-center mt-0.5 space-x-2">
                            <p className="text-[10px] text-gray-500">Resource & Requirement Analysis</p>
                            {activeSemester ? (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded font-bold flex items-center">
                                    <Calendar className="w-2.5 h-2.5 mr-1" />
                                    {activeSemester}
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] rounded font-bold flex items-center">
                                    No Active Semester Data
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={handleCopyReport}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors flex items-center"
                            title="Copy Report for Email"
                        >
                            {copySuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="px-4 py-3 text-xs font-bold text-gray-700 w-1/3">Metric</th>
                                <th className="px-4 py-3 text-xs font-bold text-center text-blue-700 w-1/3 border-l border-slate-200">
                                    <div className="flex items-center justify-center space-x-2">
                                        <span>Theory</span>
                                        <input 
                                            type="checkbox" 
                                            checked={includeTheory} 
                                            onChange={(e) => setIncludeTheory(e.target.checked)}
                                            className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                            title="Include in Copy"
                                        />
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-bold text-center text-purple-700 w-1/3 border-l border-slate-200">
                                    <div className="flex items-center justify-center space-x-2">
                                        <span>Lab</span>
                                        <input 
                                            type="checkbox" 
                                            checked={includeLab} 
                                            onChange={(e) => setIncludeLab(e.target.checked)}
                                            className="w-3 h-3 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                                            title="Include in Copy"
                                        />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRow('Classroom', stats.Theory.roomCount, stats.Lab.roomCount)}
                            {renderRow('Total Slot', stats.Theory.totalSlots, stats.Lab.totalSlots)}
                            {renderRow('Slot Duration', `${stats.Theory.avgSlotDuration} min`, `${stats.Lab.avgSlotDuration} min`)}
                            {renderRow('Offered Section', stats.Theory.actualSections, stats.Lab.actualSections)}
                            {renderRow('Slot Requirement', stats.Theory.slotRequirement, stats.Lab.slotRequirement)}

                            {/* Analysis Section */}
                            <tr className="bg-slate-50 border-t-2 border-slate-100">
                                <td className="px-4 py-3 text-xs font-bold text-gray-800">Slot Surplus / (Deficit)</td>
                                <td className={`px-4 py-3 text-xs text-center border-l border-slate-200 font-bold ${stats.Theory.slotSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.Theory.slotSurplus}
                                </td>
                                <td className={`px-4 py-3 text-xs text-center border-l border-slate-200 font-bold ${stats.Lab.slotSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.Lab.slotSurplus}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div className="bg-gray-50 p-3 text-[10px] text-gray-400 text-center border-t border-gray-200">
                    * Calculations based on active semester ({activeSemester || 'None'}), 6-day week, 08:30-17:30.
                </div>
            </div>
        </div>
    );
};
