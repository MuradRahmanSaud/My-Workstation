
import { useMemo } from 'react';
import { CourseSectionData } from '../types';

export interface CourseSummaryItem {
    key: string;
    semester: string;
    ref: string;
    pid: string;
    program: string;
    courseCode: string;
    courseTitle: string;
    credit: string;
    type: string;
    courseType: string; // Added field
    totalSections: number;
    totalCapacity: number;
    unitCapacity: string; // Added for display
    weeklyClass: string; // Added for display
    totalStudents: number;
    totalVacancy: number;
    extraSections: number;
    rows: CourseSectionData[];
}

export const useCourseAggregation = (data: CourseSectionData[], capacityBonus: number = 0) => {
    return useMemo(() => {
        const map = new Map<string, CourseSummaryItem>();

        data.forEach(row => {
            // Create a composite key based on user requirements: Semester + PID + Code + Title + Credit
            const key = `${row.Semester}||${row.PID}||${row['Course Code']}||${row['Course Title']}||${row.Credit}`;
            
            if (!map.has(key)) {
                map.set(key, {
                    key: key,
                    semester: row.Semester,
                    ref: row.Ref,
                    pid: row.PID,
                    program: row.Program || row.PID,
                    courseCode: row['Course Code'],
                    courseTitle: row['Course Title'],
                    credit: row.Credit,
                    type: row.Type, 
                    courseType: row['Course Type'] || '', 
                    unitCapacity: row.Capacity || '',
                    weeklyClass: row['Weekly Class'] || '',
                    totalSections: 0,
                    totalCapacity: 0,
                    totalStudents: 0,
                    totalVacancy: 0,
                    extraSections: 0,
                    rows: []
                });
            }
            const entry = map.get(key)!;
            const capacity = parseInt(row.Capacity || '0', 10);
            const student = parseInt(row.Student || '0', 10);
            
            // If entry was initialized with empty values but this row has them, update them
            if (!entry.courseType && row['Course Type']) entry.courseType = row['Course Type'];
            if (!entry.unitCapacity && row.Capacity) entry.unitCapacity = row.Capacity;
            if (!entry.weeklyClass && row['Weekly Class']) entry.weeklyClass = row['Weekly Class'];

            entry.totalSections += 1;
            // Add individual section capacity + the global bonus
            entry.totalCapacity += (isNaN(capacity) ? 0 : capacity) + capacityBonus;
            entry.totalStudents += isNaN(student) ? 0 : student;
            entry.rows.push(row);
        });

        return Array.from(map.values()).map(item => {
            // Vacancy = Capacity - Students
            // Allow negative values (indicating over-capacity/overbooking)
            const vacancy = item.totalCapacity - item.totalStudents;
            
            // Calculate average capacity per section to determine "Extra Sections"
            // Since item.totalCapacity already includes the bonus for each section, 
            // the average will correctly reflect (Base Capacity + Bonus).
            const avgCapacity = item.totalSections > 0 ? Math.round(item.totalCapacity / item.totalSections) : 0;
            
            // Extra Sections: Only if vacancy is positive and greater than or equal to the average capacity of one section
            // Formula: floor(Vacancy / Average Capacity)
            const extraSections = (vacancy > 0 && avgCapacity > 0) 
                ? Math.floor(vacancy / avgCapacity) 
                : 0;

            return {
                ...item,
                totalVacancy: vacancy,
                extraSections: extraSections
            };
        });
    }, [data, capacityBonus]);
};
