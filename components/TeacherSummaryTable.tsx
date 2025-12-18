
import React from 'react';
import { TeacherSummaryItem } from '../hooks/useTeacherAggregation';
import { CourseSectionData } from '../types';

interface TeacherSummaryTableProps {
    data: TeacherSummaryItem[];
    expandedKeys: Set<string>;
    toggleRow: (key: string) => void;
    headerColor?: string;
    onRowClick?: (row: TeacherSummaryItem) => void;
}

export const TeacherSummaryTable: React.FC<TeacherSummaryTableProps> = ({ data, expandedKeys, toggleRow, headerColor, onRowClick }) => {

    const renderExpandedDetails = (rows: CourseSectionData[]) => {
        const columns = ['PROGRAM', 'COURSE CODE', 'COURSE TITLE', 'CREDIT', 'SECTION', 'STUDENTS', 'CLASS TAKEN'];
        const dataKeys: Record<string, keyof CourseSectionData> = {
            'PROGRAM': 'Program',
            'COURSE CODE': 'Course Code',
            'COURSE TITLE': 'Course Title',
            'CREDIT': 'Credit',
            'SECTION': 'Section',
            'STUDENTS': 'Student',
            'CLASS TAKEN': 'Class Taken'
        };

        return (
            <div className="p-3 bg-purple-50/50 shadow-inner">
                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-200 border-b border-slate-300">
                            <tr>
                                {columns.map((col) => (
                                    <th key={col} className={`px-2 py-1.5 font-bold text-gray-700 uppercase tracking-wider ${col === 'COURSE TITLE' ? 'text-left' : 'text-center'}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-center font-medium text-gray-600">{row.Program || '-'}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-blue-600">{row['Course Code'] || '-'}</td>
                                    <td className="px-2 py-1.5 text-left text-gray-700 max-w-[200px] truncate" title={row['Course Title']}>{row['Course Title'] || '-'}</td>
                                    <td className="px-2 py-1.5 text-center text-gray-600">{row.Credit || '-'}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-gray-700">{row.Section || '-'}</td>
                                    <td className="px-2 py-1.5 text-center">{row.Student || '0'}</td>
                                    <td className="px-2 py-1.5 text-center">{row['Class Taken'] || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const columns = [
        'TEACHER ID', 'TEACHER NAME', 'DESIGNATION', 'CREDIT LOAD', 
        'STUDENT COUNT', 'TOTAL SECTIONS', 'MOBILE', 'EMAIL'
    ];

    return (
        <table className="w-full text-left border-collapse">
            <thead className={`${headerColor || 'bg-[#9333ea]'} sticky top-0 z-10 shadow-sm border-b border-gray-200`}>
                <tr className={`border-l-4 ${headerColor ? 'border-transparent' : 'border-[#9333ea]'}`}>
                    {columns.map((col, idx) => (
                        <th key={idx} className={`px-2 py-2 text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap ${col === 'TEACHER NAME' || col === 'DESIGNATION' || col === 'EMAIL' ? 'text-left' : 'text-center'}`}>
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {data.map((row) => {
                    const isExpanded = expandedKeys.has(row.key);
                    return (
                        <React.Fragment key={row.key}>
                            <tr
                                onClick={() => onRowClick ? onRowClick(row) : toggleRow(row.key)}
                                className={`cursor-pointer transition-colors group text-[11px] leading-none h-[29px] border-l-4 ${isExpanded ? 'bg-purple-100 border-purple-600' : 'hover:bg-purple-50 border-transparent'}`}
                            >
                                <td className="px-2 py-1 text-center font-bold text-gray-700">{row.teacherId}</td>
                                <td className="px-2 py-1 text-left font-medium text-blue-700">{row.teacherName}</td>
                                <td className="px-2 py-1 text-left text-gray-600">{row.designation}</td>
                                <td className="px-2 py-1 text-center font-bold text-gray-800">{row.creditLoad.toFixed(1)}</td>
                                <td className="px-2 py-1 text-center text-gray-700">{row.studentCount}</td>
                                <td className="px-2 py-1 text-center font-bold text-purple-600">{row.totalSections}</td>
                                <td className="px-2 py-1 text-center text-gray-600">{row.mobile}</td>
                                <td className="px-2 py-1 text-left text-gray-600">{row.email}</td>
                            </tr>
                            {isExpanded && !onRowClick && (
                                <tr>
                                    <td colSpan={columns.length} className="p-0 border-b border-gray-200">
                                        {renderExpandedDetails(row.rows)}
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
    );
};
