
import { useState, useMemo, useEffect } from 'react';
import { CourseSectionData, ProgramDataRow } from '../types';

export const useSectionFilters = (data: CourseSectionData[], programData: ProgramDataRow[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setInternalSemesterFilter] = useState('All');
  const [userHasSelected, setUserHasSelected] = useState(false);

  // Advanced Filters State - Programs
  const [selectedFaculties, setSelectedFaculties] = useState<Set<string>>(new Set());
  const [selectedProgramTypes, setSelectedProgramTypes] = useState<Set<string>>(new Set());
  const [selectedSemesterTypes, setSelectedSemesterTypes] = useState<Set<string>>(new Set());
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set()); // Set of PIDs

  // Advanced Filters State - Attributes
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [selectedCourseTypes, setSelectedCourseTypes] = useState<Set<string>>(new Set());
  const [hasInitializedCourseTypes, setHasInitializedCourseTypes] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCredits, setSelectedCredits] = useState<Set<string>>(new Set());
  const [selectedCapacities, setSelectedCapacities] = useState<Set<string>>(new Set());
  
  // Student Count Filter
  const [studentMin, setStudentMin] = useState('');
  const [studentMax, setStudentMax] = useState('');
  const [selectedStudentCounts, setSelectedStudentCounts] = useState<Set<number>>(new Set());

  // Class Taken Filter
  const [classTakenMin, setClassTakenMin] = useState('');
  const [classTakenMax, setClassTakenMax] = useState('');
  const [selectedClassTakens, setSelectedClassTakens] = useState<Set<number>>(new Set());

  // Missing Data Filter
  const [selectedMissingFields, setSelectedMissingFields] = useState<Set<string>>(new Set());

  // Helper to normalize ID for matching
  const normalize = (id: string | undefined) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // Create lookup map for performance
  const programMap = useMemo(() => {
    const map = new Map<string, ProgramDataRow>();
    programData.forEach(p => {
        if(p.PID) map.set(normalize(p.PID), p);
    });
    return map;
  }, [programData]);

  const uniqueSemesters = useMemo(() => {
    // Filter out empty semesters and get unique values
    const rawSemesters = Array.from(new Set(data.map(d => d.Semester?.trim()).filter(Boolean)));
    
    // Weights for seasons to ensure correct order
    const seasonWeight: Record<string, number> = { 
        'winter': 0,
        'spring': 1, 
        'summer': 2, 
        'short': 2, 
        'fall': 3,
        'autumn': 3
    };
    
    // Sort: Year Descending -> Season Weight Descending (Fall > Summer > Spring)
    const sorted = rawSemesters.sort((a, b) => {
        const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
        const matchA = a.match(regex);
        const matchB = b.match(regex);

        if (!matchA || !matchB) return b.localeCompare(a);
        
        const seasonA = matchA[1].toLowerCase(); 
        let yearA = parseInt(matchA[2], 10); 
        if (yearA < 100) yearA += 2000; 

        const seasonB = matchB[1].toLowerCase();
        let yearB = parseInt(matchB[2], 10);
        if (yearB < 100) yearB += 2000;
        
        if (yearA !== yearB) {
            return yearB - yearA; 
        }
        
        const weightA = seasonWeight[seasonA] || 0;
        const weightB = seasonWeight[seasonB] || 0;
        
        return weightB - weightA; 
    });

    return ['All', ...sorted];
  }, [data]);

  // Derived Attribute Options based on current data
  const currentSemesterData = useMemo(() => {
      if (semesterFilter === 'All') return data;
      return data.filter(d => d.Semester === semesterFilter);
  }, [data, semesterFilter]);

  const attributeOptions = useMemo(() => {
      const teachers = new Map<string, string>(); // ID -> Name
      const courseTypes = new Set<string>();
      const types = new Set<string>();
      const credits = new Set<string>();
      const capacities = new Set<string>();
      const studentCounts = new Set<number>();
      const classTakenCounts = new Set<number>();

      currentSemesterData.forEach(d => {
          // Teacher
          const tid = d['Teacher ID'];
          if (tid && tid !== 'TBA' && tid.trim() !== '') {
              teachers.set(tid, d['Employee Name'] || tid);
          }
          // Course Type
          if (d['Course Type']) courseTypes.add(d['Course Type']);
          // Type
          if (d.Type) types.add(d.Type);
          // Credit
          if (d.Credit) credits.add(d.Credit);
          // Capacity
          if (d.Capacity) capacities.add(d.Capacity);
          // Student Count
          const s = parseInt(d.Student || '0', 10);
          if (!isNaN(s)) studentCounts.add(s);
          // Class Taken Count
          const c = parseInt(d['Class Taken'] || '0', 10);
          if (!isNaN(c)) classTakenCounts.add(c);
      });

      return {
          teachers: Array.from(teachers.entries()).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name)),
          courseTypes: Array.from(courseTypes).sort(),
          types: Array.from(types).sort(),
          credits: Array.from(credits).sort((a,b) => parseFloat(a) - parseFloat(b)),
          capacities: Array.from(capacities).sort((a,b) => parseInt(a) - parseInt(b)),
          studentCounts: Array.from(studentCounts).sort((a,b) => a - b),
          classTakenCounts: Array.from(classTakenCounts).sort((a,b) => a - b)
      };
  }, [currentSemesterData]);

  useEffect(() => {
    if (!userHasSelected && uniqueSemesters.length > 1) {
        setInternalSemesterFilter(uniqueSemesters[1]);
    }
  }, [uniqueSemesters, userHasSelected]);

  useEffect(() => {
    if (!hasInitializedCourseTypes && attributeOptions.courseTypes.length > 0) {
        const excludedKeywords = ['thesis', 'project', 'internship', 'viva'];
        const defaultSelection = new Set<string>();
        attributeOptions.courseTypes.forEach(t => {
            const lower = t.toLowerCase();
            const isExcluded = excludedKeywords.some(k => lower.includes(k));
            if (!isExcluded) defaultSelection.add(t);
        });
        if (defaultSelection.size > 0) setSelectedCourseTypes(defaultSelection);
        setHasInitializedCourseTypes(true);
    }
  }, [attributeOptions.courseTypes, hasInitializedCourseTypes]);

  const setSemesterFilter = (val: string) => {
      setInternalSemesterFilter(val);
      setUserHasSelected(true);
  };

  const baseFilteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesSemester = semesterFilter === 'All' || item.Semester === semesterFilter;
      return matchesSearch && matchesSemester;
    });
  }, [data, searchTerm, semesterFilter]);

  const filteredData = useMemo(() => {
    return baseFilteredData.filter(item => {
      // Missing Data Filter
      if (selectedMissingFields.size > 0) {
          for (const field of selectedMissingFields) {
              const val = item[field];
              if (val && String(val).trim() !== '') return false;
          }
      }

      // Attribute Filters
      if (selectedTeachers.size > 0 && !selectedTeachers.has(item['Teacher ID'])) return false;
      if (selectedCourseTypes.size > 0 && !selectedCourseTypes.has(item['Course Type'] || '')) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(item.Type)) return false;
      if (selectedCredits.size > 0 && !selectedCredits.has(item.Credit)) return false;
      if (selectedCapacities.size > 0 && !selectedCapacities.has(item.Capacity || '')) return false;

      const studentVal = parseInt(item.Student || '0', 10);
      if (studentMin !== '' && !isNaN(parseInt(studentMin)) && studentVal < parseInt(studentMin)) return false;
      if (studentMax !== '' && !isNaN(parseInt(studentMax)) && studentVal > parseInt(studentMax)) return false;
      if (selectedStudentCounts.size > 0 && !selectedStudentCounts.has(studentVal)) return false;

      const classTakenVal = parseInt(item['Class Taken'] || '0', 10);
      if (classTakenMin !== '' && !isNaN(parseInt(classTakenMin)) && classTakenVal < parseInt(classTakenMin)) return false;
      if (classTakenMax !== '' && !isNaN(parseInt(classTakenMax)) && classTakenVal > parseInt(classTakenMax)) return false;
      if (selectedClassTakens.size > 0 && !selectedClassTakens.has(classTakenVal)) return false;

      // Program Filters
      if (selectedFaculties.size === 0 && selectedProgramTypes.size === 0 && selectedSemesterTypes.size === 0 && selectedPrograms.size === 0) {
          return true;
      }

      const pid = normalize(item.PID);
      const progInfo = programMap.get(pid);

      if (selectedPrograms.size > 0 && !selectedPrograms.has(pid)) return false;

      if ((selectedFaculties.size > 0 || selectedProgramTypes.size > 0 || selectedSemesterTypes.size > 0) && !progInfo) {
          return false;
      }

      if (progInfo) {
          if (selectedFaculties.size > 0 && !selectedFaculties.has(progInfo['Faculty Short Name'])) return false;
          if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(progInfo['Program Type'])) return false;
          if (selectedSemesterTypes.size > 0 && !selectedSemesterTypes.has(progInfo['Semester Type'])) return false;
      }

      return true;
    });
  }, [baseFilteredData, selectedMissingFields, selectedFaculties, selectedProgramTypes, selectedSemesterTypes, selectedPrograms, selectedTeachers, selectedCourseTypes, selectedTypes, selectedCredits, selectedCapacities, studentMin, studentMax, selectedStudentCounts, classTakenMin, classTakenMax, selectedClassTakens, programMap]);

  const clearAllFilters = () => {
      setSearchTerm('');
      setSelectedFaculties(new Set());
      setSelectedProgramTypes(new Set());
      setSelectedSemesterTypes(new Set());
      setSelectedPrograms(new Set());
      
      setSelectedTeachers(new Set());
      setSelectedCourseTypes(new Set());
      setSelectedTypes(new Set());
      setSelectedCredits(new Set());
      setSelectedCapacities(new Set());

      setStudentMin('');
      setStudentMax('');
      setSelectedStudentCounts(new Set());

      setClassTakenMin('');
      setClassTakenMax('');
      setSelectedClassTakens(new Set());
      
      setSelectedMissingFields(new Set());
  };

  return {
    searchTerm,
    setSearchTerm,
    semesterFilter,
    setSemesterFilter,
    filteredData,
    baseFilteredData,
    uniqueSemesters,
    
    selectedFaculties, setSelectedFaculties,
    selectedProgramTypes, setSelectedProgramTypes,
    selectedSemesterTypes, setSelectedSemesterTypes,
    selectedPrograms, setSelectedPrograms,

    attributeOptions,
    selectedTeachers, setSelectedTeachers,
    selectedCourseTypes, setSelectedCourseTypes,
    selectedTypes, setSelectedTypes,
    selectedCredits, setSelectedCredits,
    selectedCapacities, setSelectedCapacities,
    studentMin, setStudentMin,
    studentMax, setStudentMax,
    selectedStudentCounts, setSelectedStudentCounts,
    classTakenMin, setClassTakenMin,
    classTakenMax, setClassTakenMax,
    selectedClassTakens, setSelectedClassTakens,
    
    selectedMissingFields, setSelectedMissingFields,

    clearAllFilters
  };
};
