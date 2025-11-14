import { useMemo } from 'react';
import { SectionData, CourseSummaryData, TeacherSummaryData, ProgramData } from '../types';

export const useSectionDataProcessor = (
  filteredData: SectionData[],
  programData: ProgramData[],
  lowStudentThreshold: number,
  classTakenThreshold: number,
) => {

  const programMap = useMemo(() => 
      new Map(programData.map(p => [p.PID, p['Program Short Name']])), 
  [programData]);

  const dashboardStats = useMemo(() => {
    if (filteredData.length === 0) {
      return { totalCourses: 0, totalSections: 0, totalTeachers: 0, totalUnassigned: 0 };
    }
    const uniqueCourseKeys = new Set(
        filteredData.map(d => `${d.Semester}-${d.PID}-${d['Course Code']}-${d['Course Title']}-${d.Credit}`)
    );
    const totalCourses = uniqueCourseKeys.size;
    const totalSections = filteredData.length;
    const totalTeachers = new Set(filteredData.map(d => d['Teacher ID']).filter(Boolean)).size;
    const totalUnassigned = filteredData.filter(d => !d['Teacher ID']).length;
    return { totalCourses, totalSections, totalTeachers, totalUnassigned };
  }, [filteredData]);

  const incompleteSectionsData = useMemo(() => {
    return filteredData.filter(
      (section) => !section['Course Type'] || !section['Section Capacity'] || !section['Weekly Class']
    );
  }, [filteredData]);

  const incompleteCourseKeys = useMemo(() => {
    return new Set(
      incompleteSectionsData.map(s => `${s.PID}-${s['Course Code']}`)
    );
  }, [incompleteSectionsData]);
  
  const hasIncompleteCourseData = useMemo(() => {
    return incompleteSectionsData.length > 0;
  }, [incompleteSectionsData]);

  const lowStudentSectionsData = useMemo(() => {
    return filteredData.filter(section => (parseInt(section.Student, 10) || 0) < lowStudentThreshold);
  }, [filteredData, lowStudentThreshold]);
  
  const lowStudentCount = useMemo(() => {
    return lowStudentSectionsData.length;
  }, [lowStudentSectionsData]);

  const maxStudentCount = useMemo(() => 
    Math.max(0, ...filteredData.map(s => parseInt(s.Student, 10) || 0)),
  [filteredData]);

  const lowClassTakenSectionsData = useMemo(() => {
    return filteredData.filter(section => {
        const studentCount = parseInt(section.Student, 10) || 0;
        const classTaken = parseInt(section['Class Taken'], 10) || 0;
        return studentCount > lowStudentThreshold && classTaken <= classTakenThreshold;
    });
  }, [filteredData, classTakenThreshold, lowStudentThreshold]);

  const lowClassTakenCount = useMemo(() => {
    return lowClassTakenSectionsData.length;
  }, [lowClassTakenSectionsData]);

  const maxClassTaken = useMemo(() =>
    Math.max(0, ...filteredData.map(s => parseInt(s['Class Taken'], 10) || 0)),
  [filteredData]);

  const courseSummaryData = useMemo(() => {
    // Verbose implementation to ensure clarity and correctness.
    // 1. Group all sections by their unique course identifier.
    const sectionsByCourse: Record<string, SectionData[]> = {};
    for (const section of filteredData) {
      const key = `${section.PID}-${section['Course Code']}`;
      if (!sectionsByCourse[key]) {
        sectionsByCourse[key] = [];
      }
      sectionsByCourse[key].push(section);
    }

    // 2. Process each group to create a course summary.
    const summary: CourseSummaryData[] = [];
    for (const key in sectionsByCourse) {
      const sectionsInCourse = sectionsByCourse[key];
      const representativeSection = sectionsInCourse[0];

      // Calculate totals by iterating through all sections of the course.
      let totalCapacity = 0;
      let totalStudents = 0;
      for (const s of sectionsInCourse) {
        totalCapacity += parseInt(s['Section Capacity'], 10) || 0;
        totalStudents += parseInt(s.Student, 10) || 0;
      }
      
      // IMPORTANT: Per user request, the 'Credit' value is taken from a single
      // representative section. It is NOT a sum of credits.
      const courseCredit = representativeSection.Credit;
      
      const semesters = [...new Set(sectionsInCourse.map(s => s.Semester).filter(Boolean))].sort().join(', ');

      summary.push({
        PID: representativeSection.PID,
        'Course Code': representativeSection['Course Code'],
        'Course Title': representativeSection['Course Title'],
        Credit: courseCredit,
        'Course Type': representativeSection['Course Type'],
        Type: representativeSection.Type,
        'Program Short Name': programMap.get(representativeSection.PID) || 'N/A',
        Section: sectionsInCourse.length,
        Capacity: totalCapacity,
        Student: totalStudents,
        Vacancy: totalCapacity - totalStudents,
        Semester: semesters,
      });
    }
    return summary;
  }, [filteredData, programMap]);

  const teacherSummaryData = useMemo(() => {
    const groupedByTeacher = filteredData.reduce((acc, section) => {
      const teacherId = section['Teacher ID'];
      if (!teacherId) return acc;

      if (!acc[teacherId]) {
        acc[teacherId] = {
          'Teacher ID': teacherId,
          'Teacher Name': section['Teacher Name'],
          Designation: section.Designation,
          'Credit Load': 0,
          'Student Count': 0,
          'Total Sections': 0,
          Mobile: section.Mobile,
          Email: section['E-mail'],
        };
      }

      acc[teacherId]['Credit Load'] += parseFloat(section.Credit) || 0;
      acc[teacherId]['Student Count'] += parseInt(section.Student, 10) || 0;
      acc[teacherId]['Total Sections'] += 1;

      return acc;
    }, {} as Record<string, TeacherSummaryData>);

    return Object.values(groupedByTeacher);
  }, [filteredData]);
  
  const unassignedSectionsData = useMemo(() => {
    return filteredData.filter(section => !section['Teacher ID']);
  }, [filteredData]);

  return {
    dashboardStats,
    hasIncompleteCourseData,
    incompleteSectionsData,
    incompleteCourseKeys,
    lowStudentSectionsData,
    lowStudentCount,
    maxStudentCount,
    lowClassTakenSectionsData,
    lowClassTakenCount,
    maxClassTaken,
    courseSummaryData,
    teacherSummaryData,
    unassignedSectionsData,
    programMap,
  };
};