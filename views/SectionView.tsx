
import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft, Database, ExternalLink, CheckCircle, XCircle, BarChart3, List, Menu, X, LogIn, Settings, PieChart } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useSectionFilters } from '../hooks/useSectionFilters';
import { useClassRoomFilters } from '../hooks/useClassRoomFilters';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { DashboardStats } from '../components/DashboardStats';
import { useCourseAggregation, CourseSummaryItem } from '../hooks/useCourseAggregation';
import { useTeacherAggregation, TeacherSummaryItem } from '../hooks/useTeacherAggregation';
import { SectionTable } from '../components/SectionTable';
import { CourseSummaryTable } from '../components/CourseSummaryTable';
import { TeacherSummaryTable } from '../components/TeacherSummaryTable';
import { FilterPanel } from '../components/FilterPanel'; 
import { AdmittedReportTable } from '../components/AdmittedReportTable'; 
import { AdmittedReportModal } from '../components/AdmittedReportModal';
import { CourseDistributionReport } from '../components/CourseDistributionReport';
import { SectionDistributionReport } from '../components/SectionDistributionReport';
import { TeacherDistributionReport } from '../components/TeacherDistributionReport';
import { UnassignedDistributionReport } from '../components/UnassignedDistributionReport';
import { LowStudentDistributionReport } from '../components/LowStudentDistributionReport';
import { ClassTakenDistributionReport } from '../components/ClassTakenDistributionReport';
import { ClassRoomDistributionReport } from '../components/ClassRoomDistributionReport';
import { ClassRoomTable } from '../components/ClassRoomTable'; 
import { SectionDetailsPanel } from '../components/SectionDetailsPanel';
import { CourseDetailsPanel } from '../components/CourseDetailsPanel';
import { TeacherDetailsPanel } from '../components/TeacherDetailsPanel';
import { UnregisteredStudentsModal } from '../components/UnregisteredStudentsModal';
import { EditEntryModal } from '../components/EditEntryModal';
import { MAIN_SHEET_ID, MAIN_SHEET_GID, REF_SHEET_ID, REF_SHEET_GID, CLASSROOM_SHEET_GID, SHEET_NAMES } from '../constants';
import { ProgramDataRow, CourseSectionData, ReferenceDataRow, StudentDataRow } from '../types';
import { submitSheetData, extractSheetIdAndGid, normalizeId, normalizeSemesterString } from '../services/sheetService';

interface SectionViewProps {
    showStats?: boolean;
}

type ViewMode = 'sections' | 'courses' | 'teachers' | 'unassigned' | 'low_student' | 'class_taken' | 'admitted' | 'classroom' | 'missing_data';

const viewColors: Record<ViewMode, string> = {
  'sections': 'bg-purple-500',
  'courses': 'bg-blue-500',
  'teachers': 'bg-orange-400',
  'unassigned': 'bg-red-500',
  'low_student': 'bg-green-500',
  'class_taken': 'bg-cyan-500',
  'admitted': 'bg-teal-600',
  'classroom': 'bg-indigo-500',
  'missing_data': 'bg-rose-500'
};

export const SectionView: React.FC<SectionViewProps> = ({ showStats = false }) => {
  const { data, programData, classroomData, diuEmployeeData, teacherData, referenceData, loading, reloadData, semesterLinks, studentCache, loadStudentData, updateStudentData, registeredData, loadRegisteredData, studentDataLinks, updateClassroomData, updateReferenceData, updateSectionData, semesterFilter, setSemesterFilter, uniqueSemesters } = useSheetData();
  
  const { 
      searchTerm, setSearchTerm, 
      filteredData, 
      baseFilteredData, 
      
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
  } = useSectionFilters(data, programData);

  const {
      searchTerm: classSearchTerm, setSearchTerm: setClassSearchTerm,
      filteredData: filteredClassroomData,
      options: classroomOptions,
      
      selectedFaculties: classSelectedFaculties, setSelectedFaculties: setClassSelectedFaculties,
      selectedPrograms: classSelectedPrograms, setSelectedPrograms: setClassSelectedPrograms,

      selectedBuildings, setSelectedBuildings,
      selectedFloors, setSelectedFloors,
      selectedRoomTypes, setSelectedRoomTypes,
      capacityMin: roomCapacityMin, setCapacityMin: setRoomCapacityMin,
      capacityMax: roomCapacityMax, setCapacityMax: setRoomCapacityMax,
      
      selectedMissingFields: classSelectedMissingFields, setSelectedMissingFields: setClassSelectedMissingFields,

      clearAllFilters: clearClassFilters
  } = useClassRoomFilters(classroomData, programData);
  
  const [viewMode, setViewMode] = useState<ViewMode>(showStats ? 'courses' : 'sections');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  
  const [selectedSection, setSelectedSection] = useState<CourseSectionData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummaryItem | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSummaryItem | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<any>(undefined);

  const [isReferenceEditModalOpen, setIsReferenceEditModalOpen] = useState(false);
  const [referenceEditMode, setReferenceEditMode] = useState<'add' | 'edit'>('edit');
  const [referenceEditingRow, setReferenceEditingRow] = useState<any>(undefined);

  const [isAdmittedReportModalOpen, setIsAdmittedReportModalOpen] = useState(false);
  
  // State for student list modal from analytics clicks
  const [activeAdmittedList, setActiveAdmittedList] = useState<{ 
      semester: string; 
      programId: string; 
      programName: string; 
      students: StudentDataRow[]; 
      targetSemester: string; 
      listType: string;
  } | null>(null);

  const [reportModePreferences, setReportModePreferences] = useState<Record<string, boolean>>({
      'sections': showStats,
      'courses': showStats,
      'teachers': showStats,
      'unassigned': showStats,
      'low_student': showStats,
      'class_taken': showStats,
      'admitted': showStats,
      'classroom': showStats,
      'missing_data': false 
  });

  const isReportMode = reportModePreferences[viewMode];
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);

  const [lowStudentThreshold, setLowStudentThreshold] = useState(7);
  const [classTakenThreshold, setClassTakenThreshold] = useState(0); 
  const [capacityBonus, setCapacityBonus] = useState(0);

  const [filterPrograms, setFilterPrograms] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterCredits, setFilterCredits] = useState<Set<string>>(new Set());
  const [filterTotalSections, setFilterTotalSections] = useState<Set<number>>(new Set());
  const [filterTotalCapacity, setFilterTotalCapacity] = useState<Set<number>>(new Set());
  const [filterTotalStudents, setFilterTotalStudents] = useState<Set<number>>(new Set());
  
  const [filterTotalVacancy, setFilterTotalVacancy] = useState<Set<number>>(new Set());
  const [filterExtraSections, setFilterExtraSections] = useState<Set<number>>(new Set());

  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [showReferenceSheet, setShowReferenceSheet] = useState(false);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  const [hoveredAdmittedCol, setHoveredAdmittedCol] = useState<number | null>(null);
  const [hoveredAdmittedRow, setHoveredAdmittedRow] = useState<number | null>(null);

  const [regColPage, setRegColPage] = useState(0);
  const REG_COLS_PER_PAGE = 12;

  const courseSummaryData = useCourseAggregation(filteredData, capacityBonus);
  
  const filteredCourseSummaryData = useMemo(() => {
      return courseSummaryData.filter(item => {
          if (filterPrograms.size > 0 && !filterPrograms.has(item.program)) return false;
          if (filterTypes.size > 0 && !filterTypes.has(item.courseType)) return false; 
          if (filterCredits.size > 0 && !filterCredits.has(item.credit)) return false;
          if (filterTotalSections.size > 0 && !filterTotalSections.has(item.totalSections)) return false;
          if (filterTotalCapacity.size > 0 && !filterTotalCapacity.has(item.totalCapacity)) return false;
          if (filterTotalStudents.size > 0 && !filterTotalStudents.has(item.totalStudents)) return false;
          if (filterTotalVacancy.size > 0 && !filterTotalVacancy.has(item.totalVacancy)) return false;
          if (filterExtraSections.size > 0 && !filterExtraSections.has(item.extraSections)) return false;
          return true;
      });
  }, [
      courseSummaryData, 
      filterPrograms, filterTypes, filterCredits, 
      filterTotalSections, filterTotalCapacity, filterTotalStudents, 
      filterTotalVacancy, filterExtraSections
  ]);

  const fullyFilteredData = useMemo(() => {
      if (filterTotalVacancy.size === 0 && filterExtraSections.size === 0) {
          return filteredData;
      }
      const allowedRows = new Set<CourseSectionData>();
      filteredCourseSummaryData.forEach(c => {
          c.rows.forEach(r => allowedRows.add(r));
      });
      return filteredData.filter(d => allowedRows.has(d));
  }, [filteredData, filteredCourseSummaryData, filterTotalVacancy.size, filterExtraSections.size]);

  const isEmpty = (val: any) => !val || String(val).trim() === '';

  const missingDataRows = useMemo(() => {
      return baseFilteredData.filter(d => 
          isEmpty(d['Course Type']) || 
          isEmpty(d.Capacity) || 
          isEmpty(d['Weekly Class'])
      );
  }, [baseFilteredData]);

  const missingDataSummary = useCourseAggregation(missingDataRows);
  const teacherSummaryData = useTeacherAggregation(fullyFilteredData);

  useEffect(() => {
      if (registeredData.length === 0) {
          loadRegisteredData();
      }
  }, []);

  const admittedSemesters = useMemo(() => {
      const keys = Array.from(studentDataLinks.keys()) as string[];
      
      const seasonWeight: Record<string, number> = { 
        'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3
      };

      return keys.sort((a, b) => {
        const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
        const matchA = a.match(regex);
        const matchB = b.match(regex);
        
        if (!matchA || !matchB) return b.localeCompare(a);

        let yearA = parseInt(matchA[2], 10);
        if (yearA < 100) yearA += 2000;
        const seasonA = matchA[1].toLowerCase(); 

        let yearB = parseInt(matchB[2], 10);
        if (yearB < 100) yearB += 2000;
        const seasonB = matchB[1].toLowerCase();
        
        if (yearA !== yearB) return yearB - yearA;
        return (seasonWeight[seasonB] || 0) - (seasonWeight[seasonA] || 0);
      });
  }, [studentDataLinks]);

  const [selectedAdmittedSemesters, setSelectedAdmittedSemesters] = useState<Set<string>>(new Set());
  const [registrationFilters, setRegistrationFilters] = useState<Map<string, 'registered' | 'unregistered'>>(new Map());

  useEffect(() => {
      if (admittedSemesters.length > 0 && selectedAdmittedSemesters.size === 0) {
          const initialSelection = new Set(admittedSemesters.slice(0, 12));
          setSelectedAdmittedSemesters(initialSelection);
      }
  }, [admittedSemesters]);

  useEffect(() => {
      selectedAdmittedSemesters.forEach(sem => {
          if (!studentCache.has(sem)) {
              loadStudentData(sem);
          }
      });
  }, [selectedAdmittedSemesters, studentCache, loadStudentData]);

  const registeredSemesters = useMemo(() => {
    if (registeredData.length === 0) return [];
    const keys = Object.keys(registeredData[0]).filter(k => k.trim() !== '');

    const seasonWeight: Record<string, number> = { 
        'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3
    };

    return keys.sort((a, b) => {
        const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
        const matchA = a.match(regex);
        const matchB = b.match(regex);
        if (!matchA || !matchB) return b.localeCompare(a);

        let yearA = parseInt(matchA[2], 10);
        if (yearA < 100) yearA += 2000;
        const seasonA = matchA[1].toLowerCase(); 

        let yearB = parseInt(matchB[2], 10);
        if (yearB < 100) yearB += 2000;
        const seasonB = matchB[1].toLowerCase();
        
        if (yearA !== yearB) return yearB - yearA;
        return (seasonWeight[seasonB] || 0) - (seasonWeight[seasonA] || 0);
    });
  }, [registeredData]);

  const totalRegColPages = Math.ceil(registeredSemesters.length / REG_COLS_PER_PAGE);

  const visibleRegisteredSemesters = useMemo(() => {
      const start = regColPage * REG_COLS_PER_PAGE;
      return registeredSemesters.slice(start, start + REG_COLS_PER_PAGE);
  }, [registeredSemesters, regColPage]);

  const registrationLookup = useMemo(() => {
      const map = new Map<string, Set<string>>();
      if (registeredData.length === 0) return map;

      registeredData.forEach(row => {
          Object.entries(row).forEach(([sem, idVal]) => {
              if (sem && idVal && String(idVal).trim() !== '') {
                  const sId = normalizeId(String(idVal)); 
                  const normalizedSem = normalizeSemesterString(sem); // Store normalized keys for lookup
                  if (!map.has(sId)) map.set(sId, new Set());
                  map.get(sId)!.add(normalizedSem);
              }
          });
      });
      return map;
  }, [registeredData]);

  useEffect(() => {
      if (semesterFilter !== 'All' && semesterFilter) {
          if (!studentCache.has(semesterFilter)) {
              loadStudentData(semesterFilter);
          }
      }
  }, [semesterFilter, studentCache, loadStudentData]);

  const programDetailsMap = useMemo(() => {
    const map = new Map<string, ProgramDataRow>();
    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    programData.forEach(p => {
        if (p.PID) {
            map.set(normalize(p.PID), p);
        }
    });
    return map;
  }, [programData]);

  const filteredAdmittedData = useMemo(() => {
      if (selectedAdmittedSemesters.size === 0) return [];
      
      const allStudents: any[] = [];
      const seenIds = new Set<string>();
      
      const latestToOldest = admittedSemesters.filter(s => selectedAdmittedSemesters.has(s));

      latestToOldest.forEach(sem => {
          const students = studentCache.get(sem) || [];
          students.forEach(s => {
              const id = String(s['Student ID']).trim();
              if (id && !seenIds.has(id)) {
                  seenIds.add(id);
                  allStudents.push({ ...s, _semester: sem });
              }
          });
      });

      if (allStudents.length === 0) return [];
      
      let filtered = allStudents;

      // Apply Global Search Filter for ID and Name
      if (searchTerm.trim()) {
          const lower = searchTerm.toLowerCase();
          filtered = filtered.filter(s => 
              String(s['Student Name'] || '').toLowerCase().includes(lower) || 
              String(s['Student ID'] || '').toLowerCase().includes(lower)
          );
      }

      if (registrationFilters.size > 0) {
          filtered = filtered.filter(s => {
              const cleanId = normalizeId(s['Student ID']); 
              const studentSemesters = registrationLookup.get(cleanId);
              
              for (const [sem, type] of registrationFilters.entries()) {
                   const normalizedSem = normalizeSemesterString(sem);
                   const hasReg = studentSemesters?.has(normalizedSem);
                   if (type === 'registered' && !hasReg) return false;
                   if (type === 'unregistered' && hasReg) return false;
              }
              return true;
          });
      }

      if (selectedPrograms.size === 0 && selectedFaculties.size === 0 && selectedProgramTypes.size === 0 && selectedSemesterTypes.size === 0) {
          return filtered;
      }

      const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      return filtered.filter(s => {
          const pid = normalize(s.PID);
          
          if (selectedPrograms.size > 0 && !selectedPrograms.has(pid)) return false;

          if (selectedFaculties.size > 0 || selectedProgramTypes.size > 0 || selectedSemesterTypes.size > 0) {
              const pInfo = programDetailsMap.get(pid);
              if (!pInfo) return false; 
              
              if (selectedFaculties.size > 0 && !selectedFaculties.has(pInfo['Faculty Short Name'])) return false;
              if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(pInfo['Program Type'])) return false;
              if (selectedSemesterTypes.size > 0 && !selectedSemesterTypes.has(pInfo['Semester Type'])) return false;
          }

          return true;
      });
  }, [selectedAdmittedSemesters, admittedSemesters, studentCache, selectedPrograms, selectedFaculties, selectedProgramTypes, selectedSemesterTypes, programDetailsMap, registrationFilters, registrationLookup, searchTerm]);

  const totalAdmitted = filteredAdmittedData.length;

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    programData.forEach(p => {
        if (p.PID && p['Program Short Name']) {
            map.set(normalize(p.PID), p['Program Short Name']);
        }
    });
    return map;
  }, [programData]);

  const tableOptions = useMemo(() => {
      const programs = new Set<string>();
      const types = new Set<string>();
      const credits = new Set<string>();
      const totalSections = new Set<number>();
      const totalCapacity = new Set<number>();
      const totalStudents = new Set<number>();
      const totalVacancy = new Set<number>();
      const extraSections = new Set<number>();

      courseSummaryData.forEach(item => {
          programs.add(item.program);
          types.add(item.courseType); 
          credits.add(item.credit);
          totalSections.add(item.totalSections);
          totalCapacity.add(item.totalCapacity);
          totalStudents.add(item.totalStudents);
          totalVacancy.add(item.totalVacancy);
          extraSections.add(item.extraSections);
      });

      return {
          programs: Array.from(programs).sort(),
          types: Array.from(types).sort(),
          credits: Array.from(credits).sort((a,b) => parseFloat(a) - parseFloat(b)), 
          totalSections: Array.from(totalSections).sort((a, b) => a - b),
          totalCapacity: Array.from(totalCapacity).sort((a, b) => a - b),
          totalStudents: Array.from(totalStudents).sort((a, b) => a - b),
          totalVacancy: Array.from(totalVacancy).sort((a, b) => a - b),
          extraSections: Array.from(extraSections).sort((a, b) => a - b),
      };
  }, [courseSummaryData]);

  const activeDataForPagination = useMemo(() => {
      if (viewMode === 'courses') return filteredCourseSummaryData;
      if (viewMode === 'teachers') return teacherSummaryData;
      if (viewMode === 'admitted') return filteredAdmittedData;
      if (viewMode === 'missing_data') return missingDataSummary;
      
      if (viewMode === 'classroom') return isReportMode ? [] : filteredClassroomData;
      
      if (viewMode === 'unassigned') {
          return fullyFilteredData.filter(d => !d['Teacher ID'] || d['Teacher ID'] === 'TBA' || d['Teacher ID'].trim() === '');
      }
      if (viewMode === 'low_student') {
          return fullyFilteredData.filter(d => {
              const count = parseInt(d.Student || '0', 10);
              return count > 0 && count < lowStudentThreshold;
          });
      }
      if (viewMode === 'class_taken') {
          return fullyFilteredData.filter(d => {
              const taken = parseFloat(d['Class Taken'] || '0');
              const req = parseFloat(d['ClassRequirement'] || '0');
              let percentage = 0;
              if (req > 0) percentage = (taken / req) * 100;
              else if (taken > 0) percentage = 100;
              
              return percentage <= classTakenThreshold;
          });
      }
      return fullyFilteredData;
  }, [viewMode, filteredCourseSummaryData, teacherSummaryData, fullyFilteredData, lowStudentThreshold, classTakenThreshold, filteredAdmittedData, filteredClassroomData, isReportMode, missingDataSummary]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<any>(activeDataForPagination);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedKeys(new Set());
    setSelectedSection(null);
    setSelectedCourse(null);
    setSelectedTeacher(null);
    setIsExportPanelOpen(false);
    
    if (filteredData.length === 0) {
        setFilterPrograms(new Set());
        setFilterTypes(new Set());
        setFilterCredits(new Set());
        setFilterTotalSections(new Set());
        setFilterTotalCapacity(new Set());
        setFilterTotalStudents(new Set());
    }
  }, [viewMode, searchTerm, semesterFilter, setCurrentPage, lowStudentThreshold, classTakenThreshold, selectedFaculties, selectedPrograms, selectedTeachers, selectedCourseTypes, selectedTypes, capacityBonus, filteredData.length]);

  const handleClearAllFilters = () => {
      if (viewMode === 'classroom') {
          clearClassFilters();
      } else {
          clearAllFilters();
          setFilterTotalVacancy(new Set());
          setFilterExtraSections(new Set());
      }
  };

  const handleCardClick = (label: string) => {
      if (label === 'Total Courses') {
          setViewMode('courses');
          setShowReferenceSheet(false);
          setShowSourceSheet(false);
      } else if (label === 'Total Courses Icon') {
          setViewMode('missing_data');
          setShowReferenceSheet(false);
          setShowSourceSheet(false);
      } else {
          setShowReferenceSheet(false);
          if (label === 'Total Sections') setViewMode('sections');
          else if (label === 'Total Teachers') setViewMode('teachers');
          else if (label === 'Total Unassigned') setViewMode('unassigned');
          else if (label === 'Low Student') setViewMode('low_student');
          else if (label === 'Class Taken (%)') setViewMode('class_taken');
          else if (label === 'Student Directory') setViewMode('admitted');
          else if (label === 'Class Room') setViewMode('classroom');
          setShowSourceSheet(false);
      }
  };

  const handleBack = () => {
      setViewMode('sections');
      setShowSourceSheet(false);
      setShowReferenceSheet(false);
      setReportModePreferences(prev => ({ ...prev, sections: false }));
  };

  const handleToggleReportMode = (mode: string) => {
      setReportModePreferences(prev => ({ ...prev, [mode]: !prev[mode] }));
  };

  const toggleRow = (key: string) => {
      setExpandedKeys(prev => {
          if (prev.has(key)) {
              return new Set();
          }
          return new Set([key]);
      });
  };

  const currentSheetUrl = useMemo(() => {
      let url = '';
      if (viewMode === 'admitted') {
           const topSelected = admittedSemesters.find(s => selectedAdmittedSemesters.has(s));
           if (topSelected) {
               url = studentDataLinks.get(topSelected) || '';
           }
      } else if (viewMode === 'classroom') {
           url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/edit#gid=${CLASSROOM_SHEET_GID}`;
      } else if (viewMode === 'missing_data') {
           url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/edit#gid=${REF_SHEET_GID}`;
      } else {
          if (semesterFilter === 'All') {
              url = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/edit#gid=${MAIN_SHEET_GID}`;
          } else {
              url = semesterLinks.get(semesterFilter) || '';
          }
      }
      return url;
  }, [semesterFilter, semesterLinks, viewMode, selectedAdmittedSemesters, admittedSemesters, studentDataLinks]);

  const activeFilterCount = viewMode === 'classroom' 
    ? (classSelectedFaculties.size + classSelectedPrograms.size + selectedBuildings.size + selectedFloors.size + selectedRoomTypes.size + (roomCapacityMin || roomCapacityMax ? 1 : 0) + classSelectedMissingFields.size)
    : (selectedFaculties.size + selectedProgramTypes.size + selectedSemesterTypes.size + selectedPrograms.size + selectedTeachers.size + selectedCourseTypes.size + selectedTypes.size + selectedCredits.size + selectedCapacities.size + selectedStudentCounts.size + (studentMin || studentMax ? 1 : 0) + selectedClassTakens.size + (classTakenMin || classTakenMax ? 1 : 0) + filterTotalVacancy.size + filterExtraSections.size + selectedMissingFields.size);

  const admittedColumns = useMemo(() => {
      return [
          'SL', 
          'Program', 
          'Student ID', 
          'Student Name', 
          ...visibleRegisteredSemesters
      ];
  }, [visibleRegisteredSemesters]);

  const getCellClass = (colIdx: number, rowIdx: number) => {
     const isRow = rowIdx === hoveredAdmittedRow;
     const isCol = colIdx === hoveredAdmittedCol;
     if (isRow && isCol) return 'bg-purple-200';
     if (isRow) return 'bg-purple-100';
     if (isCol) return 'bg-purple-50';
     return '';
  };

  const currentHeaderColor = viewColors[viewMode] || 'bg-purple-500';

  const handleRefresh = async () => {
      if (viewMode === 'admitted') {
          await reloadData('admitted', true);
          if (selectedAdmittedSemesters.size > 0) {
              const promises = Array.from(selectedAdmittedSemesters).map(sem => loadStudentData(sem, true));
              await Promise.all(promises);
          }
      } else {
          await reloadData('sections', true);
      }
  };

  const handleEditClassRoom = (row: any) => {
      setEditMode('edit');
      setEditingRow(row);
      setIsEditModalOpen(true);
  };

  const handleClassRoomModalSuccess = (newData: any) => {
      if (!newData) return;
      if (editMode === 'edit') {
          const originalRoom = editingRow?.Room;
          if (originalRoom && updateClassroomData) {
              updateClassroomData(prev => prev.map(r => 
                  r.Room === originalRoom ? { ...r, ...newData } : r
              ));
          }
      }
  };

  const referenceFieldOptions = useMemo(() => {
      const sectionCourseTypes = new Set<string>(['Theory', 'Lab', 'Project', 'Thesis', 'Internship', 'Viva']); 
      data.forEach(d => {
          if (d['Course Type']) sectionCourseTypes.add(d['Course Type']);
      });

      return {
          'Course Type': Array.from(sectionCourseTypes).sort()
      };
  }, [data]);

  const handleEditReference = (row: CourseSummaryItem) => {
      const existingRef = referenceData.find(r => r.Ref === row.ref);
      
      let programStr = '';
      const pidToMatch = row.pid;
      
      const pData = programData.find(p => String(p.PID) === String(pidToMatch));
      if (pData) {
          programStr = `${pData.PID} ${pData['Program Short Name']}`;
      } else {
          programStr = `${row.pid} ${row.program}`;
      }

      const initialData: any = {
          Ref: row.ref,
          Program: programStr, 
          Credit: row.credit,
          Type: row.type || '',
      };

      if (existingRef) {
          initialData['Course Type'] = existingRef['Course Type'];
          initialData['Section Capacity'] = existingRef['Section Capacity'];
          initialData['Weekly Class'] = existingRef['Weekly Class'];
          setReferenceEditMode('edit');
      } else {
          setReferenceEditMode('add');
      }

      setReferenceEditingRow(initialData);
      setIsReferenceEditModalOpen(true);
  };

  const handleReferenceModalSuccess = (newData: any) => {
      if (!newData) return;
      
      updateReferenceData(prev => {
          if (referenceEditMode === 'edit') {
              return prev.map(r => r.Ref === newData.Ref ? { ...r, ...newData } : r);
          } else {
              return [...prev, newData];
          }
      });

      if (updateSectionData) {
          updateSectionData(prevData => prevData.map(row => {
              if (row.Ref === newData.Ref) {
                  return {
                      ...row,
                      'Course Type': newData['Course Type'],
                      'Capacity': newData['Section Capacity'],
                      'Weekly Class': newData['Weekly Class']
                  };
              }
              return row;
          }));
      }
  };

  const handleSaveStudent = async (semester: string, student: StudentDataRow) => {
    const link = studentDataLinks.get(semester);
    if (!link) return;
    const { id: sheetId } = extractSheetIdAndGid(link);
    if (!sheetId) return;

    updateStudentData(semester, student['Student ID'], student);
    
    const { _semester, ...apiPayload } = student as any;
    try {
        await submitSheetData('update', semester, apiPayload, 'Student ID', student['Student ID'].trim(), sheetId);
    } catch (e) {
        console.error("Failed to persist student update in SectionView", e);
    }
  };

  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  const latestSelectedSemester = useMemo(() => {
    if (selectedAdmittedSemesters.size === 0) return '';
    return admittedSemesters.find(s => selectedAdmittedSemesters.has(s)) || '';
  }, [selectedAdmittedSemesters, admittedSemesters]);

  const [targetRegSemester, setTargetRegSemester] = useState<string>('');

  useEffect(() => {
    if (latestSelectedSemester) {
        setTargetRegSemester(latestSelectedSemester);
    }
  }, [latestSelectedSemester]);

  return (
    <div className={`flex flex-col h-full space-y-2 bg-gray-50 relative overflow-hidden ${showStats ? 'p-1' : 'p-2 md:p-3'}`}>
      <FilterPanel 
          isOpen={isFilterPanelOpen} 
          onClose={() => setIsFilterPanelOpen(false)}
          programData={programData}
          semesterFilter={semesterFilter}
          setSemesterFilter={setSemesterFilter}
          uniqueSemesters={uniqueSemesters}
          selectedFaculties={viewMode === 'classroom' ? classSelectedFaculties : selectedFaculties}
          setSelectedFaculties={viewMode === 'classroom' ? setClassSelectedFaculties : setSelectedFaculties}
          selectedProgramTypes={selectedProgramTypes}
          setSelectedProgramTypes={setSelectedProgramTypes}
          selectedSemesterTypes={selectedSemesterTypes}
          setSelectedSemesterTypes={setSelectedSemesterTypes}
          selectedPrograms={viewMode === 'classroom' ? classSelectedPrograms : selectedPrograms}
          setSelectedPrograms={viewMode === 'classroom' ? setClassSelectedPrograms : setSelectedPrograms}
          attributeOptions={attributeOptions}
          selectedTeachers={selectedTeachers}
          setSelectedTeachers={setSelectedTeachers}
          selectedCourseTypes={selectedCourseTypes}
          setSelectedCourseTypes={setSelectedCourseTypes}
          selectedTypes={selectedTypes}
          setSelectedTypes={setSelectedTypes}
          selectedCredits={selectedCredits}
          setSelectedCredits={setSelectedCredits}
          selectedCapacities={selectedCapacities}
          setSelectedCapacities={setSelectedCapacities}
          studentMin={studentMin}
          setStudentMin={setStudentMin}
          studentMax={studentMax}
          setStudentMax={setStudentMax}
          selectedStudentCounts={selectedStudentCounts}
          setSelectedStudentCounts={setSelectedStudentCounts}
          classTakenMin={classTakenMin}
          setClassTakenMin={setClassTakenMin}
          classTakenMax={classTakenMax}
          setClassTakenMax={setClassTakenMax}
          selectedClassTakens={selectedClassTakens}
          setSelectedClassTakens={setSelectedClassTakens}
          vacancyOptions={tableOptions.totalVacancy}
          selectedVacancies={filterTotalVacancy}
          setSelectedVacancies={setFilterTotalVacancy}
          extraSectionOptions={tableOptions.extraSections}
          selectedExtraSections={filterExtraSections}
          setSelectedExtraSections={setFilterExtraSections}
          viewMode={viewMode}
          admittedSemestersOptions={admittedSemesters}
          selectedAdmittedSemesters={selectedAdmittedSemesters}
          onAdmittedSemesterChange={setSelectedAdmittedSemesters}
          registeredSemestersOptions={registeredSemesters}
          registrationFilters={registrationFilters}
          onRegistrationFilterChange={setRegistrationFilters}
          classroomOptions={classroomOptions}
          selectedBuildings={selectedBuildings}
          setSelectedBuildings={setSelectedBuildings}
          selectedFloors={selectedFloors}
          setSelectedFloors={setSelectedFloors}
          selectedRoomTypes={selectedRoomTypes}
          setSelectedRoomTypes={setSelectedRoomTypes}
          roomCapacityMin={roomCapacityMin}
          setRoomCapacityMin={setRoomCapacityMin}
          roomCapacityMax={roomCapacityMax}
          setRoomCapacityMax={setRoomCapacityMax}
          
          missingDataOptions={
              viewMode === 'classroom' 
              ? ['Capacity', 'Room Type', 'Slot Duration'] 
              : ['Teacher ID', 'Course Type', 'Capacity', 'Weekly Class', 'Class Taken']
          }
          selectedMissingFields={viewMode === 'classroom' ? classSelectedMissingFields : selectedMissingFields}
          setSelectedMissingFields={viewMode === 'classroom' ? setClassSelectedMissingFields : setSelectedMissingFields}

          onClearAll={handleClearAllFilters}
      />

      {/* PORTAL: App Header Title Area */}
      {headerTitleTarget && createPortal(
          <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
             {viewMode !== 'sections' && !showStats && (
                 <button onClick={handleBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                     <ArrowLeft className="w-4 h-4" />
                 </button>
             )}
             <div className="flex flex-col">
                <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">
                    {showSourceSheet ? (
                        viewMode === 'admitted' 
                        ? `Source Data: ${admittedSemesters.find(s => selectedAdmittedSemesters.has(s)) || 'Selection'}`
                        : viewMode === 'classroom'
                        ? 'Source Data: Class Room'
                        : viewMode === 'missing_data'
                        ? 'Source Data: Course Settings'
                        : `Source Data: ${semesterFilter}`
                    ) : (
                        <>
                            {viewMode === 'sections' && (isReportMode ? 'Section Distribution' : showStats ? `Total Sections` : 'Section Data')}
                            {viewMode === 'courses' && (isReportMode ? 'Courses Distribution' : 'Course Summary')}
                            {viewMode === 'teachers' && (isReportMode ? 'Teacher Distribution' : 'Teacher Summary')}
                            {viewMode === 'unassigned' && (isReportMode ? 'Unassigned Report' : 'Unassigned Sections')}
                            {viewMode === 'low_student' && (isReportMode ? `Low Student Report` : `Low Student (<${lowStudentThreshold})`)}
                            {viewMode === 'class_taken' && (isReportMode ? `Class Taken Report` : `Class Taken (≤${classTakenThreshold}%)`)}
                            {viewMode === 'admitted' && (isReportMode ? 'Student Directory Report' : 'Student Directory')}
                            {viewMode === 'classroom' && (isReportMode ? 'Class Room Distribution' : `Class Room List`)}
                            {viewMode === 'missing_data' && 'Missing Data Report'}
                        </>
                    )}
                </h2>
                {!showSourceSheet && !isReportMode && (
                    <div className="flex items-center space-x-1">
                         <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1 rounded border border-gray-200">
                            {activeDataForPagination.length} Records
                         </span>
                         {viewMode === 'admitted' ? (
                             <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-1.5 rounded border border-indigo-100 flex items-center">
                                <RefreshCw className="w-2.5 h-2.5 mr-1" />
                                {latestSelectedSemester || 'None'}
                             </span>
                         ) : (
                             <span className="text-[9px] font-medium text-blue-500">{semesterFilter}</span>
                         )}
                    </div>
                )}
             </div>
          </div>,
          headerTitleTarget
      )}

      {/* PORTAL: App Header Action Area */}
      {headerActionsTarget && createPortal(
          <div className="flex items-center space-x-1 md:space-x-2 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
            
            {viewMode === 'admitted' && (
                <button 
                    onClick={() => setIsAdmittedReportModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                    title="Semester Analysis"
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Semester Analysis</span>
                </button>
            )}

            <button 
                onClick={() => setIsFilterPanelOpen(true)}
                className={`flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all ${activeFilterCount > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                title="Filter"
            >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Filter</span>
                {activeFilterCount > 0 && (
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full ml-1 min-w-[14px] text-center">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            {!isReportMode && (
                <div className="relative group hidden sm:block">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search current view..." 
                        value={viewMode === 'classroom' ? classSearchTerm : searchTerm}
                        onChange={(e) => viewMode === 'classroom' ? setClassSearchTerm(e.target.value) : setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 lg:w-64 outline-none transition-all"
                    />
                </div>
            )}

            {!isReportMode && viewMode !== 'admitted' && viewMode !== 'classroom' && (
                 <div className="relative hidden lg:block">
                    <select 
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value)}
                        className="w-full md:w-auto pl-2 pr-6 py-1.5 text-xs border border-gray-200 rounded-full bg-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors font-bold text-gray-600"
                    >
                        {uniqueSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            )}

            <button 
                onClick={handleRefresh}
                disabled={loading.status === 'loading'}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
                title="Refresh Data"
            >
                <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>

            <button 
                onClick={() => setShowSourceSheet(!showSourceSheet)}
                className={`hidden md:flex p-1.5 rounded-full border transition-all ${showSourceSheet ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-gray-200'}`}
                title="View Source Data"
            >
                <Database className="w-4 h-4" />
            </button>

            <a 
                href="http://empapp.daffodilvarsity.edu.bd/diu-spm/login" 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full border border-gray-200 hover:border-orange-200 transition-all group"
                title="DIU SPM Login"
            >
                <LogIn className="w-4 h-4" />
            </a>
          </div>,
          headerActionsTarget
      )}

      {showStats && data.length > 0 && (
          <div className="w-full px-0.5">
            <DashboardStats 
                data={filteredData} 
                onCardClick={handleCardClick}
                totalCoursesOverride={courseSummaryData.length}
                lowStudentThreshold={lowStudentThreshold}
                setLowStudentThreshold={setLowStudentThreshold}
                classTakenThreshold={classTakenThreshold}
                setClassTakenThreshold={setClassTakenThreshold}
                capacityBonus={capacityBonus}
                setCapacityBonus={setCapacityBonus}
                totalAdmitted={totalAdmitted}
                totalClassRooms={filteredClassroomData.length} 
                missingDataCount={missingDataRows.length} 
                currentViewMode={viewMode}
                reportModePreferences={reportModePreferences}
                onToggleReportMode={handleToggleReportMode}
            />
          </div>
      )}

      <div className={`flex-1 overflow-hidden relative flex flex-row ${showSourceSheet ? 'bg-white rounded-lg border border-gray-200 shadow-inner' : 'bg-transparent gap-2'}`}>
        <div className={`flex flex-col h-full transition-all duration-300 ${!showSourceSheet ? 'bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-w-0' : 'w-full'}`}>
            
            {loading.status === 'loading' && data.length === 0 && (
                <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-gray-600 font-mono animate-pulse">{loading.message}</p>
                </div>
            )}

            {loading.status === 'loading' && data.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 z-30">
                    <div className="h-full bg-blue-500 animate-subtle-progress w-1/3"></div>
                </div>
            )}

            {showSourceSheet ? (
                <div className="flex-1 w-full h-full bg-slate-50 relative">
                    {currentSheetUrl ? (
                        <iframe 
                            src={currentSheetUrl} 
                            className="w-full h-full border-none"
                            title="Semester Data Source"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Database className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs">No source link available.</p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {viewMode === 'classroom' ? (
                        isReportMode ? (
                            <ClassRoomDistributionReport 
                                data={filteredClassroomData} 
                                programData={programData} 
                                sectionData={data} 
                                semesterFilter={semesterFilter}
                                showExportPanel={isExportPanelOpen}
                                setShowExportPanel={setIsExportPanelOpen}
                            />
                        ) : (
                            <div className="flex-1 overflow-auto relative" ref={containerRef}>
                                <ClassRoomTable 
                                    data={paginatedData} 
                                    programData={programData} 
                                    onEdit={handleEditClassRoom}
                                />
                            </div>
                        )
                    ) : viewMode === 'admitted' && isReportMode ? (
                        <AdmittedReportTable 
                            selectedAdmittedSemesters={selectedAdmittedSemesters}
                            studentCache={studentCache}
                            registrationLookup={registrationLookup}
                            registeredSemesters={registeredSemesters}
                            programMap={programMap}
                            programData={programData}
                            selectedPrograms={selectedPrograms}
                            selectedFaculties={selectedFaculties}
                            setSelectedFaculties={setSelectedFaculties}
                            selectedProgramTypes={selectedProgramTypes}
                            selectedSemesterTypes={selectedSemesterTypes}
                            diuEmployeeData={diuEmployeeData}
                            teacherData={teacherData}
                            onSaveStudent={handleSaveStudent}
                            externalTargetRegSemester={targetRegSemester}
                            onTargetRegSemesterChange={setTargetRegSemester}
                            onUnregClick={setActiveAdmittedList}
                        />
                    ) : viewMode === 'courses' && isReportMode ? (
                        <CourseDistributionReport 
                            data={filteredCourseSummaryData} 
                            programData={programData} 
                            showExportPanel={isExportPanelOpen}
                            setShowExportPanel={setIsExportPanelOpen}
                        />
                    ) : viewMode === 'sections' && isReportMode ? (
                        <SectionDistributionReport
                            data={activeDataForPagination}
                            programData={programData}
                            lowStudentThreshold={lowStudentThreshold}
                            showExportPanel={isExportPanelOpen}
                            setShowExportPanel={setIsExportPanelOpen}
                        />
                    ) : viewMode === 'teachers' && isReportMode ? (
                        <TeacherDistributionReport
                            data={teacherSummaryData}
                            programData={programData}
                            showExportPanel={isExportPanelOpen}
                            setShowExportPanel={setIsExportPanelOpen}
                        />
                    ) : viewMode === 'unassigned' && isReportMode ? (
                        <UnassignedDistributionReport
                            data={activeDataForPagination}
                            programData={programData}
                            showExportPanel={isExportPanelOpen}
                            setShowExportPanel={setIsExportPanelOpen}
                        />
                    ) : viewMode === 'low_student' && isReportMode ? (
                        <LowStudentDistributionReport
                            data={activeDataForPagination}
                            programData={programData}
                            showExportPanel={isExportPanelOpen}
                            setShowExportPanel={setIsExportPanelOpen}
                        />
                    ) : viewMode === 'class_taken' && isReportMode ? (
                        <ClassTakenDistributionReport
                            data={activeDataForPagination}
                            programData={programData}
                            showExportPanel={isExportPanelOpen}
                            setShowExportPanel={setIsExportPanelOpen}
                        />
                    ) : (
                        <div className="flex-1 overflow-auto relative" ref={containerRef}>
                            {(viewMode === 'sections' || viewMode === 'unassigned' || viewMode === 'low_student' || viewMode === 'class_taken') && (
                                <SectionTable 
                                    data={paginatedData} 
                                    isDashboardMode={showStats} 
                                    headerColor={currentHeaderColor}
                                    onRowClick={['sections', 'unassigned', 'low_student', 'class_taken'].includes(viewMode) ? setSelectedSection : undefined}
                                    selectedRow={selectedSection}
                                    isPanelOpen={!!selectedSection && ['sections', 'unassigned', 'low_student', 'class_taken'].includes(viewMode)} 
                                />
                            )}
                            {(viewMode === 'courses' || viewMode === 'missing_data') && (
                                <CourseSummaryTable 
                                    data={paginatedData} 
                                    expandedKeys={expandedKeys} 
                                    toggleRow={toggleRow}
                                    headerColor={currentHeaderColor}
                                    isCompact={showReferenceSheet} 
                                    isMissingDataMode={viewMode === 'missing_data'}
                                    isDetailOpen={!!selectedCourse && viewMode === 'courses'} 
                                    onEdit={viewMode === 'missing_data' ? handleEditReference : undefined}
                                    onRowClick={(viewMode === 'courses' || viewMode === 'missing_data') ? setSelectedCourse : undefined}
                                    options={tableOptions}
                                    filters={{
                                        programs: filterPrograms,
                                        types: filterTypes,
                                        credits: filterCredits,
                                        totalSections: filterTotalSections,
                                        totalCapacity: filterTotalCapacity,
                                        totalStudents: filterTotalStudents,
                                        totalVacancy: filterTotalVacancy,
                                        extraSections: filterExtraSections
                                    }}
                                    onFilterChange={{
                                        setPrograms: setFilterPrograms,
                                        setTypes: setFilterTypes,
                                        setCredits: setFilterCredits,
                                        setTotalSections: setFilterTotalSections,
                                        setTotalCapacity: setFilterTotalCapacity,
                                        setTotalStudents: setFilterTotalStudents,
                                        setTotalVacancy: setFilterTotalVacancy,
                                        setExtraSections: setFilterExtraSections
                                    }}
                                />
                            )}
                            {viewMode === 'teachers' && (
                                <TeacherSummaryTable
                                    data={paginatedData}
                                    expandedKeys={expandedKeys} 
                                    toggleRow={toggleRow}
                                    headerColor={currentHeaderColor}
                                    onRowClick={setSelectedTeacher}
                                />
                            )}
                            {viewMode === 'admitted' && !isReportMode && (
                                <table 
                                    className="w-full text-left border-collapse"
                                    onMouseLeave={() => {
                                        setHoveredAdmittedCol(null);
                                        setHoveredAdmittedRow(null);
                                    }}
                                >
                                    <thead className={`${currentHeaderColor} sticky top-0 z-10 shadow-sm border-b border-gray-200`}>
                                        <tr>
                                            {admittedColumns.map((col, idx) => {
                                                return (
                                                    <th 
                                                        key={idx} 
                                                        className={`px-2 py-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-white ${col === 'SL' ? 'w-1' : ''} ${visibleRegisteredSemesters.includes(col) ? 'text-center' : 'text-left'}`}
                                                        onMouseEnter={() => setHoveredAdmittedCol(idx)}
                                                    >
                                                        {col}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedData.map((row: any, idx: number) => {
                                            const cleanId = normalizeId(row['Student ID']); 
                                            const studentSemesters = registrationLookup.get(cleanId);
                                            const currentRowIdx = idx;

                                            return (
                                                <tr 
                                                    key={idx} 
                                                    className="transition-colors text-[11px] text-gray-700 leading-none h-[29px]"
                                                    onMouseEnter={() => setHoveredAdmittedRow(currentRowIdx)}
                                                >
                                                    <td 
                                                        className={`px-2 py-1 border-r border-transparent align-middle w-1 text-center font-bold text-gray-500 ${getCellClass(0, currentRowIdx)}`}
                                                        onMouseEnter={() => setHoveredAdmittedCol(0)}
                                                    >
                                                        {row.SL}
                                                    </td>
                                                    <td 
                                                        className={`px-2 py-1 text-left font-bold text-gray-500 border-r border-transparent align-middle whitespace-nowrap ${getCellClass(1, currentRowIdx)}`}
                                                        onMouseEnter={() => setHoveredAdmittedCol(1)}
                                                    >
                                                        {(() => {
                                                            const pid = row.PID;
                                                            const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                            const shortName = programMap.get(normalize(pid));
                                                            return shortName ? `${pid} ${shortName}` : pid;
                                                        })()}
                                                    </td>
                                                    <td 
                                                        className={`px-2 py-1 font-bold text-blue-600 border-r border-transparent align-middle ${getCellClass(2, currentRowIdx)}`}
                                                        onMouseEnter={() => setHoveredAdmittedCol(2)}
                                                    >
                                                        {row['Student ID']}
                                                    </td>
                                                    <td 
                                                        className={`px-2 py-1 border-r border-transparent align-middle ${getCellClass(3, currentRowIdx)}`}
                                                        onMouseEnter={() => setHoveredAdmittedCol(3)}
                                                    >
                                                        {row['Student Name']}
                                                    </td>
                                                    
                                                    {visibleRegisteredSemesters.map((sem, sIdx) => {
                                                        const colIdx = 4 + sIdx;
                                                        const filterType = registrationFilters.get(sem);
                                                        const normalizedSem = normalizeSemesterString(sem);
                                                        
                                                        let cellBgClass = getCellClass(colIdx, currentRowIdx);
                                                        if (!cellBgClass) {
                                                            if (filterType === 'registered') cellBgClass = 'bg-green-50/50';
                                                            else if (filterType === 'unregistered') cellBgClass = 'bg-red-50/50';
                                                        }

                                                        return (
                                                            <td 
                                                                key={sem} 
                                                                className={`px-2 py-1 text-center border-r border-transparent align-middle ${cellBgClass}`}
                                                                onMouseEnter={() => setHoveredAdmittedCol(colIdx)}
                                                            >
                                                                {studentSemesters?.has(normalizedSem) ? (
                                                                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mx-auto" />
                                                                ) : (
                                                                    <XCircle className={`w-3 h-3 mx-auto ${filterType === 'unregistered' ? 'text-red-500' : 'text-red-200'}`} />
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                        {paginatedData.length === 0 && (
                                            <tr>
                                                <td colSpan={admittedColumns.length} className="px-4 py-8 text-center text-gray-400 italic">
                                                    No student data found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeDataForPagination.length === 0 && loading.status === 'success' && viewMode !== 'admitted' && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <p className="text-xs">No records found matching filters.</p>
                                    <button onClick={handleClearAllFilters} className="mt-2 text-blue-500 text-xs hover:underline">Clear Filters</button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            
            {!showSourceSheet && (!isReportMode || (viewMode === 'classroom' && !isReportMode)) && (
                 <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[30px]">
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                            <span className="text-gray-400">Rows:</span>
                            <span className="font-bold text-gray-700">{rowsPerPage}</span>
                            <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded ml-1">AUTO</span>
                        </div>
                        <span className="h-3 w-px bg-gray-300 mx-2"></span>
                        <span>
                            {activeDataForPagination.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                            {Math.min(currentPage * rowsPerPage, activeDataForPagination.length)} of {activeDataForPagination.length}
                        </span>

                        {viewMode === 'admitted' && totalRegColPages > 1 && (
                            <>
                                <span className="h-3 w-px bg-gray-300 mx-2"></span>
                                <div className="flex items-center space-x-1 bg-white rounded border border-gray-200 px-1 py-0.5 shadow-sm">
                                    <button 
                                        onClick={() => setRegColPage(p => Math.max(0, p - 1))}
                                        disabled={regColPage === 0}
                                        className="p-0.5 rounded hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                        title="Previous Columns"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[9px] font-medium text-gray-600 w-12 text-center">
                                        Cols {regColPage + 1}/{totalRegColPages}
                                    </span>
                                    <button 
                                        onClick={() => setRegColPage(p => Math.min(totalRegColPages - 1, p + 1))}
                                        disabled={regColPage === totalRegColPages - 1}
                                        className="p-0.5 rounded hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                        title="Next Columns"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-1">
                        <button 
                            onClick={() => setCurrentPage(1)} 
                            disabled={currentPage === 1}
                            className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="First Page"
                        >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1}
                            className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        
                        <span className="min-w-[20px] text-center font-bold text-gray-700">
                            {currentPage}
                        </span>
                        
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Next Page"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setCurrentPage(totalPages)} 
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            title="Last Page"
                        >
                            <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {!showSourceSheet && (
            <>
                {showReferenceSheet && (
                    <div className="hidden md:block w-1/2 h-full border-l border-gray-200 bg-slate-50 relative shrink-0">
                        <button 
                            onClick={() => setShowReferenceSheet(false)}
                            className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow hover:bg-gray-100 text-gray-500 transition-colors"
                            title="Close Reference Sheet"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <iframe 
                            src={`https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/edit?gid=${REF_SHEET_GID}&rm=minimal`}
                            className="w-full h-full border-none"
                            title="Reference Data"
                        />
                    </div>
                )}

                {!showReferenceSheet && selectedSection && ['sections', 'unassigned', 'low_student', 'class_taken'].includes(viewMode) && (
                     <SectionDetailsPanel 
                         section={selectedSection} 
                         programData={programData}
                         employeeData={diuEmployeeData}
                         onClose={() => setSelectedSection(null)} 
                     />
                )}

                {!showReferenceSheet && selectedCourse && (viewMode === 'courses' || viewMode === 'missing_data') && (
                    <CourseDetailsPanel
                        course={selectedCourse}
                        programData={programData}
                        onClose={() => setSelectedCourse(null)}
                    />
                )}

                {!showReferenceSheet && selectedTeacher && viewMode === 'teachers' && (
                    <TeacherDetailsPanel
                        teacher={selectedTeacher}
                        employeeData={diuEmployeeData}
                        onClose={() => setSelectedTeacher(null)}
                    />
                )}
            </>
        )}
      </div>

      <div className="md:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end space-y-3 pointer-events-none">
          {isFabOpen && (
              <div className="flex flex-col items-end space-y-3 pb-2 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-200">
                  
                  <button 
                      onClick={() => { setIsFilterPanelOpen(true); setIsFabOpen(false); }}
                      className="flex items-center h-10 px-4 bg-white text-gray-700 shadow-lg rounded-full border border-blue-100 font-bold text-xs active:scale-95 transition-transform"
                  >
                      <span className="mr-2">Filter</span>
                      <div className="relative">
                          <Filter className="w-4 h-4 text-blue-600" />
                          {activeFilterCount > 0 && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full border border-white">
                                  {activeFilterCount}
                              </span>
                          )}
                      </div>
                  </button>

                  <button 
                      onClick={() => { setShowSourceSheet(!showSourceSheet); setIsFabOpen(false); }}
                      className="flex items-center h-10 px-4 bg-white text-gray-700 shadow-lg rounded-full border border-blue-100 font-bold text-xs active:scale-95 transition-transform"
                  >
                      <span className="mr-2">{showSourceSheet ? 'Hide Data' : 'Show Data'}</span>
                      <Database className="w-4 h-4 text-purple-600" />
                  </button>

                  <a 
                      href="http://empapp.daffodilvarsity.edu.bd/diu-spm/home" 
                      target="_blank" 
                      rel="noreferrer"
                      onClick={() => setIsFabOpen(false)}
                      className="flex items-center h-10 px-4 bg-white text-gray-700 shadow-lg rounded-full border border-blue-100 font-bold text-xs active:scale-95 transition-transform"
                  >
                      <span className="mr-2">SPM Portal</span>
                      <ExternalLink className="w-4 h-4 text-orange-500" />
                  </a>

                  <button 
                      onClick={() => { handleRefresh(); setIsFabOpen(false); }}
                      disabled={loading.status === 'loading'}
                      className="flex items-center h-10 px-4 bg-white text-gray-700 shadow-lg rounded-full border border-blue-100 font-bold text-xs active:scale-95 transition-transform disabled:opacity-70"
                  >
                      <span className="mr-2">Refresh</span>
                      <RefreshCw className={`w-4 h-4 text-green-600 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
                  </button>
              </div>
          )}

          <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300 pointer-events-auto ${isFabOpen ? 'bg-gray-800 rotate-90' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
              {isFabOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
      </div>

      <EditEntryModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode={editMode}
          title="Edit Room"
          sheetName={SHEET_NAMES.CLASSROOM}
          columns={[
              'PID',
              'Building',
              'Floor',
              'Room',
              'Room Type',
              'Capacity',
              'Slot Duration',
              'Slot Per Room',
              'Shared Program'
          ]}
          initialData={editingRow}
          keyColumn="Room" 
          spreadsheetId={REF_SHEET_ID} 
          onSuccess={handleClassRoomModalSuccess}
      />

      <EditEntryModal
          isOpen={isReferenceEditModalOpen}
          onClose={() => setIsReferenceEditModalOpen(false)}
          mode={referenceEditMode}
          title={referenceEditMode === 'add' ? 'Add Reference Data' : 'Edit Reference Data'}
          sheetName={SHEET_NAMES.REFERENCE}
          columns={[
              'Ref',
              'Program', 
              'Credit', 
              'Type', 
              'Course Type', 
              'Section Capacity', 
              'Weekly Class' 
          ]}
          hiddenFields={['Program', 'Credit', 'Type']} 
          fieldOptions={referenceFieldOptions} 
          transformData={(d) => d} 
          initialData={referenceEditingRow}
          keyColumn="Ref"
          spreadsheetId={REF_SHEET_ID} 
          onSuccess={handleReferenceModalSuccess}
      />

      {/* MODAL: Admitted Student Semester Analysis */}
      <AdmittedReportModal 
          isOpen={isAdmittedReportModalOpen}
          onClose={() => setIsAdmittedReportModalOpen(false)}
          selectedAdmittedSemesters={selectedAdmittedSemesters}
          studentCache={studentCache}
          registrationLookup={registrationLookup}
          registeredSemesters={registeredSemesters}
          programMap={programMap}
      />

      {/* Modal for student list from analytics clicks */}
      {activeAdmittedList && (
          <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <UnregisteredStudentsModal 
                  isOpen={true}
                  onClose={() => setActiveAdmittedList(null)}
                  semester={activeAdmittedList.semester}
                  programId={activeAdmittedList.programId}
                  programName={activeAdmittedList.programName}
                  targetSemester={activeAdmittedList.targetSemester}
                  students={activeAdmittedList.students}
                  registrationLookup={registrationLookup}
                  programMap={programMap}
                  listType={activeAdmittedList.listType as any}
                  isInline={false}
              />
          </div>
      )}

    </div>
  );
};
