
import React from 'react';
import { CourseSectionData } from '../types';

interface SectionTableProps {
    data: CourseSectionData[]; 
    isDashboardMode: boolean;
    headerColor?: string;
    onRowClick?: (row: CourseSectionData) => void;
    selectedRow?: CourseSectionData | null;
    isPanelOpen?: boolean;
}

export const SectionTable: React.FC<SectionTableProps> = ({ data, isDashboardMode, headerColor, onRowClick, selectedRow, isPanelOpen = false }) => {
    const columns = isPanelOpen ? [
        'COURSE CODE', 
        'COURSE TITLE', 
        'CREDIT',
        'SECTION', 
        'COURSE TYPE', 
        'STUDENTS',
        'CLASSES TAKEN'
    ] : [
        'COURSE CODE', 
        'COURSE TITLE', 
        'SECTION', 
        'CREDIT', 
        'COURSE TYPE', 
        'STUDENTS', 
        'CAPACITY', 
        'CLASS TAKEN %',
        'CLASSES TAKEN', 
        'CLASS REQUIREMENT', 
        'REMAINING', 
        'WEEKLY CLASS', 
        'TEACHER'
    ];

    const headerClass = isDashboardMode ? (headerColor || 'bg-[#9333ea]') : 'bg-slate-100';

    // Helper to check selection equality safely
    const isSelected = (row: CourseSectionData) => {
        if (!selectedRow) return false;
        // Check exact reference match first
        if (row === selectedRow) return true;
        
        // Fallback to strict composite key match
        return (
            row.Ref === selectedRow.Ref && 
            row.Section === selectedRow.Section && 
            row.Semester === selectedRow.Semester &&
            row['Course Code'] === selectedRow['Course Code'] &&
            row.PID === selectedRow.PID
        );
    };

    return (
        <table className="w-full text-left border-collapse">
            <thead className={`${headerClass} sticky top-0 z-10 shadow-sm border-b border-gray-200`}>
                <tr>
                    {columns.map((col) => (
                        <th key={col} className={`px-2 py-2 text-[10px] font-bold ${isDashboardMode ? 'text-white' : 'text-slate-500'} uppercase tracking-wider whitespace-nowrap ${col === 'TEACHER' || col === 'COURSE TITLE' ? 'text-left' : 'text-center'}`}>
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {data.map((row: any, idx) => {
                    // Calculation for Remaining
                    const req = parseFloat(row.ClassRequirement || '0');
                    const taken = parseFloat(row['Class Taken'] || '0');
                    const remaining = isNaN(req) ? 0 : (req - (isNaN(taken) ? 0 : taken));
                    
                    // Calculation for Percentage
                    let percentage = 0;
                    if (req > 0) {
                        percentage = (taken / req) * 100;
                    } else if (taken > 0) {
                        percentage = 100;
                    }
                    const percentageDisplay = percentage > 100 ? 100 : Math.round(percentage);
                    
                    // Color logic for percentage
                    let percentageColor = 'text-gray-600';
                    if (percentage < 30) percentageColor = 'text-red-600 font-bold';
                    else if (percentage < 60) percentageColor = 'text-orange-500 font-bold';
                    else if (percentage >= 100) percentageColor = 'text-green-600 font-bold';

                    const active = isSelected(row);

                    return (
                        <tr 
                            key={idx} 
                            onClick={() => onRowClick && onRowClick(row)}
                            className={`
                                transition-colors group text-[11px] text-gray-700 leading-none h-[29px] cursor-pointer
                                ${active 
                                    ? 'bg-blue-100 border-l-4 border-blue-600' 
                                    : 'hover:bg-blue-50/60 border-l-4 border-transparent'
                                }
                            `}
                        >
                            <td className="px-2 py-1 text-center font-bold text-blue-600">{row['Course Code'] || '-'}</td>
                            <td className="px-2 py-1 text-left max-w-[200px] truncate" title={row['Course Title']}>{row['Course Title'] || '-'}</td>
                            
                            {/* Credit: Shown here if panel open (before Section) */}
                            {isPanelOpen && <td className="px-2 py-1 text-center">{row.Credit || '-'}</td>}
                            
                            <td className="px-2 py-1 text-center font-bold">{row.Section || '-'}</td>
                            
                            {/* Credit: Shown here if panel closed (after Section) */}
                            {!isPanelOpen && <td className="px-2 py-1 text-center">{row.Credit || '-'}</td>}
                            
                            <td className={`px-2 py-1 text-center ${!row['Course Type'] ? 'bg-red-100 text-red-600 font-bold' : ''}`}>
                                {row['Course Type'] || '-'}
                            </td>
                            <td className="px-2 py-1 text-center">{row.Student || '0'}</td>
                            
                            {/* Class Taken: Shown here if panel open (after Student) */}
                            {isPanelOpen && <td className="px-2 py-1 text-center">{row['Class Taken'] || '-'}</td>}

                            {!isPanelOpen && (
                                <>
                                    <td className={`px-2 py-1 text-center font-bold ${!row.Capacity ? 'bg-red-100 text-red-600' : 'text-red-500'}`}>
                                        {row.Capacity || '-'}
                                    </td>
                                    <td className={`px-2 py-1 text-center ${percentageColor}`}>
                                        {percentageDisplay}%
                                    </td>
                                    <td className="px-2 py-1 text-center">{row['Class Taken'] || '-'}</td>
                                    <td className="px-2 py-1 text-center font-medium text-blue-600">
                                        {row.ClassRequirement || '-'}
                                    </td>
                                    <td className={`px-2 py-1 text-center font-bold ${remaining > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                        {remaining}
                                    </td>
                                    <td className={`px-2 py-1 text-center font-medium ${!row['Weekly Class'] ? 'bg-red-100 text-red-600' : 'text-gray-600'}`}>
                                        {row['Weekly Class'] || '-'}
                                    </td>
                                    <td className="px-2 py-1 text-left whitespace-nowrap">
                                        {(() => {
                                            const tid = row['Teacher ID'];
                                            const name = row['Employee Name'];
                                            const desig = row['Designation'];

                                            if (!tid || tid === 'TBA') return <span className="text-gray-400">TBA</span>;
                                            
                                            return (
                                                <span>
                                                    {name || tid}
                                                    {desig ? `, ${desig}` : ''}
                                                    {name ? ` (${tid})` : ''}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </>
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </table>
      );
};
