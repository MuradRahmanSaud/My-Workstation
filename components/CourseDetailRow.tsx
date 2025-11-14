import React from 'react';
import { SectionData, CourseSummaryData } from '../types';

interface CourseDetailRowProps {
  course: CourseSummaryData;
  allSections: SectionData[];
}

const nestedHeaders: { label: string; key: keyof SectionData; align?: 'center' }[] = [
  { label: 'SECTION', key: 'Section', align: 'center' },
  { label: 'STUDENT', key: 'Student', align: 'center' },
  { label: 'CAPACITY', key: 'Section Capacity', align: 'center' },
  { label: 'CLASS TAKEN', key: 'Class Taken', align: 'center' },
  { label: 'TYPE', key: 'Course Type', align: 'center' },
  { label: 'TEACHER', key: 'Teacher Name' },
];

export const CourseDetailRow: React.FC<CourseDetailRowProps> = ({ course, allSections }) => {
  const sectionsForCourse = allSections.filter(
    section => section.PID === course.PID && section['Course Code'] === course['Course Code']
  ).sort((a, b) => a.Section.localeCompare(b.Section));

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
          {sectionsForCourse.map(section => (
            <tr key={section.Ref}>
              {nestedHeaders.map(h => (
                <td key={h.key as string} className={`px-3 py-1.5 whitespace-nowrap ${h.align === 'center' ? 'text-center' : ''}`}>
                  {h.key === 'Teacher Name' ? (
                    (() => {
                      const teacherName = section['Teacher Name'] || 'Not Assigned';
                      const designation = section.Designation;
                      const teacherId = section['Teacher ID'];
                      let displayText = teacherName;
                      if (designation) {
                          displayText = `${displayText}, ${designation}`;
                      }
                      if (teacherId) {
                          displayText = `${displayText} (${teacherId})`;
                      }
                      return displayText;
                    })()
                  ) : (
                    section[h.key]
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
