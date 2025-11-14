import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SectionData, AttributeFilters } from '../types';

const SPECIAL_COURSES = ['THESIS', 'PROJECT', 'INTERNSHIP', 'VIVA'];

export const useSectionFilters = (sheetData: SectionData[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [selectedPids, setSelectedPids] = useState<string[]>([]);
  const isInitialFilterSet = useRef(false);
  
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilters>({
    teachers: [],
    courseTypes: [],
    types: [],
    credits: [],
    capacities: [],
    studentCount: { min: '', max: '' },
    classesTaken: { min: '', max: '' },
  });

  const sortedSemesters = useMemo(() => {
    if (sheetData.length === 0) return [];

    const semesters = [...new Set(sheetData.map(item => item.Semester).filter(Boolean))];

    const getSemesterValue = (semester: string) => {
        const parts = semester.split(' ');
        if (parts.length !== 2) return 0; // Handle unexpected format
        const [season, yearStr] = parts;
        const year = parseInt(yearStr, 10);
        if (isNaN(year)) return 0;

        let seasonValue;
        switch (season.toLowerCase()) {
            case 'spring': seasonValue = 1; break;
            case 'summer': seasonValue = 2; break;
            case 'fall':   seasonValue = 3; break;
            default:       seasonValue = 0;
        }
        return year * 10 + seasonValue;
    };
    
    return semesters.sort((a, b) => getSemesterValue(b) - getSemesterValue(a));
  }, [sheetData]);

  const resetFilters = useCallback(() => {
    // Reset semester to the latest one.
    const latestSemester = sortedSemesters.length > 0 ? sortedSemesters[0] : undefined;
    setSelectedSemesters(latestSemester ? [latestSemester] : []);
    
    // Reset other filters to their initial/empty state.
    setSelectedPids([]);
    setSearchTerm('');

    // Set initial attribute filters to exclude special courses and pre-select empty values.
    const allCourseTypes = [...new Set(sheetData.map(d => d['Course Type']))];
    const courseTypesWithValues = allCourseTypes.filter((ct): ct is string => !!ct);
    let initialCourseTypes = courseTypesWithValues.filter(type => 
        !SPECIAL_COURSES.some(special => type.toUpperCase().includes(special))
    );
    if (sheetData.some(d => !d['Course Type'])) {
        initialCourseTypes.push('(Empty)');
    }

    const allCapacities = [...new Set(sheetData.map(d => d['Section Capacity']))];
    const hasEmptyCapacity = allCapacities.some(c => !c);
    const initialCapacities = allCapacities.filter((c): c is string => !!c);
    if (hasEmptyCapacity) {
      initialCapacities.push('(Empty)');
    }

    setAttributeFilters({
        teachers: [],
        courseTypes: initialCourseTypes,
        types: [],
        credits: [],
        capacities: initialCapacities,
        studentCount: { min: '', max: '' },
        classesTaken: { min: '', max: '' },
    });
  }, [sheetData, sortedSemesters]);

  useEffect(() => {
    if (sheetData.length > 0 && !isInitialFilterSet.current) {
        resetFilters();
        isInitialFilterSet.current = true;
    }
  }, [sheetData, resetFilters]);


  const filteredData = useMemo(() => {
    let data = sheetData;

    // 1. Filter by Program (from filter panel)
    if (selectedPids.length > 0) {
        data = data.filter(row => selectedPids.includes(row.PID));
    }

    // 2. Apply attribute filters
    const { teachers, courseTypes, types, credits, capacities, studentCount, classesTaken } = attributeFilters;

    if (courseTypes.length > 0) {
      const hasEmptyFilter = courseTypes.includes('(Empty)');
      const otherCourseTypes = courseTypes.filter(ct => ct !== '(Empty)');
      data = data.filter(row => {
          const rowValue = row['Course Type'];
          if (hasEmptyFilter && !rowValue) return true;
          if (otherCourseTypes.includes(rowValue)) return true;
          return false;
      });
    }
    if (teachers.length > 0) {
      data = data.filter(row => row['Teacher Name'] && teachers.includes(row['Teacher Name']));
    }
    if (types.length > 0) {
      data = data.filter(row => row.Type && types.includes(row.Type));
    }
    if (credits.length > 0) {
      data = data.filter(row => row.Credit && credits.includes(row.Credit));
    }
    if (capacities.length > 0) {
      const hasEmptyFilter = capacities.includes('(Empty)');
      const otherCapacities = capacities.filter(c => c !== '(Empty)');
      data = data.filter(row => {
          const rowValue = row['Section Capacity'];
          if (hasEmptyFilter && !rowValue) return true;
          if (otherCapacities.includes(rowValue)) return true;
          return false;
      });
    }
    
    const studentMin = studentCount.min !== '' ? parseInt(studentCount.min, 10) : -Infinity;
    const studentMax = studentCount.max !== '' ? parseInt(studentCount.max, 10) : Infinity;
    if (isFinite(studentMin) || isFinite(studentMax)) {
        data = data.filter(row => {
            const count = parseInt(row.Student, 10);
            if (isNaN(count)) return false;
            return count >= studentMin && count <= studentMax;
        });
    }

    const classesMin = classesTaken.min !== '' ? parseInt(classesTaken.min, 10) : -Infinity;
    const classesMax = classesTaken.max !== '' ? parseInt(classesTaken.max, 10) : Infinity;
     if (isFinite(classesMin) || isFinite(classesMax)) {
        data = data.filter(row => {
            const count = parseInt(row['Class Taken'], 10);
            if (isNaN(count)) return false;
            return count >= classesMin && count <= classesMax;
        });
    }

    // 3. Filter by selected semesters (from header)
    data = data.filter(row => selectedSemesters.length === 0 || (row.Semester && selectedSemesters.includes(row.Semester)));
    
    // 4. Filter by global search term (from header)
    if (searchTerm) {
        data = data.filter(row =>
            Object.values(row).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }

    return data;

  }, [sheetData, selectedSemesters, searchTerm, selectedPids, attributeFilters]);

  return {
    searchTerm,
    setSearchTerm,
    selectedSemesters,
    setSelectedSemesters,
    selectedPids,
    setSelectedPids,
    sortedSemesters,
    filteredData,
    attributeFilters,
    setAttributeFilters,
    resetFilters,
  };
};