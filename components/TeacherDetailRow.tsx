import React from 'react';
import { SectionData, TeacherSummaryData } from '../types';

interface TeacherDetailRowProps {
  teacher: TeacherSummaryData;
  allSections: SectionData[];
  programMap: Map<string, string>;
}

const nestedHeaders: { label: string; key: keyof SectionData | 'Program'; align?: 'center' }[] = [
    { label: 'PROGRAM', key: 'Program' },
    { label: 'COURSE CODE', key: 'Course Code' },
    { label: 'COURSE TITLE', key: 'Course Title' },
    { label: 'CREDIT', key: 'Credit', align: 'center' },
    { label: 'SECTION', key: 'Section', align: 'center' },
    { label: 'STUDENTS', key: 'Student', align: 'center' },
    { label: 'CLASS TAKEN', key: 'Class Taken', align: 'center' },
];

export const TeacherDetailRow: React.FC<TeacherDetailRowProps> = ({ teacher, allSections, programMap }) => {
  const sectionsForTeacher = allSections.filter(
    (section) => section['Teacher ID'] === teacher['Teacher ID']
  ).sort((a, b) => a['Course Code'].localeCompare(b['Course Code']));
  
  return (
    <div className="p-3 bg-gray-50 dark:bg-dark-primary">
        <table className="w-full text-sm">
            <thead className="bg-gray-200 dark:bg-dark-accent/50 text-xs uppercase">
                <tr>
                    {nestedHeaders.map(h => (
                        <th key={h.key as string} className={`px-3 py-2 font-semibold text-left ${h.align === 'center' ? 'text-center' : ''}`}>
                            {h.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
                {sectionsForTeacher.map(section => (
                    <tr key={section.Ref}>
                        {nestedHeaders.map(h => (
                            <td key={h.key as string} className={`px-3 py-1.5 whitespace-nowrap ${h.align === 'center' ? 'text-center' : ''}`}>
                                {h.key === 'Program' ? (
                                    programMap.get(section.PID) || section.PID
                                ) : (
                                    section[h.key as keyof SectionData]
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};
