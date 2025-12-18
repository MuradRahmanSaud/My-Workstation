
import { useMemo } from 'react';
import { CourseSectionData } from '../types';

export interface TeacherSummaryItem {
    key: string;
    teacherId: string;
    teacherName: string;
    designation: string;
    creditLoad: number;
    studentCount: number;
    totalSections: number;
    mobile: string;
    email: string;
    rows: CourseSectionData[];
}

export const useTeacherAggregation = (data: CourseSectionData[]) => {
    return useMemo(() => {
        const map = new Map<string, TeacherSummaryItem>();

        data.forEach(row => {
            const teacherId = row['Teacher ID'];
            
            // Skip rows without a valid teacher ID or TBA
            if (!teacherId || teacherId.trim() === '' || teacherId === 'TBA') {
                return;
            }

            if (!map.has(teacherId)) {
                map.set(teacherId, {
                    key: teacherId,
                    teacherId: teacherId,
                    teacherName: row['Employee Name'] || '-',
                    designation: row.Designation || '-',
                    creditLoad: 0,
                    studentCount: 0,
                    totalSections: 0,
                    mobile: row['Mobile Number'] || '-',
                    email: row.Email || '-',
                    rows: []
                });
            }

            const entry = map.get(teacherId)!;
            const credit = parseFloat(row.Credit || '0');
            const students = parseInt(row.Student || '0', 10);

            entry.creditLoad += isNaN(credit) ? 0 : credit;
            entry.studentCount += isNaN(students) ? 0 : students;
            entry.totalSections += 1;
            entry.rows.push(row);
        });

        return Array.from(map.values());
    }, [data]);
};
